#!/usr/bin/env node
// -*- mode: js -*-
// Copyright 2012 Joyent, Inc.  All rights reserved.

var carrier = require('carrier');
var getopt = require('posix-getopt');
var lib = require('../lib');
var path = require('path');



/**
 * Merges metrics outputs from stream-metrics.js.
 *
 * Input and output is in the following format:
 *     {
 *       "start": [time],
 *       "period": 60,
 *       "metrics": {
 *         "latency": {
 *            "n": [ 1, 2, 3, 3, 2, 1, ... ]
 *         }
 *       }
 *     }
 */


///--- Helpers

function parseOptions() {
        var option;
        var opts = {};
        var parser = new getopt.BasicParser('', process.argv);
        while ((option = parser.getopt()) !== undefined && !option.error) {
                switch (option.option) {
                default:
                        usage('Unknown option: ' + option.option);
                        break;
                }

        }

        return (opts);
}


function usage(msg) {
        if (msg) {
                console.error(msg);
        }
        var str  = 'usage: ' + path.basename(process.argv[1]);
        str += '';
        console.error(str);
        process.exit(1);
}


function ifError(err, msg) {
        if (err) {
                console.log(err, msg);
                process.exit(1);
        }
}



///--- Main

var _opts = parseOptions();
var _c = carrier.carry(process.stdin);
var _line = 0;

//Set up the metrics
var _metrics = lib.createMetrics();

_c.on('line', function (line) {
        ++_line;
        var obj = null;
        try {
                obj = JSON.parse(line);
                _metrics.merge(obj);
        } catch (err) {
                ifError(err);
        }
});

_c.on('end', function () {
        console.log(JSON.stringify(_metrics.report()));
});

process.stdin.resume();
