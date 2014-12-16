#!/usr/bin/bash
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
#

#
# Copyright (c) 2014, Joyent, Inc.
#

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
