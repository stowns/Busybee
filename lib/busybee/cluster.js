/**
 * Runs an application process in master-worker arrangement to
 * the maximum number of available CPUs.
 */

var _          = require('lodash'),
    locator = require('./locator'),
    log = busybee.logger,
    Cluster;

/**
 * @constructor
 */
Cluster = module.exports = function (conf) {
  if (conf)
    this.conf = conf;

  _.bindAll(this);
  this.workerRestartArray = []

  process.nextTick(this.start);

  return this;

};

/** @alias {Cluster.prototype.sysCluster} onto Cluster constructor for static ref */
Cluster.prototype.sysCluster = Cluster.sysCluster = require('cluster');

/**
 * Starts the cluster
 */
Cluster.prototype.start = _.once(function () {

  var cluster = this;


  // master initialization
  this.master(function () {
    log.info('Master process id ' + process.pid.toString());

    // Default number of workers is the number of CPUs
    var cpus        = require('os').cpus().length,
        numWorkers  = cluster.numWorkers || cpus;
    
    // explicitly set worker number
    cluster.workers(numWorkers);

    log.info('cluster: Spawning ' + numWorkers
              + ' workers for ' + cpus + ' CPUs');

    // Restart workers when they die
    cluster.sysCluster.on('exit', cluster.restartWorker);

    cluster.sysCluster.on('fork', function(worker) {
      log.info("worker " + worker.process.pid + " (#"+worker.id+") has spawned");
    });

    _.times(numWorkers, cluster.sysCluster.fork);


    /* SETUP SIGNALS */
    
    // signal for trigger a rolling restart of all workers (no downtime)
    process.on('SIGINT', function() {
      // TODO check for more than just a conf to determine if this is an app
      // and needs to be unregistered
      if (!cluster.conf) {
        cluster.shutdown();

        return;
      }

      locator.unregister(cluster.conf.app.name, cluster.conf.sockets.service, function(err, status) {
        if (err) log.info('unable to deregister ' + cluster.conf.app.name);
        
        cluster.shutdown();
      });
    });

    process.on('SIGUSR2', function(){  
      log.info("Signal: SIGUSR2");   
      log.info("swap out new workers one-by-one");   
      cluster.workerRestartArray = []; 
      
      for(var i in cluster.sysCluster.workers){    
        cluster.workerRestartArray.push(cluster.sysCluster.workers[i]);  
      }
     
      cluster.restartWorker();
    });
  });

  // worker initialization
  this.worker(function() {
    process.on('message', function(msg) {
      if(msg == "stop"){
        process.send("stopping");
        process.exit();
      }
    });
  });

  return this;
});

/**
 * Restarts a dead worker
 *
 * @private
 * @param {cluster.worker} worker worker that died
 * @param {Number} code Exit code of dead worker
 * @param {String} signal The signal that killed the worker
 */
Cluster.prototype.restartWorker = function (worker, code, signal) {
  var cluster = this;
  var workersRunning = 0;
  for (var i in cluster.sysCluster.workers){ workersRunning++; }

  // only start a worker if the numWorkers (expected) is > than workersRunning
  if ( cluster.numWorkers > workersRunning ) {
    // delayed to prevent CPU explosions if crashes happen to quickly
    _.delay(function () {
      if (worker) {
        log.info('cluster: Worker ' + worker.id + ' (pid '
         + worker.process.pid + ') ' + 'died ('
         + worker.process.exitCode + '). Respawning..');
      }

      cluster.sysCluster.fork();
    }, 100);
  } 

  // workerRestartArray used for rolling restarts (SIGUSR2)
  if (cluster.workerRestartArray.length > 0) {
    var worker = cluster.workerRestartArray.shift();
    log.info("Sending 'stop' signal to worker " + worker.process.pid);
    // killing a worker will in-turn call restartWorker and restart itself.
    worker.send("stop");
  }

};

/**
 * Sets the number of workers we are to spawn
 *
 * @param {Number} numWorkers How many workers shall we spawn?
 * @return this
 */
Cluster.prototype.workers = function (numWorkers) {

  this.numWorkers = numWorkers;

  return this;

};

/**
 * Executes code on a master process
 *
 * @param {Function} cb Callback to be run if we are in a master process
 */
Cluster.prototype.master = function (cb) {

  if (this.sysCluster.isMaster && cb instanceof Function) cb();

  return this;

};

/**
 * Executes code on a worker process
 *
 * @param {Function} cb Callback to be run if we are in a worker process
 */
Cluster.prototype.worker = function (cb) {

  if (this.sysCluster.isWorker && cb instanceof Function) cb();

  return this;

};

/**
 * Executes code on both processes
 *
 * @param {Function} cb Callback to be run
 */
Cluster.prototype.shared = function (cb) {

  if (cb instanceof Function) cb();

  return this;

}; 

Cluster.prototype.shutdown = function () {
  this.workers(0);
          
  for(var i in this.sysCluster.workers){    
    this.sysCluster.workers[i].send('stop');  
  }
  process.exit();
  log.info('exiting ' +  process.pid.toString());
}