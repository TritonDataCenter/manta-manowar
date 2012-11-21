#!/usr/node/bin/node

var mod_assert = require('assert');
var mod_carrier = require('carrier');
var mod_child_process = require('child_process');
var mod_crypto = require('crypto');
var mod_getopt = require('posix-getopt');

/*
 * msplit-json-time: demux streams to send to multiple reducers
 */
var msUsageMessage = [
        'usage: msplit-json-time.js [-n number_of_reducers] [-f field] [-p period]',
        '',
        'msplit-json-time is used to split a stream of json objects into many',
        'mpipes, one per the number of reducers for your job.  The -n option',
        'specifies the number of reducers your job has and must match the',
        'number of reducers for the next phase of your job.',
        '',
        'The -f option is also required and specifies the field in the json',
        'that contains the time field.  If the time field isnt found in the',
        'the process will error and exit.',
        '',
        'The -p option is not required and defaults to 60 seconds.  It',
        'specifies the bucket period to that all times within the same period',
        'will go to the same reducer.',
        '',
        'For example, to demux streams of the following object:',
        '',
        '    { "time": "2012-11-04T12:04:31", "latency": 10, ... }',
        '',
        'Bucketizing to 5 minutes, and sending to 4 reducers:',
        '',
        '... | msplit-json-time -f time -p 300'
].join('\n');

var msCreateFunction = createReducerPipe;
var msField = null;
var msHashAlgo = 'md5';
var msPeriod = 60;
var msPipes = [];
var msNumReducers = null;

function main() {
        var carrier;
        var i = 0;
        var option;
        var parser;

        parser = new mod_getopt.BasicParser('f:n:p:t', process.argv);

        while ((option = parser.getopt()) !== undefined) {
                switch (option.option) {
                case 'f':
                        msField = option.optarg;
                        break;

                case 'n':
                        msNumReducers = parseInt(option.optarg, 10);
                        if (isNaN(msNumReducers)) {
                                console.error('invalid number of reducers');
                                usage();
                        }
                        break;

                case 'p':
                        msPeriod = parseInt(option.optarg, 10);
                        if (isNaN(msPeriod)) {
                                console.error('invalid period');
                                usage();
                        }
                        break;

                case 't':
                        msCreateFunction = createFilePipe;
                        break;

                default:
                        /* error message already emitted by getopt */
                        mod_assert.equal('?', option.option);
                        usage();
                        break;
                }
        }

        if (!msNumReducers) {
                console.error('Number of reducers must be specified.');
                usage();
        }

        if (!msField) {
                console.error('Field must be specified.');
                usage();
        }

        // Pipes
        for (i = 0; i < msNumReducers; ++i) {
                var spawn = msCreateFunction(i);
                msPipes.push(spawn);
        }

        // Carrier takes care of the rest
        carrier = mod_carrier.carry(process.stdin);

        carrier.on('line', function (line) {
                var r = selectReducer(line, msField, msPeriod, msNumReducers);
                msPipes[r].stdin.write(line + '\n');
        });

        carrier.on('end', function () {
                for (i = 0; i < msNumReducers; ++i) {
                        msPipes[i].stdin.end();
                }
        });

        process.stdin.resume();
}

function selectReducer(line, field, period, nReducers) {
        var obj = null;
        try {
                obj = JSON.parse(line);
        } catch (err) {
                if (err) {
                        msFatal(err.message);
                }
        }

        //Walk down the '.'s to find the timeString
        var fieldParts = field.split('.');
        var timeString = obj;
        for (var i = 0; i < fieldParts.length; ++i) {
                if (!timeString[fieldParts[i]]) {
                        msFatal('Could not find field ' + field + ' in line ' +
                                line);
                }
                timeString = timeString[fieldParts[i]];
        }

        //Parse as date and check validity
        if ((typeof timeString) !== 'string') {
                msFatal('Field ' + field + ' in line ' +
                        line + ' is not a string.');
        }

        var date = new Date(timeString);
        if (Object.prototype.toString.call(date) !== '[object Date]' ||
            isNaN(date.getTime())) {
                msFatal('Field ' + field + ' in line ' +
                        line + ' cannot be parsed as a date.');
        }

        var t = date.getTime();
        var key = '' + (t - (t % (period * 1000)));

        var hash = mod_crypto.createHash(msHashAlgo);
        hash.update(key);
        var digest = hash.digest('hex');
        var digestNumber = parseInt(digest.substr(0, 8), 16);
        return (digestNumber % nReducers);
}

function createReducerPipe(reducer) {
        return (mod_child_process.spawn('mpipe', ['-r', reducer]));
}

function createFilePipe(reducer) {
        return (mod_child_process.spawn('tee', ['/tmp/msj-test.' + reducer]));
}

function usage()
{
        console.error(msUsageMessage);
        process.exit(2);
}

function msFatal(message)
{
        console.error('msplit-json-time: ' + message);
        process.exit(1);
}

main();
