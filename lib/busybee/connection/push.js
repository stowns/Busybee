var zmq = require('zmq'),
    _ = require('lodash'),
    log = busybee.logger,
    Push;


Push = module.exports = function (address, cb, opts) {
  var socket = zmq.socket('push')
      _this = this;

  socket.bind(address, function(err) {
    if (err) cb(err, null);
    
    log.info('Push Connection Binding to: ' + address);
    
    _this.socket = socket;

    return cb(null, _this);
  });
}

Push.prototype.send = function (data) {
  this.socket.send(JSON.stringify(data));
}