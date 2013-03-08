var conf = require('jepso-ci-config');
var browsers = Object.keys(require('test-platforms'));
var Q = require('q');

exports = module.exports = run;

exports.runSauce = require('sauce-runner');
exports.downloadTestResults = require('./lib/download-test-results');


exports.fs = {};
exports.fs.local = require('./lib/file-systems/local');

function run(jobConfig, emit) {
  emit = emit || function () {};

  var commit = jobConfig.commit;
  var user = commit.user;
  var repo = commit.repo;
  var tag = commit.tag;

  var start = jobConfig.buildCreationTime || Date.now();

  var fs = jobConfig.fileSystem || exports.fs.local(jobConfig.directory);

  var sauce = jobConfig.sauce;

  emit('start', user, repo, {tag: tag, start: start});

  return Q(conf.loadRemote(user, repo, tag))
    .then(function (config) {

      var result = {user: user, repo: repo, tag: tag, start: start};

      var testURL = 'https://proxy.jepso-ci.com/' + user + '/' + repo + '/' + tag + config.url;
      var testName = user + '/' + repo + '/' + tag;

      return Q.all(browsers.map(function (browser) {
        var browserDir = '/' + browser;
        var results = [];
        return exports.runSauce(sauce, {
          browser: browser,
          url: testURL,
          name: testName,
          continueOnFail: config.continueOnFail === true || config.continueOnFailure === true,
          versions: config.versions ? (config.versions[browser] || []) : null,
          skip: (config.skip && config.skip[browser]) || null
        }, {
          startVersion: function (version) {
            return emit('start-browser', user, repo, {browser: browser, version: version});
          },
          endVersion: function (version, result) {
            results.push({version: version, passed: result.passed});
            result.report.passed = result.passed;
            if (result.sauceUser && result.sauceKey && result.sauceTestID) {
              result.report.hasDebug = true;
            } else {
              result.report.hasDebug = false;
            }
            return Q(fs.put(browserDir + '/' + version + '/report.json', JSON.stringify(result.report)))
              .then(function () {
                if (!result.report.hasDebug) return null;
                return exports.downloadTestResults(result.sauceUser, result.sauceKey, result.sauceTestID, browserDir + '/' + version, fs);
              })
              .then(function () {
                return emit('finish-browser', user, repo, {browser: browser, version: version, passed: result.passed});
              })
              .fail(function (err) {
                console.warn(err.stack || err.message || err);
                throw err;
              })
          }
        })
        .thenResolve({browser: browser, results: results});
      }))
      .then(function (browsers) {
        result.end = Date.now();
        result.browsers = {};
        browsers.forEach(function (b) {
          result.browsers[b.browser] = b.results;
        })
        return result;
      });
    })
    .then(function (result) {
      return Q(fs.put('/results.json', JSON.stringify(result)))
        .thenResolve(result);
    })
    .then(function (result) {
      emit('finish', user, repo, {tag: tag, start: start, end: result.end});
    })
    .fail(function (err) {
      emit('error', err);
    });
}

/*
var throttle = require('throat')(1);
run({
  commit: {user: 'jepso-ci-examples', repo: 'string.js', tag: '88e2169b2f47ab07baff54a94b45eb5df2119791'},
  fileSystem: require('path').join(__dirname, 'output', 'string.js'),
  sauce: function (fn) {
    return throttle(function () {
      return fn('component', 'ACCESS-KEY-HERE')
    });
  }
}, function (name, user, repo, data) {
  if (name === 'start-browser') {
    console.warn(user + '/' + repo + ' - ' + data.browser + '@' + data.version);
  }
  if (name === 'finish-browser') {
    console.warn(user + '/' + repo + ' - ' + data.browser + '@' + data.version + ' -> ' + data.passed);
  }
})
*/