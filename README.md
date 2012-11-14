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

You can also run laggr.js directly on some of the logs in data/ like so:

    bzcat data/logs/muskie/2012/11/13/01/c8aa9a6d.log.bz2 | grep -v '/ping' | grep '^{"name":"audit"' | ./bin/laggr.js -p 60 -t time -f latency -f res.statusCode:latency

# Starting a Repo Based on eng.git

Create a new repo called "some-cool-fish" in your "~/work" dir based on "eng.git":
Note: run this inside the eng dir.

    ./tools/mkrepo $HOME/work/some-cool-fish


# Your Other Sections Here

Add other sections to your README as necessary. E.g. Running a demo, adding
development data.



