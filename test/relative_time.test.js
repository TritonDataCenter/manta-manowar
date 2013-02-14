// Copyright (c) 2012, Joyent, Inc. All rights reserved.

var assert = require('assert-plus');
var helper = require('./helper.js');
var RelativeTime = require('../static/js/relative-time');



///--- Globals

var test = helper.test;
var now = (new Date()).getTime();



///--- Tests

test('test: with Date vs Time', function (t) {
        var rtDate = RelativeTime.millisSinceEpoch('1 hours ago',
                                                   new Date(now));
        var rtTime = RelativeTime.millisSinceEpoch('1 hours ago', now);
        t.equal(rtDate, rtTime, 'Date and time equal relative times');
        t.equal(now - rtTime, 1000 * 60 * 60, 'Not correct offset');
        t.end();
});


test('test: now', function (t) {
        var rtTime = RelativeTime.millisSinceEpoch('now', new Date(now));
        t.equal(now, rtTime, 'Now isn\'t now');
        t.end();
});


test('test: yesterday', function (t) {
        var rtTime = RelativeTime.millisSinceEpoch('yesterday', now);
        t.equal(now - rtTime, 1000 * 60 * 60 * 24,
                'Yesterday isn\'t 24 hours ago.');
        t.end();
});


test('test: N second ago', function (t) {
        var rtTime = RelativeTime.millisSinceEpoch('121 second ago', now);
        t.equal(now - rtTime, 1000 * 121,
                '121 second ago isn\'t 121 seconds ago.');
        t.end();
});


test('test: N seconds ago', function (t) {
        var rtTime = RelativeTime.millisSinceEpoch('10 seconds ago', now);
        t.equal(now - rtTime, 1000 * 10,
                '10 seconds isn\'t 10 seconds ago.');
        t.end();
});


test('test: N minute ago', function (t) {
        var rtTime = RelativeTime.millisSinceEpoch('3 minute ago', now);
        t.equal(now - rtTime, 1000 * 60 * 3,
                '3 minte ago isn\'t 3 minutes ago.');
        t.end();
});


test('test: N minutes ago', function (t) {
        var rtTime = RelativeTime.millisSinceEpoch('5023 minutes ago', now);
        t.equal(now - rtTime, 1000 * 60 * 5023,
                '5023 minutes ago isn\'t 5023 minutes ago.');
        t.end();
});


test('test: N hour ago', function (t) {
        var rtTime = RelativeTime.millisSinceEpoch('2 hour ago', now);
        t.equal(now - rtTime, 1000 * 60 * 60 * 2,
                '2 hour ago isn\'t 2 hours ago.');
        t.end();
});


test('test: N hours ago', function (t) {
        var rtTime = RelativeTime.millisSinceEpoch('24 hours ago', now);
        t.equal(now - rtTime, 1000 * 60 * 60 * 24,
                '24 hours ago isn\'t 24 hours ago.');
        t.end();
});


test('test: N day ago', function (t) {
        var rtTime = RelativeTime.millisSinceEpoch('7 day ago', now);
        t.equal(now - rtTime, 1000 * 60 * 60 * 24 * 7,
                '7 day ago isn\'t 7 days ago.');
        t.end();
});


test('test: N days ago', function (t) {
        var rtTime = RelativeTime.millisSinceEpoch('32 day ago', now);
        t.equal(now - rtTime, 1000 * 60 * 60 * 24 * 32,
                '32 day ago isn\'t 32 days ago');
        t.end();
});


test('test: N week ago', function (t) {
        var rtTime = RelativeTime.millisSinceEpoch('1 week ago', now);
        t.equal(now - rtTime, 1000 * 60 * 60 * 24 * 7,
                '1 week ago isn\'t one week ago.');
        t.end();
});


test('test: N weeks ago', function (t) {
        var rtTime = RelativeTime.millisSinceEpoch('5 weeks ago', now);
        t.equal(now - rtTime, 1000 * 60 * 60 * 24 * 7 * 5,
                '5 weeks ago isn\'t 5 weeks ago.');
        t.end();
});


test('test: N month ago', function (t) {
        var testNow = new Date('2012/10/01 19:01:12');
        var then = new Date('2012/06/01 19:01:12');
        var rtTime = RelativeTime.millisSinceEpoch('4 month ago', testNow);
        t.equal(then.getTime(), rtTime,
                '4 month ago isn\'t 4 months ago.');
        t.end();
});


test('test: N months ago', function (t) {
        var testNow = new Date('2012/10/01 19:01:12');
        var then = new Date('2012/02/01 19:01:12');
        var rtTime = RelativeTime.millisSinceEpoch('8 months ago', testNow);
        t.equal(then.getTime(), rtTime,
                '8 months ago isn\'t 8 months ago.');
        t.end();
});


test('test: N months ago, past year boundary', function (t) {
        var testNow = new Date('2012/10/01 19:01:12');
        var then = new Date('2011/05/01 19:01:12');
        var rtTime = RelativeTime.millisSinceEpoch('17 months ago', testNow);
        t.equal(then.getTime(), rtTime,
                '17 months ago isn\'t 17 months ago.');
        t.end();
});


test('test: N months ago, on year boundary, positive', function (t) {
        var testNow = new Date('2012/10/01 00:00:00');
        var then = new Date('2011/01/01 00:00:00');
        var rtTime = RelativeTime.millisSinceEpoch('21 months ago', testNow);
        t.equal(then.getTime(), rtTime,
                '21 months ago isn\'t 21 months ago.');
        t.end();
});


test('test: N months ago, on year boundary, negative', function (t) {
        var testNow = new Date('2012/10/31 23:59:59');
        var then = new Date('2010/12/31 23:59:59');
        var rtTime = RelativeTime.millisSinceEpoch('22 months ago', testNow);
        t.equal(then.getTime(), rtTime,
                '22 months ago isn\'t 22 months ago.');
        t.end();
});


test('test: N months ago, offset ends of months', function (t) {
        var testNow = new Date('2012/10/31 00:00:00');
        var then = new Date('2012/07/01 00:00:00');
        var rtTime = RelativeTime.millisSinceEpoch('4 months ago', testNow);
        t.equal(then.getTime(), rtTime,
                '4 months ago isn\'t 4 months ago.');
        t.end();
});


test('test: N months ago, large', function (t) {
        var testNow = new Date('2012/10/19 00:00:00');
        var then = new Date('1991/10/19 00:00:00');
        var rtTime = RelativeTime.millisSinceEpoch('252 months ago', testNow);
        t.equal(then.getTime(), rtTime,
                '252 months ago isn\'t 252 months ago.');
        t.end();
});


test('test: N year ago', function (t) {
        var testNow = new Date('2012/10/19 00:00:00');
        var then = new Date('1991/10/19 00:00:00');
        var rtTime = RelativeTime.millisSinceEpoch('21 year ago', testNow);
        t.equal(then.getTime(), rtTime,
                '21 year ago isn\'t 21 years ago.');
        t.end();
});


test('test: N years ago', function (t) {
        var testNow = new Date('2012/10/19 00:00:00');
        var then = new Date('1996/10/19 00:00:00');
        var rtTime = RelativeTime.millisSinceEpoch('16 year ago', testNow);
        t.equal(then.getTime(), rtTime,
                '16 years ago isn\'t 16 years ago.');
        t.end();
});


test('test: 1 year ago', function (t) {
        var testNow = new Date('2012/10/19 00:00:00');
        var then = new Date('2011/10/19 00:00:00');
        var rtTime = RelativeTime.millisSinceEpoch('1 year ago', testNow);
        t.equal(then.getTime(), rtTime,
                '1 year ago isn\'t 1 years ago.');
        t.end();
});


test('test: N years ago, leap year boundary', function (t) {
        var testNow = new Date('2012/02/29 00:00:00');
        var then = new Date('2011/03/01 00:00:00');
        var rtTime = RelativeTime.millisSinceEpoch('1 year ago', testNow);
        t.equal(then.getTime(), rtTime,
                '1 year ago isn\'t 1 year ago.');
        t.end();
});


test('test: junk', function (t) {
        var rtTime = RelativeTime.millisSinceEpoch('junk', now);
        t.equal(null, rtTime, 'Junk didn\'t cause null');
        t.end();
});


test('test: junk ago', function (t) {
        var rtTime = RelativeTime.millisSinceEpoch('junk', now);
        t.equal(null, rtTime, 'Junk didn\'t cause null');
        t.end();
});


test('test: N junk ago', function (t) {
        var rtTime = RelativeTime.millisSinceEpoch('5 junk ago', now);
        t.equal(null, rtTime, 'Junk didn\'t cause null');
        t.end();
});


test('test: N junks ago', function (t) {
        var rtTime = RelativeTime.millisSinceEpoch('5 junks ago', now);
        t.equal(null, rtTime, 'Junks didn\'t cause null');
        t.end();
});


test('test: junk junk ago', function (t) {
        var rtTime = RelativeTime.millisSinceEpoch('junk junk ago', now);
        t.equal(null, rtTime, 'Junk didn\'t cause null');
        t.end();
});


test('test: junk days ago', function (t) {
        var rtTime = RelativeTime.millisSinceEpoch('junk days ago', now);
        t.equal(null, rtTime, 'Junk didn\'t cause null');
        t.end();
});



//--- Unix Time

test('test: unix time: N hours ago', function (t) {
        var rtTimeUnix = RelativeTime.unixTime('24 hours ago', now);
        var rtTimeMillis = RelativeTime.millisSinceEpoch('24 hours ago', now);
        t.equal(Math.round(now / 1000) - rtTimeUnix, 60 * 60 * 24,
                '24 hours ago isn\'t 24 hours ago, unix time.');
        t.ok((rtTimeMillis - (rtTimeUnix * 1000)) < 1000,
             '24 hours unix ime vs milliseconds since epoch.');
        t.end();
});


test('test: unix time: junk days ago', function (t) {
        var rtTime = RelativeTime.unixTime('junk days ago', now);
        t.equal(null, rtTime, 'Junk didn\'t cause null, unix time');
        t.end();
});
