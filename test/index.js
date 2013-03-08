require('mocha-as-promised')();
var Q = require('q');
var run = require('../');

var sauceUser = 'fake-sauce-user';
var sauceKey = 'fake-sauce-key';

describe('run(config, progress)', function () {
  beforeEach(function () {
    var fs = {};
    var sauceTestID = 'fake-sauce-test-id';
    run.runSauce = sinon.stub();
    run.downloadTestResults = sinon.stub();
    run.downloadTestResults.withArgs(sauceUser, sauceKey, sauceTestID, sinon.match.string, fs)
      .returns(Q(null));
    run.downloadTestResults.throws();
  });

  // run.downloadTestResults.calledWith(sauceUser, sauceKey, sauceTestID, sinon.match.string, fs);
})

//return exports.downloadTestResults(result.sauceUser, result.sauceKey, result.sauceTestID, browserDir + '/' + version, fs);