var zmq = require('zmq'),
    log = busybee.logger,
    async = require('async'),
    Rep;

/**
 * @constructor
 *
 * @param {String} address - The address to bind to.
 * @param {Function} reqHandler - Handles incoming requests.
 * @param {Object} [opts] - Any additional options.  Currently only 'parser' and 'stringifier' are supported.
 */
Rep = module.exports = function (address, reqHandler, opts) {
  this.init(address, reqHandler, opts);
}

Rep.prototype.init = function (port, reqHandler, opts) {
  var socket = zmq.socket('rep');
  log.info('Rep Binding to:' + port);

  socket.bind(port, function(err) {
    if (err) return reqHandler(err, null);
    console.log('bound!');

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
  });
}