// Copyright (c) 2012, Joyent, Inc. All rights reserved.

var helper = require('./helper.js');
var lib = require('../lib');



///--- Globals

var test = helper.test;



///--- Helpers

function d(date, offset) {
        return (new Date(date.getTime() + (offset * 1000))).toString();
}


function lastDateAtPeriod(period) {
        var nowMillis = (new Date()).getTime();
        return (new Date(nowMillis - (nowMillis % (period * 1000))));
}



///--- Tests

test('test: basic bucket', function (t) {
        var period = 10;
        var field = 'x';
        var ab = lib.createAggBucket({
                timeField: 't',
                field: field,
                period: period
        });
        var n = lastDateAtPeriod(period);

        //Period 1
        ab.apply({ t: d(n, 2), x: 1 });
        ab.apply({ t: d(n, 4), x: 1 });
        ab.apply({ t: d(n, 6), x: 1 });
        ab.apply({ t: d(n, 8), x: 1 });

        //Period 2
        ab.apply({ t: d(n, 10), x: 1 });
        ab.apply({ t: d(n, 12), x: 2 });
        ab.apply({ t: d(n, 14), x: 3 });

        //Period 3
        ab.apply({ t: d(n, 20), x: 10 });

        //Report should only contain one thing: report
        var report = ab.report();
        t.ok(report[field] != undefined);
        t.equal(1, Object.keys(report).length);

        var rep = report[field];
        t.equal(3, rep.n.length);
        t.equal(3, rep.avg.length);
        t.equal(3, rep.sum.length);
        t.deepEqual(rep.n, [ 4, 3, 1 ]);
        t.deepEqual(rep.sum, [ 4, 6, 10 ]);
        t.deepEqual(rep.avg, [ 1, 2, 10 ]);
        t.deepEqual(rep.min, [ 1, 1, 10 ]);
        t.deepEqual(rep.max, [ 1, 3, 10 ]);
        t.deepEqual(rep.p50, [ 1, 2, 10 ]);
        t.deepEqual(rep.p90, [ 1, 3, 10 ]);
        t.deepEqual(rep.p99, [ 1, 3, 10 ]);

        t.equal(n.getTime() / 1000, ab.minPeriod);
        t.equal((n.getTime() / 1000) + 20, ab.maxPeriod);

        t.end();
});


test('test: statistics bigger', function (t) {
        var period = 10000;
        var field = 'x';
        var ab = lib.createAggBucket({
                timeField: 't',
                field: field,
                period: period
        });
        var n = lastDateAtPeriod(period);

        //Only one period, but lots o' numbers
        for (var i = 0; i < period; ++i) {
                //The + 1 means we have a range of 1..period
                ab.apply({ t: d(n, i), x: i + 1 });
        }

        //Report should only contain one thing: report
        var report = ab.report();
        t.ok(report[field] != undefined);
        t.equal(1, Object.keys(report).length);

        var rep = report[field];
        t.equal(1, rep.n.length);
        t.equal(1, rep.avg.length);
        t.equal(1, rep.sum.length);

        //We're hardhoding the expected answers based on 1..10000
        t.deepEqual(rep.n, [ 10000 ]);
        t.deepEqual(rep.sum, [ 50005000 ]);
        t.deepEqual(rep.avg, [ 5000 ]);
        t.deepEqual(rep.min, [ 1 ]);
        t.deepEqual(rep.max, [ 10000 ]);
        //50% of the numbers are smaller than 5001
        t.deepEqual(rep.p50, [ 5001 ]);
        t.deepEqual(rep.p90, [ 9001 ]);
        t.deepEqual(rep.p99, [ 9901 ]);

        t.equal(n.getTime() / 1000, ab.minPeriod);
        //There's only one period
        t.equal(n.getTime() / 1000, ab.maxPeriod);

        t.end();
});


test('test: path field', function (t) {
        var period = 10;
        var field = 'x.y.z';
        var ab = lib.createAggBucket({
                timeField: 't.u',
                field: field,
                period: period
        });
        var n = lastDateAtPeriod(period);
        ab.apply({ t: { u: d(n, 2) }, x: { y: { z: 1 } } });
        ab.apply({ t: { u: d(n, 3) }, x: { y: { z: 3 } } });

        //Report should only contain one thing: report
        var report = ab.report();
        t.ok(report[field] != undefined);
        t.equal(1, Object.keys(report).length);

        var rep = report[field];
        t.ok(rep != undefined);
        t.equal(1, rep.n.length);
        t.equal(1, rep.avg.length);
        t.equal(1, rep.sum.length);
        t.deepEqual(rep.n, [ 2 ]);
        t.deepEqual(rep.sum, [ 4 ]);
        t.deepEqual(rep.avg, [ 2 ]);

        t.equal(n.getTime() / 1000, ab.minPeriod);
        t.equal(n.getTime() / 1000, ab.maxPeriod);

        t.end();
});


test('test: multi bucket', function (t) {
        var period = 5;
        var field = 'res.code:latency';
        var field200 = 'res.code.200:latency';
        var field500 = 'res.code.500:latency';
        var ab = lib.createAggBucket({
                timeField: 't',
                field: field,
                period: period
        });
        var n = lastDateAtPeriod(period);

        //Period 1
        ab.apply({ t: d(n, 2), latency: 2, res: { code: '200' } });
        ab.apply({ t: d(n, 3), latency: 10, res: { code: '500' } });
        ab.apply({ t: d(n, 4), latency: 4, res: { code: '200' } });

        //Period 2
        ab.apply({ t: d(n, 5), latency: 11, res: { code: '500' } });
        ab.apply({ t: d(n, 6), latency: 3, res: { code: '200' } });
        ab.apply({ t: d(n, 7), latency: 5, res: { code: '200' } });
        ab.apply({ t: d(n, 8), latency: 4, res: { code: '200' } });
        ab.apply({ t: d(n, 9), latency: 13, res: { code: '500' } });

        //Report should only contain one thing: report
        var report = ab.report();

        t.ok(report[field200] != undefined);
        t.ok(report[field500] != undefined);
        t.equal(2, Object.keys(report).length);

        var rep200 = report[field200];
        t.ok(rep200 != undefined);
        t.equal(2, rep200.n.length);
        t.equal(2, rep200.avg.length);
        t.equal(2, rep200.sum.length);
        t.deepEqual(rep200.n, [ 2, 3 ]);
        t.deepEqual(rep200.sum, [ 6, 12 ]);
        t.deepEqual(rep200.avg, [ 3, 4 ]);

        var rep500 = report[field500];
        t.ok(rep500 != undefined);
        t.equal(2, rep500.n.length);
        t.equal(2, rep500.avg.length);
        t.equal(2, rep500.sum.length);
        t.deepEqual(rep500.n, [ 1, 2 ]);
        t.deepEqual(rep500.sum, [ 10, 24 ]);
        t.deepEqual(rep500.avg, [ 10, 12 ]);

        t.equal(n.getTime() / 1000, ab.minPeriod);
        t.equal((n.getTime() / 1000) + period, ab.maxPeriod);

        t.end();
});
