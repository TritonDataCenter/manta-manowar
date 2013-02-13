# Man O' War

Repository: <git@git.joyent.com:manowar.git>
Browsing: <https://mo.joyent.com/manowar>
Who: Nate Fitch
Docs: <https://mo.joyent.com/docs/manowar>
Tickets/bugs: <https://devhub.joyent.com/jira/browse/MANTA>


# Overview

Man O' War is the ops dashboard repository.  It contains the server for
presigning URLs, the code to run as Marlin jobs to crunch logs and the webapp
for dashboards.  See docs/index.restdown for more information.

# Repository

    deps/           Git submodules and/or committed 3rd-party deps should go
                    here. See "node_modules/" for node.js deps.
    docs/           Project docs (restdown)
    lib/            Source files.
    node_modules/   Node.js deps, either populated at build time or committed.
                    See Managing Dependencies.
    pkg/            Package lifecycle scripts
    test/           Test suite (using node-tap)
    tools/          Miscellaneous dev/upgrade/deployment tools and data.
    Makefile
    package.json    npm module info (holds the project version)
    README.md


# Development

To run the manowar server:

    git clone git@git.joyent.com:eng.git
    cd eng
    git submodule update --init
    make all
    node server.js

To update the guidelines, edit "docs/index.restdown" and run `make docs`
to update "docs/index.html".

Before committing/pushing run `make prepush` and, if possible, get a code
review.


# Getting Started

To get Man O' War running locally, you can either run Manta compute jobs to get
logs transformed or transform the data locally.  First, set up your environment
by setting the MANTA_* environment variables and verifying that the m* tools
(mls, mput, etc.) are on your $PATH.  See the `node-manta.git` documentation for
more information.  Don't forget to install:

    npm install

Finally, you will also need to create a manta client configuration
that is used by both the script that kicks off compute jobs and the server.  The
template is as follows:

    echo '{
        "manta": {
            "connectTimeout": 1000,
            "retry": {
                "attempts": 5,
                "minTimeout": 1000
            },
            "sign": {
                "key": "$MANTA_PATH_TO_PRIVATE_KEY",
                "keyId": "$MANTA_KEY_ID"
            },
            "url": "$MANTA_URL",
            "user": "$MANTA_USER"
        }
    }' >/tmp/manta.config.json

To have Manta compute transform the sample logs, first upload the data to the
correct location, create a local tar of manowar to be used as the asset, then
kick off two jobs to transform the data:

    ./bin/upload_test_data.sh
    tar --exclude data/* --exclude static/* -chzf /tmp/manowar.tar.gz ../manowar
    MANTA_CONFIG=/tmp/manta.config.json \
        MANOWAR_CONFIG=./etc/manowar.test.config.json \
        MANOWAR_CODE_BUNDLE=/tmp/manowar.tar.gz \
        ./bin/kick_off_log_processing.js -p /2012/12/11/21 -p /2012/12/11/22 | \
        bunyan

To transform and upload the data directly, after setting up your environment
(setting the MANTA_* env variables), run:

    ./bin/upload_transformed_test_data.sh

Once you have the transformed data in manta then run the server:

    MANTA_CONFIG=/tmp/manta.config.json node ./server.js | bunyan

Once the server is running, point a browser at:

    http://localhost:8080

Once it loads:

- You should see the status drop-down on the right testing the manta connection
  and giving notice when the UI has a successful CORS request to Manta.
- Type 'm' in the path field.  You should see the autocomplete drop down
  with `manowar`.
- Once you select `manowar` you should see the status drop-down on the right
  searching Manta for autocomplete data.  Once the directories have been walked
  you should see a drop down listing, among other entries, `manowar/latency`.
  Once chosen you should see a drop down listing, among other entries,
  `manowar/latency/n`.  This can also be typed in manually.
- Enter start date: `12/11/2012 21:00`
- Enter end date: `12/11/2012 23:00`
- The `Graph It!` button should turn green.  Click it and see the graph.

# Local Testing

    make test

If you're running the server and followed the instructions to get test data
uploaded to Manta, you can run this to verify that the signing portion of the
server works:

    curl http://localhost:8080/sign/$MANTA_USER/stor/graphs/data/manowar/2012/12/11/21/60.data | xargs -i curl -v -k "{}"

And this to verify it will save/delete dashboards for you:

    curl -d '{"foo":"bar"}' http://localhost:8080/save/$MANTA_USER/stor/graphs/dashboards/test/invalid
    mget /$MANTA_USER/stor/graphs/dashboards/test/invalid
    curl -X POST http://localhost:8080/delete/$MANTA_USER/stor/graphs/dashboards/test/invalid

You can run stream-metrics.js directly on some of the logs in data/ like so:

    zcat data/logs/manowar/2012/12/11/21/14e223c3.log.gz | bunyan --strict -o json-0 -c 'this.audit === true' | ./bin/stream-metrics.js -p 60 -t time -f latency -f statusCode:latency

Assuming that you have the marlin command msplit, you can test it by giving
the -t option, which will split to files in /var/tmp/msplit.pid.[reducer].  For
example:

    zcat data/logs/manowar/2012/12/11/21/14e223c3.log.gz | bunyan --strict -o json-0 -c 'this.audit === true' | msplit -j -n 2 -e 'var t = (new Date(time)).getTime(); (t - (t % (300 * 1000)))' -t

    cat /var/tmp/msplit.*.0 | json -ga time | cut -c 1-16 | uniq -c
    cat /var/tmp/msplit.*.1 | json -ga time | cut -c 1-16 | uniq -c

Will show that the records were separated into different files but grouped by
time.

To show an example of putting all the pieces together to do a map/reduce from
the cli, which produces the same output as the single stream-metrics example
above:

    #Map audit records to files
    zcat data/logs/manowar/2012/12/11/21/14e223c3.log.gz | bunyan --strict -o json-0 -c 'this.audit === true' | msplit -j -n 2 -e 'var t = (new Date(time)).getTime(); (t - (t % (300 * 1000)))' -t

    #Reduce by computing metrics in those files
    for file in `ls /tmp/msplit.*`; do cat $file | ./bin/stream-metrics.js -p 60 -t time -f latency -f statusCode:latency >$file.metrics; done;

    #Reduce again to merge.
    cat /tmp/msplit.*.metrics | ./bin/merge-metrics.js
