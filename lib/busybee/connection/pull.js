var zmq = require('zmq'),
    _ = require('lodash'),
    log = busybee.logger,
    Pull;

/**
 * @constructor
 * 
 * @param {String} appName - Name of the Busybee Pull Connection to pull messages from.
 * @param {Function} pullHandler - A callback function to evaluate once messages are recieved
 * @param {Object} [opts] - Any additional options.  Currently only 'parser' is supported.
 */
Pull = module.exports = function (appName, pullHandler, opts) {
  this.retryQ = [];

  this.init(appName, pullHandler, opts);
}

Pull.prototype.init = function (appName, pullHandler, opts) {
  var socket = zmq.socket('pull');

  socket.identity = 'pull' + process.pid;

  if (!appName)
    return pullHandler(new Error('no app name supplied'));

  log.info('locating.. ' + appName);
  var address = busybee.locator.find(appName);
  
  if (_.isUndefined(address))
      return pullHandler(new Error('address undefined'));

  log.info('address located: ' + address);
  socket.connect(address);
  log.info('connected: ' + address);

  socket.on('message', function(payload) {
    console.log('message recieved');

    payload = (opts && opts.parser)
                ? opts.parser(payload)
                : JSON.parse(payload);

    pullHandler(null, payload);
  });
}