var async = require("async");
var config = require("./config");
const MongoClient = require("mongodb").MongoClient;

var localhost = "127.0.0.1"; //Can access mongo as localhost from a sidecar

var getDb = function (host, done) {
  //If they called without host like getDb(function(err, db) { ... });
  if (arguments.length === 1) {
    if (typeof arguments[0] === "function") {
      done = arguments[0];
      host = localhost;
    } else {
      throw new Error(
        "getDb illegal invocation. User either getDb('options', function(err, db) { ... }) OR getDb(function(err, db) { ... })"
      );
    }
  }

  var mongoOptions = {};
  host = host || localhost;

  if (config.mongoSSLEnabled) {
    mongoOptions = {
      ssl: config.mongoSSLEnabled,
      tlsAllowInvalidCertificates: config.mongoSSLAllowInvalidCertificates,
      tlsAllowInvalidHostnames: config.mongoSSLAllowInvalidHostnames,
      sslCA: config.mongoSSLCaCert,
      sslCert: config.mongoSSLCert,
      sslKey: config.mongoSSLKey,
    };
  }

  const user = encodeURIComponent(config.username);
  const password = encodeURIComponent(config.password);
  const authMechanism = "SCRAM-SHA-256";
  let url = `mongodb://${host}:27017/?authMechanism=${authMechanism}&ssl=${config.mongoSSLEnabled}`;
  if (user) {
     url = `mongodb://${user}:${password}@${host}:27017/?authMechanism=${authMechanism}&ssl=${config.mongoSSLEnabled}`;
  }
    // Create a new MongoClient
    const client = new MongoClient(url, mongoOptions);

    // Use connect method to connect to the Server
    client.connect(function (err) {
      if (err) {
        client.close();
        done(err);
      }
      console.log("Connected to server running on the host:" + host);

      let db = client.db(config.database);
      return done(null, db, client);
    });
  
};

var replSetGetConfig = function (db, done) {
  db.admin().command({ replSetGetConfig: 1 }, {}, function (err, results) {
    if (err) {
      return done(err);
    }

    return done(null, results.config);
  });
};

var replSetGetStatus = function (db, done) {
  db.admin().command({ replSetGetStatus: {} }, {}, function (err, results) {
    if (err) {
      console.log("got an error while fetching replicaset status")
      return done(err);
    }

    return done(null, results);
  });
};

var initReplSet = function (db, hostIpAndPort, done) {
  console.log("initReplSet", hostIpAndPort);

  db.admin().command({ replSetInitiate: {} }, {}, function (err) {
    if (err) {
      return done(err);
    }

    //We need to hack in the fix where the host is set to the hostname which isn't reachable from other hosts
    replSetGetConfig(db, function (err, rsConfig) {
      if (err) {
        return done(err);
      }

      console.log("initial rsConfig is", rsConfig);
      rsConfig.configsvr = config.isConfigRS;
      rsConfig.members[0].host = hostIpAndPort;
      async.retry(
        { times: 20, interval: 500 },
        function (callback) {
          replSetReconfig(db, rsConfig, false, callback);
        },
        function (err, results) {
          if (err) {
            return done(err);
          }

          return done();
        }
      );
    });
  });
};

var replSetReconfig = function (db, rsConfig, force, done) {
  console.log("replSetReconfig", rsConfig);

  rsConfig.version++;

  db.admin().command(
    { replSetReconfig: rsConfig, force: force },
    {},
    function (err) {
      if (err) {
        return done(err);
      }

      return done();
    }
  );
};

var addNewReplSetMembers = function (
  db,
  addrToAdd,
  addrToRemove,
  shouldForce,
  done
) {
  replSetGetConfig(db, function (err, rsConfig) {
    if (err) {
      return done(err);
    }
    removeDeadMembers(rsConfig, addrToRemove);
    console.log("🚀 ~ file: mongo.js:152 ~ shouldForce:", shouldForce);
    if (!!shouldForce) {
      addNewMembers(rsConfig, addrToAdd);
      replSetReconfig(db, rsConfig, shouldForce, done);
    } else {
      addNewMembers(rsConfig, addrToAdd, {
        shouldApplyReplicaSetReconfig: true,
        db,
        shouldForce,
        done,
      });
    }
  });
};

var addNewMembers = function (rsConfig, addrsToAdd, options) {
  if (!addrsToAdd || !addrsToAdd.length) return;

  var memberIds = [];
  var newMemberId = 0;

  // Build a list of existing rs member IDs
  for (var i in rsConfig.members) {
    memberIds.push(rsConfig.members[i]._id);
  }

  for (var i in addrsToAdd) {
    var addrToAdd = addrsToAdd[i];

    // Search for the next available member ID (max 255)
    for (var i = newMemberId; i <= 255; i++) {
      if (!memberIds.includes(i)) {
        newMemberId = i;
        memberIds.push(newMemberId);
        break;
      }
    }

    // Somehow we can get a race condition where the member config has been updated since we created the list of
    // addresses to add (addrsToAdd) ... so do another loop to make sure we're not adding duplicates
    var exists = false;
    for (var j in rsConfig.members) {
      var member = rsConfig.members[j];
      if (member.host === addrToAdd) {
        console.log(
          "Host [%s] already exists in the Replicaset. Not adding...",
          addrToAdd
        );
        exists = true;
        break;
      }
    }

    if (exists) {
      continue;
    }

    var cfg = {
      _id: newMemberId,
      host: addrToAdd,
    };

    rsConfig.members.push(cfg);
    if (!!options) {
      replSetReconfig(
        options?.db,
        rsConfig,
        options?.shouldForce,
        options.done
      );
    }
  }
};

var removeDeadMembers = function (rsConfig, addrsToRemove) {
  if (!addrsToRemove || !addrsToRemove.length) return;

  for (var i in addrsToRemove) {
    var addrToRemove = addrsToRemove[i];
    for (var j in rsConfig.members) {
      var member = rsConfig.members[j];
      if (member.host === addrToRemove) {
        rsConfig.members.splice(j, 1);
        break;
      }
    }
  }
};

var isInReplSet = function (ip, done) {
  console.log("isInReplSet: getting db using host:", ip)
  getDb(ip, function (err, db, client) {
    if (err) {
      return done(err);
    }

    replSetGetConfig(db, function (err, rsConfig) {
      console.log("isInReplSet.replSetGetConfig: closing connection to host:", ip)
      client.close();
      if (!err && rsConfig) {
        done(null, true);
      } else {
        done(null, false);
      }
    });
  });
};

module.exports = {
  getDb: getDb,
  replSetGetStatus: replSetGetStatus,
  initReplSet: initReplSet,
  addNewReplSetMembers: addNewReplSetMembers,
  isInReplSet: isInReplSet,
};
