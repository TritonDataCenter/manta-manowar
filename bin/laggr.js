#!/usr/bin/env node
// -*- mode: js -*-
// Copyright 2012 Joyent, Inc.  All rights reserved.

var carrier = require('carrier');
var getopt = require('posix-getopt');
var lib = require('../lib');
var path = require('path');



/**
 * Computes statistics for a set of fields in a json stream over periods of
 * time.  The output is sets of metrics for each field.  For example, given a
 * json stream of records like this:
 *
 *     { time: "2012-11-13T00:59:59.853Z", latency: 40, ...}
 *
 * Once could compute statistics over the latency field for 60 second periods
 * with:
 *     ... | laggr.js -p 60 -t time -f latency
 *
 * Output is in the following format:
 *     {
 *       "start": [time],
 *       "period": 60,
 *       "metrics": {
 *         "latency": {
 *            "n": [ 1, 2, 3, 3, 2, 1, ... ]
 *         }
 *       }
 *     }
 *
 * More fields can be included in the output json doc by specifying them with
 * the -a option.
 */


///--- Helpers

function parseOptions() {
        var option;
        var opts = {};
        var parser = new getopt.BasicParser('f:p:t:',
                                            process.argv);
        opts.fields = [];

        while ((option = parser.getopt()) !== undefined && !option.error) {
                switch (option.option) {
                case 'f':
                        opts.fields.push(option.optarg);
                        break;
                case 'p':
                        opts.period = parseInt(option.optarg, 10);
                        break;
                case 't':
                        opts.time = option.optarg;
                        break;
                default:
                        usage('Unknown option: ' + option.option);
                        break;
                }

        }

        if (opts.fields.length < 1) {
                usage('At least one -f [field] is required');
        }
        if (!opts.period) {
                usage('-p [period seconds] is a required argument');
        }
        if (!opts.time) {
                usage('-t [time field] is a required argument');
        }

        return (opts);
}


function usage(msg) {
        if (msg) {
                console.error(msg);
        }
        var str  = 'usage: ' + path.basename(process.argv[1]);
        str += ' -t [time field] -p [period seconds] -f [field] -f ... ';
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

//Set up the buckets
var _buckets = {};
for (var _n in _opts.fields) {
        var _field = _opts.fields[_n];
        _buckets[_field] = lib.createAggBucket({
                timeField: _opts.time,
                field: _field,
                period: _opts.period
        });
}

_c.on('line', function (line) {
        ++_line;
        var obj = null;
        try {
                obj = JSON.parse(line);
        } catch (err) {
                ifError(err);
        }
        for (var b in _buckets) {
                _buckets[b].apply(obj);
        }
});

_c.on('end', function () {
        var res = {
                period: _opts.period,
                metrics: {}
        };
        var start = null;
        var end = null;
        var b = null;
        for (b in _buckets) {
                var bucket = _buckets[b];
                if (start === null || bucket.minPeriod < start) {
                        start = bucket.minPeriod;
                }
                if (end === null || bucket.maxPeriod > end) {
                        end = bucket.maxPeriod;
                }
        }
        //Move start and end to the nearest hour boundaries
        start = (start - (start % 3600));
        end = (end - (end % 3600) + 3600 - _opts.period);

        res.start = new Date(start * 1000);
        res.end = new Date(end * 1000);

        for (b in _buckets) {
                var report = _buckets[b].report(start, end);
                for (var rep in report) {
                        res.metrics[rep] = report[rep];
                }
        }

        console.log(JSON.stringify(res));
});

process.stdin.resume();
