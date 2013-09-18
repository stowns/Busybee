![BusyBee](http://www.acclaimclipart.com/free_clipart_images/cute_cartoon_bumble_bee_in_black_and_white_0071-0905-2918-5956_SMU.jpg)

Busybee
=======

Busybee aims to handle many of the tasks involved with running applications in a distributed manner (a hive).  These tasks include configuration loading, logging, registration, communication and clustering

Shared ovs modules for node.js
* [Requirements](#requirements)
* [Getting Started](#getting-started)
* [Modules](#modules)
  * [Conf](#conf)
  * [Connection](#connection)
  * [Logger](#logger)
  * [Locator](#locator)
  * [Cluster](#cluster)
* [Architecture](#architecture)
  * [SOA](#soa)
* [Versions](#versions)

## Getting Started

### Dependencies

- [Node.js ≥ 0.8.21][node]
- [Redis][redis]
- [ZeroMQ][zmq]

```js
var busybee  = require('busybee');
busybee.init({ name : 'my_app_name' });
```
busybee will be available globally throughout your application after initialization.

## Modules

### Conf

`busybee.conf` is automatically loaded on busybee.init().  The default location for configuration is /root_of_app/conf /.  Two files are expected in the conf/ directory, development.js and production.js.

```js
module.exports = {
  app: {
    name : 'service_1'
  },
  sockets: {
    service : 'tcp://localhost:5559',
    broker: {
      front: 'tcp://*:5559',
      back: 'tcp://*:5560'
    },
    worker: 'tcp://localhost:5560'
  },
  store: {
    mongo: 'mongodb://localhost/service_1',
    redis: 'redis://localhost:6379'
  },
  logger: {
    index:  {
      type : 'Mongo',
      levels : ['warn', 'error', 'fatal']
    }
  }
};
```
Alternatively, a custom configuration path can be supplied on initialization of Busybee:
```js
busybee.init({ name : 'api', conf : '/my/absolute/conf/path' });
```

### Connection

`busybee.connection` is where much of Busybee's power lies.  This module exposes several connection types that use [zmq] under the covers to communicate with other Busybee applications.  It's likely that in architecting your application you will implement several different types of Busybee Connections.

By default all connections that make requests JSON.stringify them before sending while connections that accept requests JSON.parse them.  If you would like to transport a different data structure you will need to supply a 'parser' and 'stringifier' as opts to the connection. *Note: A Broker connection does not require a parser or stringifier as its only job is to load balance to workers and does not taint the request*

#### connection.req

A basic request connection.

```js
var resHandler = function(err, response) {
  if (err) return log.error(err);

  log.info(response);
}

new busybee.connection.req({ payload : { param1 : "I'm param 1!" }, 
                             name : 'name_of_app_we_are_calling',
                             timeout : 3000}, resHandler);
```

#### connection.rep

A basic response connection.  A Rep connection binds to the address it is supplied.

```js
busybee.locator.register('my_app', 'tcp://localhost:5563');

var reqHandler = function(err, req) {
  if (err) return log.error(err);

  var res = new Object();
  res.data = 'data on process: ' + process.pid + ' (node) with payload ' + req;

  return res;
}

var conn = new busybee.connection.rep('tcp://*:5563', reqHandler);
```

#### connection.worker

A special type of Rep connection, Worker connections are designed to reply to requests sent from a Broker connection.  A Worker connection is essentially identical to a Rep connection in practice.  However, Worker connections *connect* while Rep connections *bind*.  This subtle difference is why a Worker connection should only be sent requests from a Broker connection.  It will not respond to a Req connection directly.

```js
var reqHandler = function(err, req) {
  if (err) return log.error(err);

  var res = new Object();
  res.data = 'data on process: ' + process.pid + ' (node) with payload ' + req;

  return res;
}

var conn = new busybee.connection.rep('tcp://*:5563', reqHandler);
```

#### connection.broker

Designed to load balance requests to a cluster of workers.  A Broker connection must be passed an address to accept requests on and an address to deal requests to workers on.  The broker binds to both of these address.  Requests sent to a Broker connection are not manipulated in a any way and therefor will never require a parser or stringifier.

```js
busybee.locator.register('my_app', 'tcp://localhost:5559');
    
var conn = new busybee.connection.broker('tcp://*:5559', 'tcp://*:5560');
```

### Logger

`busybee.logger` is a wrapped instance of [bunyan][bunyan] with added methods for indexing specific log levels to MongoDb.  If indexing is enabled each log-level will create it's own collection in MongoDb for storage.  ie) 'warn' logs will be available in the  'warn_logs' collection.  To enable log indexing add the following to your configuration file.

```js
logger: {
    index:  {
      type : 'Mongo',
      levels : ['info', warn', 'error', 'fatal']
    }
  }
```
**Note: *levels* describes which log-levels to index to MongoDb. 'Mongo' is the only database currently supported**

### Locator

`busybee.locator` handles registration, unregistration and lookup of all busybee applications running in your 'hive' and is automatically instantiated on busybee.init().  The Locator is used internally by the different connection types that Busybee exposes and will rarely be required explicitly.  However, the locator can be accessed as such

```js
var locator = busybee.locator;
var address = locator.find('name_of_service');
```

### Cluster

`busybee.cluster` provides a simple interface to run your appliction as a process
cluster.

```js
new busybee.cluster();
```

The initial process becomes the master, and workers are spawned as subprocesses. If a
worker dies, it will be immediately respawned regardless of exit code. Terminating
the master will send a hangup to all workers.

`busybee.cluster` exposes an API to execute code exclusively within master and child processes.
`master` and `worker` are available:

```js
new busybee.cluster()
  .master(function () {
    logger.info('Queen Bee');
  })
  .worker(function () {
    logger.info('Reporting for duty!');
  })
  .master(somethingMasterful());
```

By default, the number of workers spawned will equal the number of CPUs on the machine.
You may specify the number of workers using the `workers` method:

```js
new busybee.cluster()
  .workers(10)
  .worker(function () {
    doSomeWork();
  });
```

The cluster will intialize itself after all chaining on the `new busybee.cluster()` is complete.
If you feel like being explicit, you may call the `start` method:

```js
new busybee.cluster()
  .master(function () {
    logger.info('About to call start explicitly!');
  })
  .start();
```

Process clustering with `busybee.cluster` is highly recommended, as it frees the event
loop of the master process to spin as quickly as it can, distributing work to eager workers
as they become available. This produces highly responsive and reliable services.

**Learn more** [cluster documentation][cluster]

## Architecture

### SOA
An example of implementing a SOA with Busybee.  

In the diagram below App 1 is a REST API implementing the busybee.cluster() module.  The http server's port is shared among App 1's workers and accepting requests.  When a request comes into one of App 1's workers its logic will determine which service applications are required to fulfill that request.  App 1's worker will create a new busybee.connection.req for each service call.  App 2 (and each additional app acting as a service) implements busybee.cluster() as well.  The master process of App 2 maintains a busybee.connection.broker while each worker processs implements (you guessed it) busybee.connection.worker.  As an aside, you may be asking yourself why not just have each worker in the cluster bind to a shared port with a busybee.connection.rep?  The simple answer is, the zmq lib for nodejs is not capable of sharing a bound port between processes.

![SOA](http://cl.ly/image/2m3m2z2a0z2p/soa.jpg)


## Versions

Versions are incremented according to [semver](http://semver.org/).

#### v0.1.0 "Don't Worry Bee Happy"


[node]: http://nodejs.org/ "Node.js"
[jsdoc]: http://usejsdoc.org/ "JSDoc"
[bunyan]: https://github.com/trentm/node-bunyan
[cluster]: http://nodejs.org/docs/v0.8.22/api/cluster.html "Cluster - Node v0.8.22"
[redis]: http://redis.io/download "Redis"
[zmq]: http://zeromq.org/intro:get-the-software "ZMQ"