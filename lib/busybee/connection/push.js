var zmq = require('zmq'),
    _ = require('lodash'),
    log = busybee.logger,
    events = require('events'),
    Push;

/**
 * @constructor
 *
 * @param {Object} [opts] - Any additional options.  Currently only 'stringifier' is supported.
 */
Push = module.exports = function (opts) {
  events.EventEmitter.call(this);
  this.opts = opts;

  return this;
}

Push.prototype.__proto__ = events.EventEmitter.prototype;

/**
 * Binds the connection to a tcp/ipc address
 *
 * @param {String} address - tcp/ipc address to bind to
 */
Push.prototype.bind = function (address) {
  var socket = zmq.socket('push'),
      _this = this;

  socket.bind(address, function(err) {
    if (err) return _this.emit('error', err);
    
    log.info('Push Connection Binding to: ' + address);
    
    _this.socket = socket;

    _this.emit('ready');
  });
}

/**
 * Publishes a message
 *
 * @param {Object} payload - Object to be published
 */
Push.prototype.send = function (payload) {
  payload = (this.opts && this.opts.stringifier)
              ? this.opts.stringifier(payload)
              : JSON.stringify(payload);

  this.socket.send(payload);
}