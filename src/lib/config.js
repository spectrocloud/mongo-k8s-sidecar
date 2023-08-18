var dns = require("dns");
var fs = require("fs");

var getMongoPodLabels = function () {
  return process.env.MONGO_SIDECAR_POD_LABELS || false;
};

var getMongoPodLabelCollection = function () {
  var podLabels = getMongoPodLabels();
  if (!podLabels) {
    return false;
  }
  var labels = process.env.MONGO_SIDECAR_POD_LABELS.split(",");
  for (var i in labels) {
    var keyAndValue = labels[i].split("=");
    labels[i] = {
      key: keyAndValue[0],
      value: keyAndValue[1],
    };
  }

  return labels;
};

var getk8sROServiceAddress = function () {
  return (
    process.env.KUBERNETES_SERVICE_HOST +
    ":" +
    process.env.KUBERNETES_SERVICE_PORT
  );
};

/**
 * @returns k8sClusterDomain should the name of the kubernetes domain where the cluster is running.
 * Can be convigured via the environmental variable 'KUBERNETES_CLUSTER_DOMAIN'.
 */
var getK8sClusterDomain = function () {
  var domain = process.env.KUBERNETES_CLUSTER_DOMAIN || "cluster.local";
  verifyCorrectnessOfDomain(domain);
  return domain;
};

/**
 * Calls a reverse DNS lookup to ensure that the given custom domain name matches the actual one.
 * Raises a console warning if that is not the case.
 * @param clusterDomain the domain to verify.
 */
var verifyCorrectnessOfDomain = function (clusterDomain) {
  if (!clusterDomain) {
    return;
  }

  var servers = dns.getServers();
  if (!servers || !servers.length) {
    console.log(
      "dns.getServers() didn't return any results when verifying the cluster domain '%s'.",
      clusterDomain
    );
    return;
  }

  // In the case that we can resolve the DNS servers, we get the first and try to retrieve its host.
  dns.reverse(servers[0], function (err, host) {
    if (err) {
      console.warn(
        "Error occurred trying to verify the cluster domain '%s'",
        clusterDomain
      );
    } else if (host.length < 1 || !host[0].endsWith(clusterDomain)) {
      console.warn(
        "Possibly wrong cluster domain name! Detected '%s' but expected similar to '%s'",
        clusterDomain,
        host
      );
    } else {
      console.log(
        "The cluster domain '%s' was successfully verified.",
        clusterDomain
      );
    }
  });
};

/**
 * @returns k8sMongoServiceName should be the name of the (headless) k8s service operating the mongo pods.
 */
var getK8sMongoServiceName = function () {
  return process.env.KUBERNETES_MONGO_SERVICE_NAME || false;
};

/**
 * @returns mongoPort this is the port on which the mongo instances run. Default is 27017.
 */
var getMongoDbPort = function () {
  var mongoPort = process.env.MONGO_PORT || 27017;
  console.log("Using mongo port: %s", mongoPort);
  return mongoPort;
};

function readfile(path) {
  try {
    return fs.readFileSync(path, "utf8");
  } catch (e) {
    console.error("Error while reading the file", e);
  }
}

var getSSLKEY = function () {
  var path = process.env.MONGO_SSL_KEY;
  return readfile(path);
};

var getSSLCERT = function () {
  var path = process.env.MONGO_SSL_CERT;
  return readfile(path);
};

var getSSLCACERT = function () {
  var path = process.env.MONGO_SSL_CACERT;
  return readfile(path);
};

/**
 *  @returns boolean to define the RS as a configsvr or not. Default is false
 */
var isConfigRS = function () {
  var configSvr = (process.env.CONFIG_SVR || "").trim().toLowerCase();
  var configSvrBool = /^(?:y|yes|true|1)$/i.test(configSvr);
  if (configSvrBool) {
    console.log("ReplicaSet is configured as a configsvr");
  }

  return configSvrBool;
};

/**
 * @returns boolean
 */
var stringToBool = function (boolStr) {
  var isTrue = boolStr === "true" || false;

  return isTrue;
};

module.exports = {
  enableFips: stringToBool(process.env.ENABLE_FIPS) || false,
  namespace: process.env.KUBE_NAMESPACE,
  username: process.env.MONGODB_USERNAME,
  password: process.env.MONGODB_PASSWORD,
  database: process.env.MONGODB_DATABASE || "local",
  loopSleepSeconds: process.env.MONGO_SIDECAR_SLEEP_SECONDS || 5,
  unhealthySeconds: process.env.MONGO_SIDECAR_UNHEALTHY_SECONDS || 15,
  mongoSSLEnabled: stringToBool(process.env.MONGO_SSL_ENABLED),
  mongoSSLAllowInvalidCertificates: stringToBool(
    process.env.MONGO_SSL_ALLOW_INVALID_CERTIFICATES
  ),
  mongoSSLAllowInvalidHostnames: stringToBool(
    process.env.MONGO_SSL_ALLOW_INVALID_HOSTNAMES
  ),
  mongoSSLCaCert: getSSLCACERT(),
  mongoSSLCert: getSSLCERT(),
  mongoSSLKey: getSSLKEY(),
  env: process.env.NODE_ENV || "local",
  mongoPodLabels: getMongoPodLabels(),
  mongoPodLabelCollection: getMongoPodLabelCollection(),
  k8sROServiceAddress: getk8sROServiceAddress(),
  k8sMongoServiceName: getK8sMongoServiceName(),
  k8sClusterDomain: getK8sClusterDomain(),
  mongoPort: getMongoDbPort(),
  isConfigRS: isConfigRS(),
};
