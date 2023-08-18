var worker = require("./lib/worker");
var sleep = require("system-sleep");
var crypto = require("crypto");
const config = require("./lib/config");

const sleepTime = 15

try {
  console.log("Requested Fips mode is set to: ", config.enableFips);
  crypto.setFips(config.enableFips);
} catch (err) {
  console.log("Fips module not available on this machine", err);
}
console.log("Fips mode actual status isFipsEnabled", crypto.getFips())

console.log("Starting up mongo-k8s-sidecar, waiting %d seconds for Mongodb to start", sleepTime);
sleep(sleepTime * 1000);

worker.init(function (err) {
  if (err) {
    console.error("Error trying to initialize mongo-k8s-sidecar", err);
    return;
  }
 console.log("worker initialized successfully")
  worker.workloop();
});
