var zmq = require('zmq'),
    log = busybee.logger,
    async = require('async'),
    Worker;

/**
 * @constructor
 *
 * @param {String} address - The address of the Broker to connect to.
 * @param {Function} reqHandler - Handles the request from the Broker
 * @param {Object} [opts] - Any additional options.  Currently only 'parser' and 'stringifier' are supported.
 */
Worker = module.exports = function (address, reqHandler, opts) {
  this.init(address, reqHandler, opts);
}

Worker.prototype.init = function(address, reqHandler, opts) {
  var socket = zmq.socket('rep');
  log.info('Rep Binding to:' + address);

  socket.connect(address);

  socket.on('message', function(data) {
    // parse the request
    data = (opts && opts.parser instanceof Function)
          ? opts.parser(data)
          : JSON.parse(data);

    // evaluate the reqHandler
    async.waterfall([
      function(cb){
        cb(null, reqHandler(null, data));
      },
      function(output, cb){
        output = (opts && opts.stringifier)
                   ? opts.stringifier(output)
                   : JSON.stringify(output);

        cb(null, output);
      }
    ], function (err, result) {
        socket.send(result);   
    });

  });
}