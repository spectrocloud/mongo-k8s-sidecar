const MongoClient = require("mongodb").MongoClient;
const fs = require("fs");
// const assert = require("assert");

const user = encodeURIComponent("root");
const password = encodeURIComponent("cHMuXkUQpT5s");
const authMechanism = "SCRAM-SHA-256";

function readfile(path) {
  try {
    return fs.readFileSync(path, "utf8");
  } catch (e) {
    console.error("Error while reading the file", e);
  }
}

var getSSLKEY = function () {
  var path = `/Users/deepanpatel/Downloads/mongo.key`;
  return readfile(path);
};

var getSSLCERT = function () {
  var path = `/Users/deepanpatel/Downloads/mongo.crt`;
  return readfile(path);
};

var getSSLCACERT = function () {
  var path = `/Users/deepanpatel/Downloads/mongoca.crt`;
  return readfile(path);
};

// Connection URL
const url = `mongodb://${user}:${password}@localhost:27017/?authMechanism=${authMechanism}&ssl=true`;
const mongoOptions = {
  ssl: true,
  tlsAllowInvalidCertificates: true,
  tlsAllowInvalidHostnames: true,
  sslCA: getSSLCACERT(),
  sslCert: getSSLCERT(),
  sslKey: getSSLKEY(),
};

// Create a new MongoClient
const client = new MongoClient(url, mongoOptions);

// Use connect method to connect to the Server
client.connect(function (err) {
  if (err) {
    console.error("!!!!!error here", err);
  }
  console.log("Connected correctly to server");

  const db = client.db("hubbleDB");

  createCapped(db, function () {
    client.close();
  });
});

function createCapped(db, callback) {
  db.createCollection(
    "myCollection",
    { capped: true, size: 100000, max: 5000 },
    function (err, results) {
      if (err) console.error("111111 issue in collection creation", err);
      console.log("Collection created.");
      callback();
    }
  );
}
