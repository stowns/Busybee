var fs = require('fs');

fs.readdirSync(__dirname).forEach(function (filename) {
  var mod = filename.replace(/\.js$/, '');
  if (mod === 'index') return;
  
  Object.defineProperty(module.exports, mod, {
    get: function () {
      return require('./' + filename);
    }
  });
});