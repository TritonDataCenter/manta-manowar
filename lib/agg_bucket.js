// Copyright (c) 2012, Joyent, Inc. All rights reserved.

var assert = require('assert-plus');
var bunyan = require('bunyan');



///--- API

/**
 * TODO: Make this work with the -f res.statusCode:latency format.
 */
function AggBucket(opts) {
        assert.string(opts.timeField);
        assert.string(opts.field);
        assert.number(opts.period);

        if (!opts.log) {
                opts.log = bunyan.createLogger({
                        level: (process.env.LOG_LEVEL || 'info'),
                        name: 'Foo',
                        stream: process.stdout
                });
        }

        this.timeField = opts.timeField;
        this.field = opts.field;
        this.period = opts.period;
        this.minPeriod = null;
        this.maxPeriod = null;
        this.buckets = {};
        this.log = opts.log;
}

module.exports = AggBucket;



///--- Helpers

//Walks down the "path" of a javascript object to find the
// end field.
function getField(field, obj) {
        var ret = obj;
        var parts = field.split('.');
        for (var i = 0; i < parts.length; ++i) {
                var n = parts[i];
                if (ret[n]) {
                        ret = ret[n];
                } else {
                        ret = null;
                        break;
                }
        }
        return ({
                name: field,
                value: ret
        });
}


function getBucket(period, time) {
        var date = new Date(time);
        var t = date.getTime() / 1000;
        return (t - (t % period));
}


//TODO: Factor out into separate class
var agg = function () {
        var n = 0;
        var sum = 0;
        var values = [];

        return ({
                apply: function (i) {
                        ++n;
                        sum += i;
                        values.push(i);
                },
                report: function () {
                        var avg = (n === 0) ? 0 : Math.floor(sum / n);
                        return ({
                                n: n,
                                sum: sum,
                                avg: avg
                        });
                }
        });
};



///--- APIs

/**
 * Apply an object to the agg bucket.  The agg bucket will find the relevant
 * fields in the object and add the statistics as needed.
 */
AggBucket.prototype.apply = function apply(obj) {
        this.log.debug({ obj: obj }, 'applying');
        var time = getField(this.timeField, obj).value;
        var value = getField(this.field, obj).value + 0;
        if (!time || !value) {
                return;
        }
        var bucket = getBucket(this.period, time);
        if (!this.buckets[bucket]) {
                if (this.minPeriod === null || this.minPeriod > bucket) {
                        this.minPeriod = bucket;
                }
                if (this.maxPeriod === null || this.maxPeriod < bucket) {
                        this.maxPeriod = bucket;
                }
                this.buckets[bucket] = agg();
        }
        this.buckets[bucket].apply(value);
};


/**
 * Get a current report from the AggBucket.
 */
AggBucket.prototype.report = function report(start, end) {
        start = start || this.minPeriod;
        end = end || this.maxPeriod;

        var cont = {};
        var ret = {
                n: [],
                sum: [],
                avg: []
        };
        cont[this.field] = ret;

        var zeroBucket = agg();
        if (!start || !end || start > end) {
                return (null);
        }
        for (var i = start; i <= end; i += this.period) {
                var bucket = this.buckets[i] || zeroBucket;
                var r = bucket.report();
                for (var key in ret) {
                        ret[key].push(r[key]);
                }
        }

        return (cont);
};
