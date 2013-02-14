// Copyright (c) 2012, Joyent, Inc. All rights reserved.

var assert = require('assert-plus');
var helper = require('./helper.js');
var RelativeTime = require('../static/js/relative-time');



///--- Globals

var test = helper.test;
var now = (new Date()).getTime();


//--- Helpers



///--- Tests

test('test: with Date vs Time', function (t) {
        var rtDate = RelativeTime.unixTime('1 hours ago', new Date(now));
        var rtTime = RelativeTime.unixTime('1 hours ago', now);
        t.equal(rtDate, rtTime, 'Date and time equal relative times');
        t.equal(now - rtTime, 1000 * 60 * 60, 'Not correct offset');
        t.end();
});


test('test: now', function (t) {
        var rtTime = RelativeTime.unixTime('now', new Date(now));
        t.equal(now, rtTime, 'Now isn\'t now');
        t.end();
});


test('test: yesterday', function (t) {
        var rtTime = RelativeTime.unixTime('yesterday', now);
        t.equal(now - rtTime, 1000 * 60 * 60 * 24,
                'Yesterday isn\'t 24 hours ago.');
        t.end();
});


test('test: N second ago', function (t) {
        var rtTime = RelativeTime.unixTime('121 second ago', now);
        t.equal(now - rtTime, 1000 * 121,
                '121 second ago isn\'t 121 seconds ago.');
        t.end();
});


test('test: N seconds ago', function (t) {
        var rtTime = RelativeTime.unixTime('10 seconds ago', now);
        t.equal(now - rtTime, 1000 * 10,
                '10 seconds isn\'t 10 seconds ago.');
        t.end();
});


test('test: N minute ago', function (t) {
        var rtTime = RelativeTime.unixTime('3 minute ago', now);
        t.equal(now - rtTime, 1000 * 60 * 3,
                '3 minte ago isn\'t 3 minutes ago.');
        t.end();
});


test('test: N minutes ago', function (t) {
        var rtTime = RelativeTime.unixTime('5023 minutes ago', now);
        t.equal(now - rtTime, 1000 * 60 * 5023,
                '5023 minutes ago isn\'t 5023 minutes ago.');
        t.end();
});


test('test: N hour ago', function (t) {
        var rtTime = RelativeTime.unixTime('2 hour ago', now);
        t.equal(now - rtTime, 1000 * 60 * 60 * 2,
                '2 hour ago isn\'t 2 hours ago.');
        t.end();
});


test('test: N hours ago', function (t) {
        var rtTime = RelativeTime.unixTime('24 hours ago', now);
        t.equal(now - rtTime, 1000 * 60 * 60 * 24,
                '24 hours ago isn\'t 24 hours ago.');
        t.end();
});


test('test: N day ago', function (t) {
        var rtTime = RelativeTime.unixTime('7 day ago', now);
        t.equal(now - rtTime, 1000 * 60 * 60 * 24 * 7,
                '7 day ago isn\'t 7 days ago.');
        t.end();
});


test('test: N days ago', function (t) {
        var rtTime = RelativeTime.unixTime('32 day ago', now);
        t.equal(now - rtTime, 1000 * 60 * 60 * 24 * 32,
                '32 day ago isn\'t 32 days ago');
        t.end();
});


test('test: N week ago', function (t) {
        var rtTime = RelativeTime.unixTime('1 week ago', now);
        t.equal(now - rtTime, 1000 * 60 * 60 * 24 * 7,
                '1 week ago isn\'t one week ago.');
        t.end();
});


test('test: N weeks ago', function (t) {
        var rtTime = RelativeTime.unixTime('5 weeks ago', now);
        t.equal(now - rtTime, 1000 * 60 * 60 * 24 * 7 * 5,
                '5 weeks ago isn\'t 5 weeks ago.');
        t.end();
});


test('test: junk', function (t) {
        var rtTime = RelativeTime.unixTime('junk', now);
        t.equal(null, rtTime, 'Junk didn\'t cause null');
        t.end();
});


test('test: junk ago', function (t) {
        var rtTime = RelativeTime.unixTime('junk', now);
        t.equal(null, rtTime, 'Junk didn\'t cause null');
        t.end();
});


test('test: N junk ago', function (t) {
        var rtTime = RelativeTime.unixTime('5 junk ago', now);
        t.equal(null, rtTime, 'Junk didn\'t cause null');
        t.end();
});


test('test: N junks ago', function (t) {
        var rtTime = RelativeTime.unixTime('5 junks ago', now);
        t.equal(null, rtTime, 'Junks didn\'t cause null');
        t.end();
});


test('test: junk junk ago', function (t) {
        var rtTime = RelativeTime.unixTime('junk junk ago', now);
        t.equal(null, rtTime, 'Junk didn\'t cause null');
        t.end();
});


test('test: junk days ago', function (t) {
        var rtTime = RelativeTime.unixTime('junk days ago', now);
        t.equal(null, rtTime, 'Junk didn\'t cause null');
        t.end();
});

