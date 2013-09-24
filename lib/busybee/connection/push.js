var zmq = require('zmq'),
    _ = require('lodash'),
    log = busybee.logger,
    events = require('events'),
    Push;


Push = module.exports = function (opts) {
  events.EventEmitter.call(this);
  this.opts = opts;

  return this;
}

Push.prototype.__proto__ = events.EventEmitter.prototype;

Push.prototype.bind = function (address) {
  console.log('bind called');
  var socket = zmq.socket('push'),
      _this = this;

  socket.bind(address, function(err) {
    if (err) return _this.emit('error', err);
    
    log.info('Push Connection Binding to: ' + address);
    
    _this.socket = socket;

    _this.emit('ready', _this);
  });
}

Push.prototype.send = function (payload) {
  payload = (this.opts && this.opts.stringifier)
              ? this.opts.stringifier(payload)
              : JSON.stringify(payload);

  this.socket.send(payload);
}