// Copyright (c) 2012, Joyent, Inc. All rights reserved.

var AggBucket = require('./agg_bucket');



///--- API

module.exports = {
        createAggBucket: function createAggBucket(opts) {
                var ab = new AggBucket(opts);
                return (ab);
        }
};
