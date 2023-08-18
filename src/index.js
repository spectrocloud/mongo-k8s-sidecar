var worker = require("./lib/worker");
var sleep = require("system-sleep");
var crypto = require("crypto");
const config = require("./lib/config");

try {
  console.log("Fips mode set to: ", config.enableFips);
  crypto.setFips(config.enableFips);
} catch (err) {
  console.log("Fips module not available on this machine", err);
}

console.log(
  "Starting up mongo-k8s-sidecar, waiting 15 seconds for Mongodb to start"
);
sleep(15 * 1000);

worker.init(function (err) {
  if (err) {
    console.error("Error trying to initialize mongo-k8s-sidecar", err);
    return;
  }

  worker.workloop();
});
