const k8s = require('@kubernetes/client-node');


var getMongoPods = async function getPods(done) {
  const kc = new k8s.KubeConfig();
  try {
  kc.loadFromDefault();
  // kc.loadFromFile("/Users/shubham/Downloads/srec.kubeconfig")
  } catch(err) {
    console.log("unable to load kube config")
    return done(err)
  }
  const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
  await k8sApi.listPodForAllNamespaces("","","","role=mongo").then((value)=> {
    var pods = value.body.items;
    done(null, pods);
  }).catch((err) => {
    console.log("unable to fetch pods")
    done(err)})
};

module.exports = {
  getMongoPods: getMongoPods
};
