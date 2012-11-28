// Copyright (c) 2012, Joyent, Inc. All rights reserved.

var assert = require('assert-plus');
var bunyan = require('bunyan');



///--- API

/**
 * Aggregates fields of an object and reports metrics on the aggregations.
 */
function AggBucket(opts) {
        assert.string(opts.timeField);
        assert.string(opts.field);
        assert.number(opts.period);

        if (!opts.log) {
                opts.log = bunyan.createLogger({
                        level: (process.env.LOG_LEVEL || 'info'),
                        name: 'agg_bucket',
                        stream: process.stdout
                });
        }

        this.timeField = opts.timeField;
        this.field = opts.field;
        this.period = opts.period;
        this.minPeriod = null;
        this.maxPeriod = null;
        this.reports = {};
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


function getTimeBucket(period, time) {
        var date = new Date(time);
        var t = date.getTime() / 1000;
        return (t - (t % period));
}


//Assumming that values are already sorted.
function percentile(vals, p) {
        assert.number(p);
        return (vals[(Math.round(((p/100) * vals.length) + 1/2) - 1)]);
}



///--- APIs

/**
 * Apply an object to the agg bucket.  The agg bucket will find the relevant
 * fields in the object and add the statistics as needed.
 */
AggBucket.prototype.apply = function apply(obj) {
        //Resolve field and find bucket...
        var reportName = this.field;
        var fieldName = this.field;

        //If there's a ':' this is a multi-bucket key, meaning that given
        // foo:bar, we'll fetch the string at path 'foo' in the object and make
        // the report string 'foo.string:bar', aggregating using the number at
        // path bar.
        if (reportName.indexOf(':') !== -1) {
                var parts = reportName.split(':');
                var suffix = getField(parts[0], obj);
                //If there's no string, we just kick out since the object
                // isn't relevant to this aggregation.
                if (!suffix) {
                        return;
                }
                reportName = parts[0] + '.' + suffix.value + ':' + parts[1];
                fieldName = parts[1];
        }

        var time = getField(this.timeField, obj).value;
        var value = getField(fieldName, obj).value + 0;
        if (!time || !value) {
                return;
        }
        var timeBucket = getTimeBucket(this.period, time);

        //Get the report...
        var currReport = this.reports[reportName];
        if (!currReport) {
                currReport = {};
                this.reports[reportName] = currReport;
        }

        if (!currReport[timeBucket]) {
                if (this.minPeriod === null || this.minPeriod > timeBucket) {
                        this.minPeriod = timeBucket;
                }
                if (this.maxPeriod === null || this.maxPeriod < timeBucket) {
                        this.maxPeriod = timeBucket;
                }
                currReport[timeBucket] = new Bucket();
        }
        currReport[timeBucket].apply(value);
};


/**
 * Get a current report from the AggBucket.
 */
AggBucket.prototype.report = function report(start, end) {
        start = start || this.minPeriod;
        end = end || this.maxPeriod;

        var cont = {};
        for (var rep in this.reports) {
                //Fields are defined by the report...
                var ret = {};
                cont[rep] = ret;

                var currReport = this.reports[rep];
                var zeroBucket = new Bucket();
                if (!start || !end || start > end) {
                        return (null);
                }
                for (var i = start; i <= end; i += this.period) {
                        var bucket = currReport[i] || zeroBucket;
                        var r = bucket.report();
                        for (var key in r) {
                                if (!ret[key]) {
                                        ret[key] = [];
                                }
                                ret[key].push(r[key]);
                        }
                }
        }

        return (cont);
};



///--- Inner Classes

function Bucket() {
        this.n = 0;
        this.sum = 0;
        this.values = [];
}


Bucket.prototype.apply = function bucket_apply(i) {
        ++this.n;
        this.sum += i;
        this.values.push(i);
};


Bucket.prototype.report = function bucket_report() {
        var avg = (this.n === 0) ? 0 : Math.floor(this.sum / this.n);
        this.values.sort(function (a, b) { return (a - b); });
        return ({
                n: this.n,
                sum: this.sum,
                avg: avg,
                min: this.values[0],
                max: this.values[this.values.length - 1],
                p50: percentile(this.values, 50),
                p90: percentile(this.values, 90),
                p99: percentile(this.values, 99)
        });
};
