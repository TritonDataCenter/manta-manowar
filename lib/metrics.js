// Copyright (c) 2012, Joyent, Inc. All rights reserved.

var assert = require('assert-plus');
var bunyan = require('bunyan');



///--- API

/**
 * Input objects should look exactly like the output of stream-metrics.js
 *
 * Limitation #1:
 * For now this is pretty dumb- it only merges if the periods, starts and
 * ends are the same.  For now, the stream-metrics is hardcoded to guarentee
 * output for an hour, so all periods should match unless we go outside hour
 * boundaries.
 *
 * Limitation #2:
 * It will throw if both stat numbers at a time are > 0.  Since we're computing
 * stats like avg and time percentiles it's impossible to combine stat numbers.
 * So we assume that the periods were properly bucketized before being run
 * through stream-metrics.
 */
function Metrics(opts) {
        opts = opts || {};
        if (!opts.log) {
                opts.log = bunyan.createLogger({
                        level: (process.env.LOG_LEVEL || 'info'),
                        name: 'metics',
                        stream: process.stdout
                });
        }

        this.obj = null;
        this.log = opts.log;
}

module.exports = Metrics;



///--- APIs

/**
 * Apply an object to the agg bucket.  The agg bucket will find the relevant
 * fields in the object and add the statistics as needed.
 */
Metrics.prototype.merge = function merge(obj) {
        assert.number(obj.period, 'obj.period');
        assert.object(obj.metrics, 'obj.metrics');
        assert.string(obj.start, 'obj.start');
        assert.string(obj.end, 'obj.end');

        //Init with the first object
        if (!this.obj) {
                this.obj = obj;
                return;
        }

        var o = this.obj;
        assert.equal(o.period, obj.period, 'Periods dont match');
        assert.equal(o.start, obj.start, 'Starts dont match.');
        assert.equal(o.end, obj.end, 'Ends dont match.');

        var tm = this.obj.metrics;
        var om = obj.metrics;
        var f = null;
        for (f in tm) {
                //If it doesn't exist in the object to merge in, just skip
                if (!om[f]) {
                        continue;
                }

                //Merge stats together...
                var ts = tm[f];
                var os = om[f];
                //Looping over stats within metrics blocs (ie n, sum, etc);
                for (var ss in ts) {
                        if (!os[ss]) {
                                throw new Error('object doesnt have stat: ' +
                                                f + '.' + ss);
                        }

                        //Merging stat arrays.
                        var a1 = ts[ss];
                        var a2 = os[ss];
                        for (var i = 0; i < a1.length; ++i) {
                                if (a1[i] > 0 && a2[i] > 0) {
                                        throw new Error('Stat exists in both ' +
                                                        f + '.' + ss + '.' + i);
                                }
                                a1[i] += a2[i];
                        }
                }
        }

        //Any metrics that exist in the merging object should be brought in
        // whole-sale.
        for (f in om) {
                if (!tm[f]) {
                        tm[f] = om[f];
                }
        }
};


Metrics.prototype.report = function report() {
        return (this.obj);
};
