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
    node_modules/   Node.js deps, either populated at build time or commited.
                    See Managing Dependencies.
    pkg/            Package lifecycle scripts
    test/           Test suite (using node-tap)
    tools/          Miscellaneous dev/upgrade/deployment tools and data.
    Makefile
    package.json    npm module info (holds the project version)
    README.md


# Development

TODO: Update me.

To run the boilerplate API server:

    git clone git@git.joyent.com:eng.git
    cd eng
    git submodule update --init
    make all
    node server.js

To update the guidelines, edit "docs/index.restdown" and run `make docs`
to update "docs/index.html".

Before committing/pushing run `make prepush` and, if possible, get a code
review.



# Testing

    make test

If you set up your MANTA_* environment variables and have node-manta on your
path, you can upload the data under the "data" directory by running:

    ./bin/upload_test_data.sh

Then if you're running the server you can run this to verify that the signing
portion of the server works:

    curl http://localhost:8080/sign/poseidon/stor/graphs/data/muskie/2012/11/13/01/60.data | xargs -i curl -v -k "{}"

If you're running on coal and you need to have a request signed for a different
host, you can pass a host query parameter:

    curl http://localhost:8080/sign/poseidon/stor/graphs/data/muskie/2012/11/13/01/60.data?host=$(coal_manta_ip.sh) | xargs -i curl -v -k "{}"

You can run stream-metrics.js directly on some of the logs in data/ like so:

    bzcat data/logs/muskie/2012/11/13/01/c8aa9a6d.log.bz2 | grep '^{' | bunyan -o json-0 -c 'this.audit === true' | ./bin/stream-metrics.js -p 60 -t time -f latency -f res.statusCode:latency

You can test msplit-json-time by giving the -t option, which will split to files
in /tmp/msj-test.[reducer].  For example:

    bzcat data/logs/muskie/2012/11/13/01/c8aa9a6d.log.bz2 | grep '^{' | bunyan -o json-0 -c 'this.audit === true' | ./bin/msplit-json-time.js -n 2 -f time -p 300 -t

    cat /tmp/msj-test.0 | json -a time | cut -c 1-16 | uniq -c

Will show that the records were separated into different files but grouped by
time.

To show an example of putting all the pieces together to do a map/reduce from
the cli, which produces the same output as the single stream-metrics example
above:

    #Map audit records to files
    bzcat data/logs/muskie/2012/11/13/01/c8aa9a6d.log.bz2 | grep '^{' | bunyan -o json-0 -c 'this.audit === true' | ./bin/msplit-json-time.js -n 3 -f time -t;
    #Reduce by computing metrics in those files
    for file in `ls /tmp/msj-test.*`; do cat $file | ./bin/stream-metrics.js -p 60 -t time -f latency -f res.statusCode:latency >$file.metrics; done;
    #Reduce again to merge.
    cat /tmp/msj-test.*.metrics | ./bin/merge-metrics.js
