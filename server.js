// Copyright (c) 2012, Joyent, Inc. All rights reserved.

var express = require('express');
var bunyan = require('bunyan');



//--- Globals

var DEFAULT_PORT = 8080;
var LOG = bunyan.createLogger({
        level: (process.env.LOG_LEVEL || 'info'),
        name: 'manowar',
        stream: process.stdout
});



//--- Main

var port = parseInt(process.argv[2], 10) || DEFAULT_PORT;

var app = express();

//TODO: Route first to the ajaxy part
//app.use(app.router);

//Route everything else to the static directory.
app.use(express.static(__dirname + '/static'));

LOG.info({ port: port }, 'Starting server...');

app.listen(port);
