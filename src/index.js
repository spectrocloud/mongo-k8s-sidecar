var worker = require("./lib/worker");
var sleep = require("system-sleep");

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
