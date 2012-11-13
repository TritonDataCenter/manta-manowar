// Copyright (c) 2012, Joyent, Inc. All rights reserved.

//var util = require('util');
var assert = require('assert-plus');
var bunyan = require('bunyan');



///--- API

/**
 * Comment Me
 */
function Foo(opts) {
        assert.string(opts.param);
        if (!opts.log) {
                opts.log = bunyan.createLogger({
                        level: (process.env.LOG_LEVEL || 'info'),
                        name: 'Foo',
                        stream: process.stdout
                });
        }

        this.p = opts.param;
        this.log = opts.log;
}

//util.inherits(Foo, Parent);
module.exports = Foo;



///--- APIs

/**
 * Comment Me
 */
Foo.prototype.concatToParam = function concatToParam(s) {
        this.log.debug({ s: s }, 'concatting');
        var self = this;
        return (self.p + s);
};
