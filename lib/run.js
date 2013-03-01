var debug = require('debug')('sauce-runner');
var Q = require('q');
var sauce = require('sauce-lab');
var browsers = require('test-platforms');

var code = require('uglify-js').minify(require('path').join(__dirname, 'browser.js')).code;


function client(user, key) {

  //calls intermediateCB with:
  //  {sessionID: sauceLabsSessionID, passed: true|false, report: object, version: browser.version};
  //returns:
  //  {passed: true|false, report: object, failedVersion: string, passedVersion: string, sessionID: sauceLabsSessionID}
  return function test(browserName, url, name, tags, intermediateCB) {
    intermediateCB = intermediateCB || function () {};
    var versions = browsers[browserName];
    var first = {};
    var result = Q.resolve(first);
    browsers[browserName].forEach(function (browser) {
      debug('queueing ' + browser);
      result = result
        .then(function (res) {
          if (res === first || (res && res.passed === true)) {
            debug('running ' + browser);
            if (res && res.version !== browser.version) {
              intermediateCB(res);
            }
            var config = {user: user, key: key, browser: browser, url: url, name: name, tags: tags};
            config.code = code;

            var start = null;
            var completedTests = -1;
            var warned = false;
            config.parse = function (res, id) {
              if (start == null) {
                start = new Date();
              } else {
                if (completedTests != res.c && typeof res.c === 'number') {
                  completedTests = res.c;
                  start = new Date();
                  warned = false;
                } else if (!res.f && start.getTime() + 1000 * 60 < Date.now()) {
                  if (warned) {
                    return {
                      sessionID: id,
                      passed: false,
                      report: { type: 'OperationTimeout' },
                      version: browser.version};
                  } else {
                    warned = true;
                  }
                }
              }
              debug('res %s: %j', browser, res);
              if (!res.f) return null;//not finished yet
              return {
                sessionID: id,
                passed: res.p,
                report: typeof res.r === 'object' ? res.r : null,
                version: browser.version};
            };
            return sauce(config);
          } else {
            return res;
          }
        });
    });
    return result
      .then(function (res) {
        intermediateCB(res);
        if (res.passed === true) {
          return {passed: true, report: res.report, sessionID: res.sessionID};
        } else {
          var failedVersion = res.version;
          var passedVersion;
          var stop = false;
          browsers[browserName]
            .forEach(function (browser) {
              if (!stop && browser.version !== failedVersion) {
                passedVersion = browser.version;
              } else {
                stop = true;
              }
            });
          return {
            passed: false,
            report: res.report,
            failedVersion: failedVersion,
            passedVersion: passedVersion,
            sessionID: res.sessionID
          };
        }
      });
  }
}