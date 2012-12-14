#!/usr/bin/bash
###############################################################################
# This script will upload test data in the correct location.
#
# Before running, make sure you've initialized your environment to run
# m* commands (mls, mmkdir, etc).
###############################################################################

: ${MANTA_URL?"MANTA_URL isn't set"}

for file in `find data/logs -type f`; do
    ROOT_DIR=/$MANTA_USER/stor/logs
    MANTA_OBJECT=$ROOT_DIR/$(echo $file | perl -ne 's/data\/logs\///g; print;')
    DIR=$(dirname $MANTA_OBJECT)
    echo $MANTA_OBJECT

    mmkdir -p $DIR
    mput -f $file $MANTA_OBJECT
done
