// Copyright (c) 2012, Joyent, Inc. All rights reserved.

var assert = require('assert-plus');
var helper = require('./helper.js');
var lib = require('../lib');



///--- Globals

var test = helper.test;



//--- Helpers

function outer() {
        return ({
                'period': 60,
                'metrics': {
                        'latency': {
                                'n': [1, 0, 3, 0, 5],
                                'sum': [6, 0, 8, 0, 10],
                                'avg': [11, 0, 13, 0, 15]
                        }
                },
                'start': '2012-11-13T01:00:00.000Z',
                'end': '2012-11-13T01:04:00.000Z'
        });
}


function inner() {
        return ({
                'period': 60,
                'metrics': {
                        'latency': {
                                'n': [0, 2, 0, 4, 0],
                                'sum': [0, 7, 0, 9, 0],
                                'avg': [0, 12, 0, 14, 0]
                        }
                },
                'start': '2012-11-13T01:00:00.000Z',
                'end': '2012-11-13T01:04:00.000Z'
        });
}


function all() {
        return ({
                'period': 60,
                'metrics': {
                        'latency': {
                                'n': [1, 2, 3, 4, 5],
                                'sum': [6, 7, 8, 9, 10],
                                'avg': [11, 12, 13, 14, 15]
                        }
                },
                'start': '2012-11-13T01:00:00.000Z',
                'end': '2012-11-13T01:04:00.000Z'
        });
}



///--- Tests

test('test: merge only one', function (t) {
        var metrics = lib.createMetrics();
        metrics.merge(inner());
        var rep = metrics.report();
        t.deepEqual(inner(), rep);
        t.end();
});


test('test: simple merge', function (t) {
        var metrics = lib.createMetrics();
        metrics.merge(inner());
        metrics.merge(outer());
        var rep = metrics.report();
        t.deepEqual(all(), rep);
        t.end();
});


test('test: different start times', function (t) {
        var metrics = lib.createMetrics();
        var differentStart = {
                'period': 60,
                'metrics': {
                        'latency': {
                                'n': [1, 2, 3, 4, 5],
                                'sum': [6, 7, 8, 9, 10],
                                'avg': [11, 12, 13, 14, 15]
                        }
                },
                'start': '2012-11-13T01:01:00.000Z',
                'end': '2012-11-13T01:05:00.000Z'
        };
        metrics.merge(inner());
        var errCaught = false;
        try {
                metrics.merge(differentStart);
        } catch (err) {
                errCaught = true;
        }
        t.equal(true, errCaught);
        t.end();
});


test('test: different periods', function (t) {
        var metrics = lib.createMetrics();
        var differentPeriod = {
                'period': 30,
                'metrics': {
                        'latency': {
                                'n': [1, 2, 3, 4, 5],
                                'sum': [6, 7, 8, 9, 10],
                                'avg': [11, 12, 13, 14, 15]
                        }
                },
                'start': '2012-11-13T01:00:00.000Z',
                'end': '2012-11-13T01:04:00.000Z'
        };
        metrics.merge(inner());
        var errCaught = false;
        try {
                metrics.merge(differentPeriod);
        } catch (err) {
                errCaught = true;
        }
        t.equal(true, errCaught);
        t.end();
});


test('test: second brings in more metrics', function (t) {
        var metrics = lib.createMetrics();
        var addMetrics = {
                'period': 60,
                'metrics': {
                        'morelatency': {
                                'n': [1, 2, 3, 4, 5],
                                'sum': [6, 7, 8, 9, 10],
                                'avg': [11, 12, 13, 14, 15]
                        }
                },
                'start': '2012-11-13T01:00:00.000Z',
                'end': '2012-11-13T01:04:00.000Z'
        };
        metrics.merge(inner());
        metrics.merge(addMetrics);
        var rep = metrics.report();
        t.equal(2, Object.keys(rep.metrics).length);
        assert.object(rep.metrics.latency);
        assert.object(rep.metrics.morelatency);
        t.deepEqual(all().metrics.latency, rep.metrics.morelatency);
        t.end();
});
