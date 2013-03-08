var Q = require('q');
var getSauceResults = Q.nfbind(require('get-sauce-results'));

module.exports = downloadTestResults;
function downloadTestResults(sauceUser, sauceKey, sauceTestID, directory, fs) {
  return getSauceResults(sauceUser, sauceKey, sauceTestID, function (file, content, cb) {
    fs.putStream(directory + '/' + file, content)
      .then(function () {
        process.nextTick(cb);
      }, function (err) {
        process.nextTick(function () {
          cb(err);
        });
      });
  });
}