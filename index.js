var runner = require('./lib/run');
var conf = require('jepso-ci-config');
var browsers = Object.keys(require('test-platforms'));
var Q = require('q');

var EE = require('events').EventEmitter;

module.exports = createRunner;
function createRunner() {
  var res = new EE();
  res.run = function (jobConfig, working) {
    working = working || function () {};

    var commit = jobConfig.commit;
    var user = commit.user;
    var repo = commit.repo;
    var tag = commit.tag;

    var buildID = jobConfig.buildID;

    var start = jobConfig.buildCreationTime || Date.now();

    var fs = jobConfig.fileSystem;

    var testDir = user + '/' + repo + '/' + buildID;

    res.emit('start', user, repo, buildID, {tag: tag, start: start});

    return Q(conf.loadRemote(user, repo, tag))
      .then(function (config) {
        var testURL = 'http://jepso-ci.com/api/proxy/' + user + '/' + repo + '/' + tag + config.url;
        var testName = buildID + ': ' + user + '/' + repo + '/' + tag;

        return browsers.map(function (browser) {
          var browserDir = testDir + '/' + browser;
          return test(browser, url, testName, [],
            function (version) {
              res.emit('start-browser', user, repo, buildID, {browser: browser, version: version});
              return working();
            },
            function (version, result) { // result  = {passed, report, sauceTestID}
              res.emit('finish-browser', user, repo, buildID, {browser: browser, version: version, passed: result.passed});
              return fs.put(browserDir + '/' + version + '/report.json', JSON.stringify(result.report))
                .then(function () {
                  return downloadTestResults(sauceUser, sauceKey, result.sauceTestID, browserDir + '/' + version, fs);
                })
                .then(function () {
                  return working();
                });
            });
        });
      })
      .all()
      .then(function (browsers) {
        var end = Date.now();
        res.emit('finish', user, repo, buildID, {tag: tag, start: start, end: end});
      })
      .fail(function (err) {
        res.emit('error', err);
      });
  };

  return res;
}

function downloadTestResults(sauceUser, sauceKey, sauceTestID, directory, fs) {

}