var zmq = require('zmq'),
    log = busybee.logger,
    _ = require('lodash'),
    Broker;

/**
 * @constructor
 *
 * @param {String} frontendAddress - The address to recieve requests on.
 * @param {String} backendAddress - The address of workers to deal requests to.
 */
Broker = module.exports = function (frontendAddress, backendAddress) {
  this.init(frontendAddress, backendAddress);
}

Broker.prototype.init = function (frontEnd, backEnd) {
  var frontend = zmq.socket('router'),
      backend  = zmq.socket('dealer');
  
  log.info('Broker connecting to frontend: ' + frontEnd);
  log.info('Broker connecting to backend: ' + backEnd);
  
  frontend.bindSync(frontEnd);
  backend.bindSync(backEnd);

  frontend.on('message', function() {
    // Note that separate message parts come as function arguments.
    var args = Array.apply(null, arguments);
    // Pass array of strings/buffers to send multipart messages.
    backend.send(args);
  });

  backend.on('message', function() {
    var args = Array.apply(null, arguments);
    frontend.send(args);
  });
}