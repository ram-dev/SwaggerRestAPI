'use strict';

var server;
var swaggerTools = require('swagger-tools');
var config = require('config');
var HOST = config.get('server.hostname');
var PORT = config.get('server.port');
var DB = config.get('db');
var mongoose = require('mongoose');
var log = require('./lib/logger');
var express = require('express');
var serverPort = PORT;
var errorHandler = require('./lib/middleware/errorHandler');
var configs = config.util.getConfigSources();

configs.forEach(function iterator(c){
  log.info('Loading config ' + c.name);
});
  
mongoose.connect(DB);
var db = mongoose.connection;
// swaggerRouter configuration
var options = {
  controllers: './api/controllers',
  useStubs: process.env.NODE_ENV === 'development' ? true : false // Conditionally turn on stubs (mock mode)
};

var swaggerDoc = require('./api/swagger.json');

db.on('error', function dbConnErrCb(err){
  log.error('Database connection error: ' + err);  
});

db.once('open', function openCb() {
  log.debug('Connected to database: ' + DB);
  // Initialize the Swagger middleware
  swaggerTools.initializeMiddleware(swaggerDoc, function initSwaggerCb(middleware) {
    log.debug('Initialized middleware. Starting app.');
    var app = express();
    // Interpret Swagger resources and attach metadata to request - must be first in swagger-tools middleware chain
    app.use(middleware.swaggerMetadata()); 
    log.debug('Loaded middleware: swaggerMetadata');

    // Validate Swagger requests
    app.use(middleware.swaggerValidator());
    log.debug('Loaded middleware: swaggerValidator');

    // Route validated requests to appropriate controller
    app.use(middleware.swaggerRouter(options));
    log.debug('Loaded middleware: swaggerRouter');

    app.use(middleware.swaggerUi()); // Swagger documents and Swagger UI
    log.debug('Loaded middleware: swaggerUI');
    //error Handler
    app.use(errorHandler);
    log.debug('Loaded middleware: errorHandler');
    // Start the server
    log.info('Service started on ' + PORT);
    log.info('API Documentation available at http://' + HOST + ':' + PORT + '/docs');
    server = app.listen(PORT, function () {console.log('Your server is listening on port %d (http://localhost:%d)', PORT, PORT);});
  });
});

