#!/usr/bin/env node
// -*- mode: js -*-
// Copyright (c) 2012, Joyent, Inc. All rights reserved.

var assert = require('assert-plus');
var bunyan = require('bunyan');
var fs = require('fs');
var getopt = require('posix-getopt');
var lib = require('../lib');
var manta = require('manta');
var MemoryStream = require('memorystream');
var path = require('path');
var sys = require('sys');



///--- Global Objects

var NAME = 'manowar';
var LOG = bunyan.createLogger({
        level: (process.env.LOG_LEVEL || 'info'),
        name: NAME,
        stream: process.stdout
});
var MANTA_CONFIG_FILE = (process.env.MANTA_CONFIG ||
                         '/opt/smartdc/common/etc/config.json');
var MANTA_CLIENT = manta.createClientFromFileSync(MANTA_CONFIG_FILE, LOG);
var MANTA_USER = MANTA_CLIENT.user;
var MANOWAR_CONFIG_FILE = (process.env.MANOWAR_CONFIG ||
                           '/opt/smartdc/manowar/etc/config.json');



///--- Global Strings

var MP = '/' + MANTA_USER + '/stor';
var MANOWAR_CODE_BUNDLE = (process.env.MANOWAR_CODE_BUNDLE ||
                        '/opt/smartdc/common/bundle/manowar.tar.gz');
var JOB_PREFIX = 'graphs-';
var MANTA_LOG_DIR = MP + '/logs';
var MANOWAR_MANTA_DIR = MP + '/graphs';
var MANOWAR_DATA_DIR = MANOWAR_MANTA_DIR + '/data';
var MANOWAR_PROCESSED_DIR = MANOWAR_MANTA_DIR + '/processed';
var MANOWAR_ASSET_DIR = MANOWAR_MANTA_DIR + '/assets';
var MANOWAR_ASSET_KEY = MANOWAR_ASSET_DIR + '/manowar.tar.gz';
var RUNNING_STATE = 'running';

//In Marlin
var MARLIN_PATH_TO_ASSET = MANOWAR_ASSET_KEY.substring(1);
var MARLIN_ASSET_KEY = MANOWAR_ASSET_KEY;



///--- Marlin Commands

/* BEGIN JSSTYLED */
var ENV_COMMON = 'export PATH=/usr/node/bin:$PATH && \
export MANTA_USER=' + MANTA_USER + ' && \
export MARLIN_JOB=$(echo $MANTA_OUTPUT_BASE | cut -d "/" -f 4) && \
export NOW=$(date "+%Y-%m-%d-%H-%M-%S") && \
cd /assets/ && tar -xzf ' + MARLIN_PATH_TO_ASSET + ' && cd manowar && \
';
/* END JSSTYLED */



///--- Helpers

/* BEGIN JSSTYLED */
function getMapCmd(nReducers, period) {
        return (ENV_COMMON + ' \
bzcat | grep "^{" | bunyan -o json-0 -c "this.audit === true" | \
  node ./bin/msplit-json-time.js -n ' + nReducers + ' -f time \
    -p ' + period + ' \
');
}
/* END JSSTYLED */


/* BEGIN JSSTYLED */
function getFirstReduceCmd(fields, period) {
        var fds = '';
        for (var i = 0; i < fields.length; ++i) {
                fds += '-f "' + fields[i] + '" ';
        }
        return (ENV_COMMON + ' \
node ./bin/stream-metrics.js -p ' + period + ' -t time ' + fds + ' \
');
}
/* END JSSTYLED */


/* BEGIN JSSTYLED */
function getSecondReduceCmd(outputObject) {
        return (ENV_COMMON + ' \
node ./bin/merge-metrics.js | \
  mpipe -H \'Access-Control-Allow-Origin: *\' ' + outputObject + ' \
');
}
/* END JSSTYLED */


function ifError(err, msg) {
        if (err) {
                LOG.error(err, msg);
                process.exit(1);
        }
}


function getObjectsInDir(dir, cb) {
        var keys = [];
        MANTA_CLIENT.ls(dir, {}, function (err, res) {
                ifError(err);

                res.on('object', function (obj) {
                        keys.push(dir + '/' + obj.name);
                });

                res.once('error', function (err2) {
                        cb(err2);
                });

                res.once('end', function () {
                        cb(null, keys);
                });
        });
}


function getObject(objectPath, cb) {
        var res = '';
        MANTA_CLIENT.get(objectPath, {}, function (err, stream) {
                if (err) {
                        cb(err);
                        return;
                }

                stream.on('error', function (err1) {
                        cb(err1);
                        return;
                });

                stream.on('data', function (data) {
                        res += data;
                });

                stream.on('end', function () {
                        cb(null, res);
                });
        });
}


//This is a bit janky... if you know if a better way to get the iso parts
// from millis from the epoch, please let me know.
function getIsoParts(millis) {
        assert.number(millis);
        var s = (new Date(millis)).toISOString();
        s = s.replace('Z', '');
        var ps = s.split('T');
        var pd = ps[0].split('-');
        var pt = ps[1].split(':');
        return ({
                year: pd[0],
                month: pd[1],
                day: pd[2],
                hour: pt[0],
                minute: pt[1],
                second: pt[2]
        });
}


function arraysEqual(a1, a2) {
        if (a1.length !== a2.length) {
                return (false);
        }
        for (var i = 0; i < a1.length; ++i) {
                if (a1[i] !== a2[i]) {
                        return (false);
                }
        }
        return (true);
}


function createDataGenMarlinJob(opts, cb) {
        var nReducers = 1; //TODO: Should be based on the number of files...
        var map = getMapCmd(nReducers, opts.period);
        var r1 = getFirstReduceCmd(opts.fields, opts.period);
        var r2 = getSecondReduceCmd(opts.outputObject);
        var job = {
                name: opts.jobName,
                phases: [ {
                        type: 'storage-map',
                        assets: [ MARLIN_ASSET_KEY ],
                        exec: map
                }, {
                        type: 'reduce',
                        count: nReducers,
                        assets: [ MARLIN_ASSET_KEY ],
                        exec: r1
                }, {
                        type: 'reduce',
                        count: 1,
                        assets: [ MARLIN_ASSET_KEY ],
                        exec: r2
                } ]
        };

        LOG.info({ job: job }, 'Marlin Job Definition');

        MANTA_CLIENT.createJob(job, function (err, jobId) {
                ifError(err);

                LOG.info({ jobId: jobId }, 'Created Job.');
                var aopts = {
                        end: true
                };
                var objs = opts.objects;

                //Add keys to job...
                MANTA_CLIENT.addJobKey(jobId, objs, aopts, function (err2) {
                        ifError(err2);

                        LOG.info({
                                objs: objs,
                                jobId: jobId
                        }, 'Added keys to job');
                        cb(null, jobId);
                });
        });
}


function createOutputDirs(opts, cb) {
        assert.string(opts.outputDir);
        assert.string(opts.recordPath);

        var mopts = {
                headers: {
                        'Access-Control-Allow-Origin': '*'
                }
        };
        //The output dir should have CORS, but nothing else.
        MANTA_CLIENT.mkdirp(opts.outputDir, mopts, function (err) {
                if (err) {
                        cb(err);
                        return;
                }

                MANTA_CLIENT.mkdirp(opts.recordPath, function (err2) {
                        if (err2) {
                                cb(err2);
                                return;
                        }
                        cb();
                });
        });

}


function createLogProcessingJobAndRecord(opts, cb) {
        assert.string(opts.service);
        assert.string(opts.hourPath);
        assert.number(opts.period);
        assert.arrayOfString(opts.objects);
        assert.arrayOfString(opts.fields);

        var service = opts.service;
        var hourPath = opts.hourPath;

        //Add other, relevant job information....
        opts.outputDir = MANOWAR_DATA_DIR + '/' + service + hourPath;
        opts.outputObject = opts.outputDir + '/' + opts.period + '.data';
        opts.jobName = JOB_PREFIX + service + hourPath;

        LOG.info({ opts: opts }, 'setting up log processing job');

        //Make sure output dirs exist, create them if not...
        createOutputDirs(opts, function (err) {
                ifError(err, 'Error creating output directories');

                createDataGenMarlinJob(opts, function (err2, jobId) {
                        ifError(err2);

                        //Record the job information in Manta...
                        opts.jobId = jobId;
                        var recordString = JSON.stringify(opts);
                        var o = { size: Buffer.byteLength(recordString) };
                        var s = new MemoryStream();
                        var ro = opts.recordObject;

                        MANTA_CLIENT.put(ro, s, o, function (err3) {
                                cb(err3);
                        });

                        process.nextTick(function () {
                                s.write(recordString);
                                s.end();
                        });
                });
        });
}


function makeServiceJob(opts, cb) {
        assert.string(opts.service);
        assert.string(opts.hourPath);

        var service = opts.service;
        var hourPath = opts.hourPath;

        //Get all logs
        var mpath = MANTA_LOG_DIR + '/' + service + hourPath;

        getObjectsInDir(mpath, function (err, objs) {
                if (err && err.code === 'ResourceNotFound') {
                        LOG.info({ path: mpath },
                                 'path doesnt exist.  continuing...');
                        cb();
                        return;
                } else if (err) {
                        cb(err);
                        return;
                }

                //Get the list of files...
                opts.recordPath = MANOWAR_PROCESSED_DIR + '/' + service +
                        hourPath;
                opts.recordObject = opts.recordPath + '/job_info.json';
                opts.objects = objs;
                opts.objects.sort();

                //See what logs have been processed
                getObject(opts.recordObject, function (err1, data) {
                        if (err1 && err1.code !== 'ResourceNotFound') {
                                cb(err1);
                        }

                        var jobInfo = {};
                        if (data) {
                                jobInfo = JSON.parse(data);
                        }

                        //Kick out if the same set of files was already
                        // processed.
                        if (jobInfo.objects &&
                            arraysEqual(jobInfo.objects, opts.objects)) {
                                LOG.info({
                                        opts: opts
                                }, 'Already processed set of objects.' +
                                         '  continuing...');
                                cb();
                                return;
                        }

                        //Now kick off a job to process the files...
                        createLogProcessingJobAndRecord(opts, function (err2) {
                                cb(err2);
                        });
                });

        });
}


function startJobs(config) {
        for (var service in config.services) {
                var fields = config.services[service];
                LOG.info({ service: service, fields: fields },
                         'getting jobs going for service');

                for (var i = 0; i < config.hourPaths.length; ++i) {
                        var hourPath = config.hourPaths[i];
                        makeServiceJob({
                                service: service,
                                hourPath: hourPath,
                                fields: fields,
                                period: 60
                        }, function (err) {
                                ifError(err, 'Error making service job for ' +
                                        ' service: ' + service +
                                        ' using path: ' + hourPath);
                        });
                }
        }
}


function parseOptions() {
        var option;
        var opts = {};
        opts.hourPaths = [];
        var parser = new getopt.BasicParser('s:p:',
                                            process.argv);
        while ((option = parser.getopt()) !== undefined && !option.error) {
                switch (option.option) {
                case 'p':
                        var hps = option.optarg.split('/');
                        var usageMsg = 'Hour parts must be in the format: ' +
                                '/[year]/[month]/[day]/[hour]';
                        if (hps.length !== 5 || hps[0] !== '') {
                                usage(usageMsg);
                                break;
                        }
                        for (var i = 1; i < hps.length; ++i) {
                                if (isNaN(parseInt(hps[i], 10))) {
                                        usage(usageMsg);
                                        break;
                                }
                        }
                        opts.hourPaths.push(option.optarg);
                        break;
                case 's':
                        opts.service = option.optarg;
                        break;
                default:
                        usage('Unknown option: ' + option.option);
                        break;
                }
        }
        return (opts);
}


function usage(msg) {
        if (msg) {
                console.error(msg);
        }
        var str  = 'usage: ' + path.basename(process.argv[1]);
        str += ' -s [service] -p [hour path (ie /2012/11/05/10)]';
        console.error(str);
        process.exit(1);
}



///--- Main

var _opts = parseOptions();
var _config = null;
try {
        var configString = fs.readFileSync(MANOWAR_CONFIG_FILE);
        _config = JSON.parse(configString);
} catch (_err) {
        LOG.error(_err, 'Config file does not exist or cannot be read.');
        process.exit(1);
}

//Pull out only the service if it was specified...
if (_opts.service) {
        var _name = _opts.service;
        if (!_config.services[_name]) {
                LOG.error({ serviceName: _name },
                          'given service name doesnt exist in config.  ' +
                          'exiting...');
                process.exit(1);
        }
        var newServices = {};
        newServices[_name] = _config.services[_name];
        _config.services = newServices;
}

//Compute the last n hours only if the paths weren't specified on the command
// line
if (_opts.hourPaths.length > 0) {
        _config.hourPaths = _opts.hourPaths;
} else {
        //Figure out directories for the last n hours...
        var _hourPaths = [];
        var _hoursToScan = _config.past_hours_to_scan || 2;
        var _millis = (new Date()).getTime();
        for (var _i = 0; _i < _hoursToScan; ++_i) {
                var _iso = getIsoParts(_millis);
                var _p = '/' + _iso.year + '/' + _iso.month + '/' + _iso.day +
                        '/' + _iso.hour;
                _hourPaths.push(_p);
                _millis -= 3600000; //1 hour
        }
        LOG.info({ hoursToScan: _hoursToScan, hourPaths: _hourPaths },
                 'scanning past hours');
        _config.hourPaths = _hourPaths;
}
LOG.info({ hourPaths: _hourPaths }, 'scanning past hours');

//First upload the bundle, then kick off the jobs...
MANTA_CLIENT.mkdirp(MANOWAR_ASSET_DIR, function (_err) {
        ifError(_err);

        //Upload the bundle to manta
        fs.stat(MANOWAR_CODE_BUNDLE, function (_err2, stats) {
                ifError(_err2);

                if (!stats.isFile()) {
                        LOG.error(MANOWAR_CODE_BUNDLE +
                                      ' isnt a file');
                        process.exit(1);
                }

                var o = {
                        copies: 2,
                        size: stats.size
                };

                var s = fs.createReadStream(MANOWAR_CODE_BUNDLE);
                var p = MANOWAR_ASSET_KEY;
                s.pause();
                s.on('open', function () {
                        MANTA_CLIENT.put(p, s, o, function (_e) {
                                ifError(_e);
                                LOG.info({ obj: MANOWAR_CODE_BUNDLE },
                                         'uploaded asset bundle');
                                startJobs(_config);
                        });
                });
        });
});
