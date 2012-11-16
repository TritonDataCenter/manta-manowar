#!/usr/bin/bash

: ${MANTA_URL?"MANTA_URL isn't set"}

TMP_FILE=/tmp/graph_data

for file in `find data/logs -type f`; do
    DIR=/$MANTA_USER/stor/graph_data/$(dirname $file | perl -ne 's/data\/logs\///g; print;')
    MANTA_OBJECT=$DIR/60.data
    echo $MANTA_OBJECT

    bzcat $file | grep '^{' | bunyan -o json-0 -c 'this.audit === true' | \
        ./bin/laggr.js -p 60 -t time -f latency -f res.statusCode:latency \
        >$TMP_FILE

    mmkdir -p $DIR
    mput -H 'Access-Control-Allow-Origin: *' -f $TMP_FILE $MANTA_OBJECT
done

rm -rf $TMP_FILE
