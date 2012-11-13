// Copyright (c) 2012, Joyent, Inc. All rights reserved.

var helper = require('./helper.js');
var lib = require('../lib');



///--- Globals

var test = helper.test;



///--- Tests

test('test: append a', function (t) {
        var foo = lib.createFoo({ param: 'a' });
        t.equal('aa', foo.concatToParam('a'), 'Append didnt work.');
        t.end();
});
