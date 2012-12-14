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

var EXPIRES_SECONDS = 300; //5 minutes
var VALID_PATH_PREFIXES = [
        '/graphs/data/'
];



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


//--- Handlers

function handleConfigRequest(req, res) {
        res.send(JSON.stringify({
                url: MANTA_URL,
                user: MANTA_USER
        }));
}


function handleSignRequest(req, res) {
        var urlObj = url.parse(req.url, true);
        var urlPath = urlObj.pathname;

        //Hostname that the client is using to connect to manta can be sent
        // in a query parameter.
        var query = urlObj.query;
        var host = query.host || MANTA_HOST;

        var urlParts = urlPath.split('/');
        LOG.info({ url: req.url, parts: urlParts, query: query },
                 'Processing url.');

        //console.log(util.inspect(req));

        //Check user and path
        var sentUser = urlParts[2];
        if (sentUser !== MANTA_USER || urlParts[3] !== 'stor') {
                res.send(403, sentUser + ' is invalid.');
                return;
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
                res.send(403, req.url + ' is forbidden.');
                return;
        }

        var fullPath = '/' + urlParts.slice(2).join('/');

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

//Route second to the ajaxy part
app.get('/sign/*', handleSignRequest);

//Route everything else to the static directory.
app.use(express.static(__dirname + '/static'));

LOG.info({ port: port }, 'Starting server...');

app.listen(port);
