var zmq = require('zmq'),
    _ = require('lodash'),
    log = busybee.logger,
    Pull;


Pull = module.exports = function (address, cb, opts) {
  var socket = zmq.socket('pull');

  socket.identity = 'downstream' + process.pid;
  
  socket.connect(address);
  console.log('connected!');

  socket.on('message', function(payload) {
    console.log('message recieved');

    payload = (opts && opts.parser)
               ? opts.parser(payload)
               : JSON.parse(payload);

    cb(null, payload);
  });

  return this;
}