var join = require('path').join;
var dirname = require('path').dirname;
var Q = require('q');
var fs = require('fs');
var mkdirp = require('mkdirp');
var writeFile = Q.nfbind(fs.writeFile);

module.exports = function (directory) {
  var res = {};
  res.get = function (path, cb) {
    return Q.nfbind(fs.readFile)(join(directory, path))
      .then(null, function (err) {
        if (err.code === 'ENOENT') return null;
        else throw err;
      });
  };
  res.put = function (path, content) {
    return Q.nfbind(mkdirp)(dirname(join(directory, path)))
      .then(function () {
        return writeFile(join(directory, path), content);
      });
  };
  res.putStream = function (path, content) {
    mkdirp.sync(dirname(join(directory, path)));
    var def = Q.defer();
    var output = fs.createWriteStream(join(directory, path));
    content.pipe(output);
    content.on('error', def.reject);
    output.on('error', def.reject);
    output.on('close', def.resolve);
    return def.promise;
  };
  return res;
};