var join = require('path').join;
var dirname = require('path').dirname;
var fs = require('fs');
var mkdirp = require('mkdirp');

module.exports = function (directory) {
  var res = {};
  res.get = function (path, cb) {
    fs.readFile(join(directory, path), function (err, res) {
      if (err && err.code === 'ENOENT') return cb(null, null);
      if (err) return cb(err);
      return cb(null, res.toString());
    });
  };
  res.put = function (path, content, cb) {
    mkdirp(dirname(join(directory, path)), function (err) {
      if (err) return cb(err);
      fs.writeFile(join(directory, path), content, cb);
    });
  };
  return res;
};