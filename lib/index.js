// Copyright (c) 2012, Joyent, Inc. All rights reserved.

var Foo = require('./foo');



///--- API

module.exports = {

        /**
         * Comment Me.
         */
        createFoo: function createFoo(opts) {
                var foo = new Foo(opts);
                return (foo);
        }
};
