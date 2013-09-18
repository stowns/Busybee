var cluster    = require('cluster'),
    _          = require('lodash'),
    path = require('path'),
    Conf;

function Conf() {
  _.bindAll(this);

  return this;
}


/**
 * Retrieves the configuration
 *
 * @param {options} name of app conf to load or specfic path
 * @return this
 */
Conf.prototype.init = _.once(function(options) {
  var configuration;
  var env = + process.env.NODE_ENV || 'development';
  if (options.conf) {
    configuration = require(options.conf + '/' + env);
  } else {
    var mainPath = require.main.filename.split(path.sep);
    mainPath.pop();
    mainPath.unshift('/');
    mainPath = path.join.apply(this, mainPath);
    configuration = require(mainPath + '/conf/' + env);
  }

  if (cluster.isWorker) {
    configuration.name = options.name + '.worker.' + cluster.worker.id;
  }

  // define a property for each key in the loaded conf
  for (var prop in configuration) {
    Object.defineProperty(this, prop, {
      value : configuration[prop]
    });
  }
  
  return this
});

module.exports = new Conf();