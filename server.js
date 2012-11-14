// Copyright (c) 2012, Joyent, Inc. All rights reserved.

var bunyan = require('bunyan');
var express = require('express');
var fs = require('fs');
var manta = require('manta');
var util = require('util');



//--- Globals

var DEFAULT_PORT = 8080;
var LOG = bunyan.createLogger({
        level: (process.env.LOG_LEVEL || 'info'),
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
var MANTA_USER = MANTA_CONFIG.manta.user;
var ALGORITHM = / DSA /.test(MANTA_KEY) ? 'DSA-SHA1' : 'RSA-SHA256';
var SIGN = manta.privateKeySigner({
        key: MANTA_KEY,
        keyId: MANTA_KEY_ID,
        log: LOG,
        user: MANTA_USER
});

var EXPIRES = 300; //5 minutes
var VALID_PATH_PREFIXES = [
        '/graph_data/'
];



//--- Helpers

function getSignedUrl(path, cb) {
        var opts = {
                algorithm: ALGORITHM,
                expires: EXPIRES,
                keyId: MANTA_KEY_ID,
                user: MANTA_USER,
                method: 'GET',
                path: path,
                sign: SIGN
        };

        manta.signUrl(opts, cb);
}



//--- Main

var port = parseInt(process.argv[2], 10) || DEFAULT_PORT;

var app = express();

//Route first to the ajaxy part
app.get('/sign/*', function (req, res) {
        var urlParts = req.url.split('/');
        LOG.info({ url: req.url }, 'Processing url.');

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
        getSignedUrl(fullPath, function (err, resource) {
                if (err) {
                        res.send(500, err);
                        return;
                }
                res.send(MANTA_URL + resource);
        });
});

//Route everything else to the static directory.
app.use(express.static(__dirname + '/static'));

LOG.info({ port: port }, 'Starting server...');

app.listen(port);
