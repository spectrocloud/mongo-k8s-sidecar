const async = require("async");

const foo = (done) => done(null, "foo");
const loo = (done) => done(null, "loo", "moo");

async.series([foo, loo], (err, result) => {
  console.log("🚀 ~ file: testAsync.js:8 ~ async.series ~ result:", result);
  console.log("🚀 ~ file: testAsync.js:8 ~ async.series ~ err:", err);
});
