var runner = require('./lib/run');
var conf = require('jepso-ci-config');

var EE = require('events').EventEmitter;

module.exports = createRunner;
function createRunner(sauceUser, sauceKey) {
  var res = new EE();
  var test = runner(sauceUser, sauceKey);
  res.run = function (config, working) {
    working = working || function () {};
    var user = config.user;
    var repo = config.repo;
    var tag = config.tag;
    var buildID = config.buildID;
    var browser = config.browser;
    return conf.loadRemote(user, repo, tag)
      .then(function (config) {
        res.emit('begin', buildID, browser);
        return test(browser, 'http://jepso-ci.com/api/proxy/' + user + '/' + repo + '/' + tag + config.url,
            buildID + ': ' + user + '/' + repo + '/' + tag,
            [],
          function (result) { //{sessionID: sauceLabsSessionID, passed: true|false, report: object, version: browser.version}
            res.emit('update', buildID, browser, result.version, {
              testID: result.sauceLabsSessionID, 
              result: result.passed ? 'passed' : 'failed', 
              report: result.report
            });
            working();
          })
      })
      .then(function (result) { //{passed: true|false, failedVersion: string, passedVersion: string}
        var state;
        if (result.passed === true) {
          state = 'passed';
        } else if (result.passedVersion) {
          state = passedVersion + '/' + failedVersion;
        } else {
          state = 'failed';
        }
        res.emit('done', buildID, browser, state);
      })
      .fail(function (err) {
        res.emit('error', err);
      });
  };

  return res;
}

//Emits:
//  'error'
//  'begin' => (buildID, browser)
//  'update' => (buildID, browser, version, {testID, result: 'passed' || 'failed' || 'skipped', report})
//  'done' => (buildID, browser, state = 'passed' || 'failed' || 'passedVersion / failedVersion' || 'skipped')