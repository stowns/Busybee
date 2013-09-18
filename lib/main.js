/**
 * Busybee module loader
 *
 * applies module files/directories in ./busybee to exports. It assumes that
 * everything in ./busybee, whether file or dir, is a module to be applied
 * to exports.
 *
 * @module busybee
 */

var _       = require('lodash'),
    fs      = require('fs'),
    BusyBee;

/**
 * @const {String[]} NO_INIT_MODULES
 *
 * These modules do not require busybee.init to
 * have been called prior to their reference
 */
const NO_INIT_MODULES = ['cluster'];

/**
 * Discovers modules in lib/busybee and applies getters
 * to this object on their behalf
 *
 * For example:
 * busybee/broker.js -> 'busybee.broker'
 *
 * @constructor
 */
function BusyBee() {

  var busybee = this;

  fs.readdirSync(__dirname + '/busybee').forEach(function (filename) {

    var module = filename.replace(/\.js$/, '');
    // A getter is used here because we only want to initialize
    // a module on first inclusion. Thus if a module is never used
    // in an application, it is never intialized
    Object.defineProperty(busybee, module, {
      get: function () {
        if (busybee.ready || _.contains(NO_INIT_MODULES, module)) {
          return require('./busybee/' + module);
        } else {
          throw new Error('BusyBee must be initialized before any modules are run.');
        }
      }
    });

  });

  return _.bindAll(this);

};

/** @property {Boolean} ready Is busybee initialized? */
BusyBee.prototype.ready = false;

/**
 * sets up some application defaults and loads config module straight away
 *
 * @param {Object} options
 * @param {String} options.name The name of the application. This informs config
 *                              loading and logger behavior.
 * @param {String} options.path Options configuration file path.
 *
 * @return this
 * @throws {Error} if options.name is not present
 */
BusyBee.prototype.init = function (options) {

  if (this.ready) return this;

  if (!(options && options.name)) {
    throw new Error('BusyBee module was initialized without an app name specified');
  }

  global.busybee = this; // :(

  this.ready = true;

  this.connection;
  this.conf.init(options);
  this.logger.init(this.conf);
  this.locator.init(this.conf);

  return this;
};

module.exports = new BusyBee();
