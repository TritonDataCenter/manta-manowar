// Copyright (c) 2012, Joyent, Inc. All rights reserved.

var bunyan = require('bunyan');
var express = require('express');
var fs = require('fs');
var manta = require('manta');
var url = require('url');
var util = require('util');



//--- Globals

var DEFAULT_PORT = 8080;
var LOG = bunyan.createLogger({
        level: (process.env.LOG_LEVEL || 'debug'),
        name: 'manowar',
        stream: process.stdout
});
var MANTA_CONFIG_FILE = (process.env.MANTA_CONFIG ||
                         '/opt/smartdc/common/etc/config.json');
//It would be nice to just instantiate a manta client from the config and
// ask the client to sign a url, but that's blocked on MANTA-564
var MANTA_CONFIG = JSON.parse(fs.readFileSync(MANTA_CONFIG_FILE, 'utf8'));
var MANTA_KEY = fs.readFileSync(MANTA_CONFIG.manta.sign.key, 'utf8');
var MANTA_KEY_ID = MANTA_CONFIG.manta.sign.keyId;
var MANTA_URL = MANTA_CONFIG.manta.url;
var MANTA_HOST = MANTA_URL.replace(/^http.?:\/\//, '');
var MANTA_USER = MANTA_CONFIG.manta.user;
var ALGORITHM = / DSA /.test(MANTA_KEY) ? 'DSA-SHA1' : 'RSA-SHA256';
var SIGN = manta.privateKeySigner({
        key: MANTA_KEY,
        keyId: MANTA_KEY_ID,
        log: LOG,
        user: MANTA_USER
});

//And even after all ^^, we still need a manta client.  We read from the
// file again so that we can delete ^^ once MANTA-564 is done.
var MANTA_CLIENT = manta.createClientFromFileSync(MANTA_CONFIG_FILE, LOG);

var EXPIRES_SECONDS = 300; //5 minutes
var VALID_PATH_PREFIXES = [
        '/graphs/data/',
        '/graphs/dashboards/'
];

var CORS_OPTS = {
        headers: {
                'access-control-allow-origin': '*'
        }
};



//--- Helpers

function getSignedUrl(host, path, cb) {
        var expires = (new Date()).getTime() + (EXPIRES_SECONDS * 1000);
        var opts = {
                algorithm: ALGORITHM,
                expires: expires,
                keyId: MANTA_KEY_ID,
                user: MANTA_USER,
                host: host,
                method: 'GET',
                path: path,
                sign: SIGN,
                log: LOG
        };

        manta.signUrl(opts, cb);
}


function makeDirs(validatedUrl, cb) {
        //$MANTA_USER/stor/graphs shouldn't have CORS headers.
        var rootDir = '/' + validatedUrl.urlParts.slice(2, 5).join('/');
        LOG.debug({ rootDir: rootDir }, 'making root dir');
        MANTA_CLIENT.mkdir(rootDir, function (err) {
                if (err) {
                        cb(err);
                        return;
                }

                var dir = '/' + validatedUrl.urlParts.slice(2, 7).join('/');
                LOG.debug({ dir: dir }, 'making other dirs');
                MANTA_CLIENT.mkdirp(dir, CORS_OPTS, function (err2) {
                        cb(err2);
                });
        });
}


function validateUrl(reqUrl) {
        var urlObj = url.parse(reqUrl, true);
        var urlPath = urlObj.pathname;
        var urlParts = urlPath.split('/');
        LOG.info({ url: urlObj, parts: urlParts },
                 'Validating url.');

        //Check user and path
        var sentUser = urlParts[2];
        if (sentUser !== MANTA_USER || urlParts[3] !== 'stor') {
                return ({ valid: false,
                          code: 403,
                          message: sentUser + ' is an invalid manta user.'
                       });
        }

        var relativePath = '/' + urlParts.slice(4).join('/');
        LOG.info({ relativePath: relativePath }, 'Checking relative path.');

        //Verify that the path has been whitelisted.
        var valid = false;
        for (var i in VALID_PATH_PREFIXES) {
                var prefix = VALID_PATH_PREFIXES[i];
                if (relativePath.slice(0, prefix.length) === prefix) {
                        valid = true;
                        break;
                }
        }

        if (!valid) {
                return ({ valid: false,
                          code: 403,
                          message: reqUrl + ' is forbidden.'
                       });
        }

        return ({ valid: true,
                  urlObj: urlObj,
                  urlPath: urlPath,
                  urlParts: urlParts,
                  relativePath: relativePath
                });
}



//--- Handlers

function handleConfigRequest(req, res) {
        res.send(JSON.stringify({
                url: MANTA_URL,
                user: MANTA_USER
        }));
}


// /sign/$MANTA_USER/stor/graphs/data/...
function handleSignRequest(req, res) {
        var validatedUrl = validateUrl(req.url);

        if (!validatedUrl.valid) {
                res.send(validatedUrl.code, validatedUrl.message);
                return;
        }

        //Hostname that the client is using to connect to manta can be sent
        // in a query parameter.
        var query = validatedUrl.urlObj.query;
        var host = query.host || MANTA_HOST;


        var fullPath = '/' + validatedUrl.urlParts.slice(2).join('/');

        //Sign what they want and return.
        getSignedUrl(host, fullPath, function (err, resource) {
                if (err) {
                        res.send(500, err);
                        return;
                }
                var mantaUrl = 'https://' + host + resource;
                res.send(mantaUrl);
        });
}


// /save/$MANTA_USER/stor/graphs/dashboards/[group]/[name]
function handleSaveRequest(req, res) {
        var validatedUrl = validateUrl(req.url);

        if (!validatedUrl.valid) {
                res.send(validatedUrl.code, validatedUrl.message);
                return;
        }

        var urlParts = validatedUrl.urlParts;
        if (urlParts[5] !== 'dashboards') {
                res.send(403, validatedUrl.relativePath + ' is invalid: ' +
                         'not saving to anywhere but \'dashboards\'.');
                return;
        }

        if (urlParts.length < 7 || urlParts[6] === '') {
                res.send(403, validatedUrl.relativePath + ' is invalid: ' +
                         'missing graph group.');
                return;
        }

        // Uploading will resume later in the manta client.
        req.pause();

        function endRequest(err) {
                if (err) {
                        LOG.error(err);
                        res.send(500, 'Error processing ' + req.url);
                        return;
                }
                res.send(200, 'Ok.');
        }

        function uploadObject(err) {
                if (err) {
                        res.send(500, 'Unable to create requested ' +
                                 'directories.');
                        return;
                }

                var dobj = '/' + validatedUrl.urlParts.slice(2, 8).join('/');
                LOG.info({ object: dobj }, 'putting object');
                MANTA_CLIENT.put(dobj, req, CORS_OPTS, endRequest);
        }

        var next = endRequest;
        if (urlParts.length === 8 && urlParts[7] !== '') {
                next = uploadObject;
        }

        makeDirs(validatedUrl, next);

        req.on('error', function (err) {
                LOG.error(err, 'error on save request');
                res.send(500, 'Internal error');
        });
}


// /delete/$MANTA_USER/stor/graphs/dashboards/[group]/[name]
function handleDeleteRequest(req, res) {
        var validatedUrl = validateUrl(req.url);

        if (!validatedUrl.valid) {
                res.send(validatedUrl.code, validatedUrl.message);
                return;
        }

        var urlParts = validatedUrl.urlParts;
        if (urlParts[5] !== 'dashboards') {
                res.send(403, validatedUrl.relativePath + ' is invalid: ' +
                         'not saving to anywhere but \'dashboards\'.');
                return;
        }

        if (urlParts.length !== 8 || urlParts[6] === '' || urlParts[7] === '') {
                res.send(403, validatedUrl.relativePath + ' is invalid: ' +
                         'missing graph group and/or name.');
                return;
        }

        var dobj = '/' + validatedUrl.urlParts.slice(2, 8).join('/');
        LOG.info({ object: dobj }, 'deleting object');
        MANTA_CLIENT.unlink(dobj, {}, function (err) {
                if (err && err.code !== 'ResourceNotFound') {
                        LOG.error(err);
                        res.send(500, 'Error processing ' + req.url);
                        return;
                }
                res.send(200, 'Ok.');
        });
}


function audit(req, res, next) {
        var start = (new Date()).getTime();
        res.on('finish', function () {
                var end = (new Date()).getTime();
                var remoteAddress = req.socket &&
                        (req.socket.remoteAddress ||
                         (req.socket.socket &&
                          req.socket.socket.remoteAddress));
                var aobj = {
                        audit: true,
                        method: req.method,
                        url: req.url,
                        start: start,
                        latency: end - start,
                        statusCode: res.statusCode,
                        remoteAddress: remoteAddress,
                        headers: req.headers
                };
                LOG.info(aobj, 'audit');
        });
        next();
}



//--- Main

var port = parseInt(process.argv[2], 10) || DEFAULT_PORT;

var app = express();

//Audit
app.use(audit);

//Route first to config
app.get('/config', handleConfigRequest);

//Route to the ajaxy parts
app.get('/sign/*', handleSignRequest);
app.post('/save/*', handleSaveRequest);
app.post('/delete/*', handleDeleteRequest);

//Route everything else to the static directory.
app.use(express.static(__dirname + '/static'));

LOG.info({ port: port }, 'Starting server...');

app.listen(port);
