// Copyright (c) 2012, Joyent, Inc. All rights reserved.

var AggBucket = require('./agg_bucket');
var Metrics = require('./metrics');



///--- API

module.exports = {
        createAggBucket: function createAggBucket(opts) {
                var ab = new AggBucket(opts);
                return (ab);
        },

        createMetrics: function createMetrics(opts) {
                var metrics = new Metrics(opts);
                return (metrics);
        }
};
