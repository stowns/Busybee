var redis = require("redis"),
    client,
    sub, 
    _ = require('lodash'),
    events = require('events'),
    url = require('url'),
    log = busybee.logger,
    Locator;

/**
 * @constructor
 */
function Locator () {
  if ( !(this instanceof arguments.callee) )
    return new Locator();
  
  _.bindAll(this);

  return this;
}

Locator.prototype.__proto__ = events.EventEmitter.prototype;

/**
 * Initializes a Locator.
 *
 * Will initialize once.  All other initialization via 'new' will return the initial instance.
 */
Locator.prototype.init = _.once(function(conf) {
  log.info('locator initializing...');
  var _this = this;

  // parse redis url and connect clients
  var parsedUrl = url.parse(conf.store.redis);
  var auth = parsedUrl.auth ? parsedUrl.auth.split(":")[1] : '';
  client = redis.createClient(parsedUrl.port, parsedUrl.hostname);
  client.auth(auth); 
  sub = redis.createClient(parsedUrl.port, parsedUrl.hostname);
  sub.auth(auth);

  // call EventEmitter constructor
  events.EventEmitter.call(this);

  // fetch current app list
  this.fetch(function(apps) {
    _this.apps = apps;
  });

  sub.on("subscribe", function (channel, count) {
    log.info('listening for app updates');
  });

  // parse any incoming messages
  sub.on("message", function (channel, appList) {
    var apps = JSON.parse(appList);
    log.info(process.pid.toString() + ' busybee-app registry updated ' + apps);
   
    _this.apps = parseAppList(apps);
    _this.emit('busybee-app-update');
  });

  // subscribe for app updates
  sub.subscribe("busybee-app-update");

  return this;
});

/**
 * Returns the address of a named app.  Will fair-que the returned ips.
 *
 * @param {String} name - name of the application that you would like to retrieve an address for.
 */
Locator.prototype.find = function(name) {
  var s;
  
  if (this.apps[name]) {
    s = this.apps[name].shift();
    // move the returned app to the back of the stack (fair-que)
    this.apps[name].push(s);
  }

  return s; 
}

/**
 * Registers a new busybee app
 *
 * @param {String} name - name of the application to register
 * @param {String} address - address of the application to register
 */
Locator.prototype.register = function(name, address) {
  client.multi()
        .sadd("busybee-apps", name + "|" + address)
        .smembers("busybee-apps")
        .exec(function(err, reply) {
          // publish new list to redis
          client.publish("busybee-app-update", JSON.stringify(reply[1]));
        });
}

/**
 * @callback unregisterCb
 * @param {Error} err - unregister error
 * @param {String[]} reply - list of current apps
 */

/**
 * Removes an app from the registry
 *
 * @param {String} name - name of the application to remove from the registry
 * @param {String} address - address of the
 * @param {unregisterCb} [cb] - optionally handle the result of unregistering an application
 */
Locator.prototype.unregister = function(name, address, cb) {
  var _this = this;
  // set (remove)
  client.multi()
        .srem("busybee-apps", name + "|" + address)
        .smembers("busybee-apps")
        .exec(function(err, reply) {
          // publish new list to redis
          client.publish("busybee-app-update", JSON.stringify(reply[1]));
          if (!err)
            log.info(name + "|" + address + " unregistered");

          if (cb instanceof Function)
            cb(err, reply[1]);
        });
}

/**
 * Returns a object containing all currently registered busybee apps.
 *
 * @param {Function} cb - callback to run after fetch
 */
Locator.prototype.fetch = function(cb) {
  client.smembers("busybee-apps", function(err, appList) {
    cb(parseAppList(appList));
  });
}

function parseAppList(appList) {
  var apps = {};
  // build up a apps object from an incoming update
  appList.forEach(function(a) {
    var app = a.split("|");
    _.isUndefined(apps[app[0]])
       ? apps[app[0]] = [app[1]]
       : apps[app[0]].push(app[1]);
  });
  log.info(process.pid.toString() + ' apps parsed');
  log.info(apps);

  return apps;
}

module.exports = new Locator();