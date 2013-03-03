var debug = require('debug')('sauce-runner');
var Q = require('q');
var sauce = require('sauce-lab');
var allBrowsers = require('test-platforms');

var code = require('uglify-js').minify(require('path').join(__dirname, 'browser.js')).code;

//config:
//  {browser: string, version: string, url: string, name: string, tags: array, sauce: function}
//
//config.sauce:
//  function (fn(user, key));
//
//  Calls fn with a sauce labs user and key and guarantees that there will be at least one slot to
//  run tests for that user and key until fn completes.
//
//  returns a promise for the result of fn
//
//returns promise for:
//  { sauceUser: string, sauceKey: string, sauceTestID: string, passed: bool, report: object}


module.exports = run;
function run(config) {

  var browserName = config.browser;
  var version = config.version;

  var browsers = allBrowsers[browserName]
    .filter(function (browser) {
      return browser.version === version;
    });


  var url = config.url;
  var name = config.name;
  var tags = config.tags;

  if (browsers.length === 0) {
    return Q.reject(new Error('There are no browsers called ' + JSON.stringify(browserName) +
                              ' at version ' + JSON.stringify(version)));
  }

  return config.sauce(function (user, key) {
    var first = {};
    var result = Q.resolve(first);
    browsers.forEach(function (browser) {
      debug('queueing ' + browser);
      result = result
        .then(function (res) {
          if (res === first || (res && res.passed === true)) {
            debug('running ' + browser);

            var config = {user: user, key: key, browser: browser, url: url, name: name, tags: tags};
            config.code = code;

            var start = null;
            var completedTests = -1;
            var warned = false;
            config.parse = function (res, id) {
              if (start == null) {
                start = new Date();
              } else if (!res.f) {
                if (completedTests != res.c && typeof res.c === 'number') {
                  completedTests = res.c;
                  start = new Date();
                  warned = false;
                } else if (!res.f && start.getTime() + 1000 * 60 < Date.now()) {
                  if (warned) {
                    res = { f: true, p: false, r: { type: 'timeout' } };
                  } else {
                    warned = true;
                  }
                }
              }
              debug('res %s: %j', browser, res);
              if (!res.f) return null;//not finished yet
              return {
                sauceUser: user,
                sauceKey: key,
                sauceTestID: id,
                passed: res.p,
                report: res.r || null
              };
            };
            return sauce(config);
          } else {
            return res;
          }
        });
    });
    return result; //{passed, report, sauceTestID}
  });
}