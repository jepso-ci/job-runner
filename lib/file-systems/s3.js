var Q = require('q');
var join = require('path').join;
var unlink = Q.nfbind(require('fs').unlink);
var createWriteStream = require('fs').createWriteStream;
var mkdirp = require('mkdirp');
var guid = require('guid');
var knox = require('knox');

var cacheDir = join(__dirname, '..', '..', 'cache');
mkdirp.sync(cacheDir);

module.exports = function (config) {
  var client = knox.createClient(config);
  var res = {};
  res.get = function (path, cb) {
    return Q.nfbind(client.getFile.bind(client))(path.replace(/\\/g, '/').replace(/^\/?/, '/'))
      .then(function (res) {
        if (res.statusCode === 404) return null;
        if (res.statusCode !== 200) throw new Error('Server responded with status code: ' + res.statusCode);
        return res.body;
      });
  };
  res.put = function (path, content) {
    return Q.nfbind(client.putBuffer.bind(client))(content, path.replace(/\\/g, '/').replace(/^\/?/, '/'))
      .then(function (res) {
        if (res.statusCode !== 200) throw new Error('Server responded with status code: ' + res.statusCode);
      });
  };
  res.putStream = function (path, content) {
    var def = Q.defer();
    var temp = guid.raw();
    var tempStrm = createWriteStream(join(cacheDir, temp));

    content.on('error', defA.reject);
    tempStrm.on('error', defA.reject);
    tempStrm.on('close', defA.resolve);
    content.pipe(tempStrm);

    function cleanup() {
      return unlink(join(cacheDir, temp));
    }

    return def.promise.then(function () {
      return Q.nfbind(client.putFile.bind(client))(join(cacheDir, temp), path.replace(/\\/g, '/').replace(/^\/?/, '/'))
        .then(function (res) {
          if (res.statusCode !== 200) throw new Error('Server responded with status code: ' + res.statusCode);
        })
        .then(function () {
          return cleanup();
        }, function (err) {
          return cleanup().then(function () {
            throw err;
          }, function () {
            throw err;
          });
        });
    });
  };
  return res;
};