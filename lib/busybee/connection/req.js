var zmq = require('zmq'),
    _ = require('lodash'),
    log = busybee.logger,
    Req;

/**
 * @typedef RequestObject
 * @type {object}
 * @property {Object} payload - a javascript object (or other datatype) containing the information you would like to be recieved by another application.
 * @property {string} name - name of the application to send the request to.
 */

/**
 * @constructor
 *
 * @param {RequestObject} myObj request - a request object.
 * @param {Function} resHandler - Handles the response returned from the requested application
 * @param {Object} [opts] - Any additional options.  Currently only 'parser' and 'stringifier' are supported.
 */
Req = module.exports = function (request, resHandler, opts) {
  this.retryQ = [];
  
  this.init(request, resHandler, opts);
}

Req.prototype.init = function(req, resHandler, opts) {
    log.info('initializing Req Connection');

    var _this = this,
        timeoutStatus = true,
        timeout = false,
        socket = zmq.socket('req');

    if (!req || !req.payload)
        return resHandler(new Error('no payload supplied'));
    
    if (!req || !req.name)
        return resHandler(new Error('no app name supplied'));
    
    if (opts && opts.timeout)
      timeout = opts.timeout;

    // dealer is an async req but we don't need it since JS doesn't block :)
    socket.identity = 'req' + process.pid;

    log.info('locating.. ' + req.name);

    var address = busybee.locator.find(req.name);
    if (_.isUndefined(address))
      return resHandler(new Error('address undefined'));

    log.info('address located: ' + address);
    socket.connect(address);
    log.info('connected: ' + address);

    if (_.contains(this.retryQ, address))
      return resHandler(new Error('timeout from ' + req.name + ':' + address), null);
    
    // send the req
    var payload = (opts && opts.stringifier instanceof Function)
                ? opts.stringifier(req.payload)
                : JSON.stringify(req.payload);

    socket.send(payload);

    // pretty ghetto.  we manually have to set timeouts for servics in the conf since there is no
    // way to detect a failed req connection :(
    _.delay(function() {
      if (timeoutStatus) {
        socket.close();
        log.info( req.name + ' timed out at ' + address);
        // keep track of addresses we've attempted
        this.retryQ.push(address);

        // unregistering the failed service address and retry
        busybee.locator.unregister(req.name, address, function (err, reply) {
            log.info('retrying ' + req.name);
            _this.init({ payload : req.payload, name : req.name }, resHandler, opts);
        });        
      }
    }, timeout || 5000);

    // handles the response from zmq
    socket.on('message', function(data) {
      timeoutStatus = false;
      socket.close();

      data = (opts && opts.parser instanceof Function)
               ? opts.parser(data)
               : data = JSON.parse(data);

      log.info(data);

      return resHandler(null, data);
    });
  }