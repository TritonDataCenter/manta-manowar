// Copyright (c) 2012, Joyent, Inc. All rights reserved.

(function(exports){

        var multipliers = {
                'second': 1000,
                'minute': 60000,
                'hour': 3600000,
                'day': 86400000,
                'week': 604800000
        }


        function getDifference(n, period) {
                if (period.charAt(period.length - 1) === 's') {
                        period = period.substring(0, period.length - 1);
                }
                if (multipliers[period] !== undefined) {
                        return n * multipliers[period];
                }
                return null;
        }


        function isValidDate(d) {
                if (Object.prototype.toString.call(d) !== "[object Date]")
                        return false;
                return !isNaN(d.getTime());
        }


        /**
         * Supports:
         *   - now
         *   - yesterday
         *   - N second(s) ago
         *   - N minute(s) ago
         *   - N hour(s) ago
         *   - N day(s) ago
         *   - N weeks(s) ago
         *
         * TODO: Add support for months/years
         */
        exports.unixTime = function(friendly, now) {
                //Either an integer or a Date will work.
                now = now || (new Date()).getTime();
                if (isValidDate(now)) {
                        now = now.getTime();
                }
                if (isNaN(now)) {
                        now = 0;
                }

                var ret = null;

                if (friendly === 'now') {
                        return now;
                }
                if (friendly === 'yesterday') {
                        friendly = '1 day ago';
                }
                if (friendly.indexOf('ago') !== -1) {
                        //Math works fine for everything until we hit
                        // "months".
                        var parts = friendly.split(' ');
                        if (parts.length === 3) {
                                var n = parseInt(parts[0], 10);
                                var period = parts[1];
                                var ago = parts[2];

                                if (!isNaN(n) && ago === 'ago') {
                                        var diff = getDifference(n, period);
                                        if (diff !== null) {
                                                ret = now - diff;
                                        }
                                }
                        }
                }

                return ret;
        };

})(typeof exports === 'undefined' ? this['RelativeTime'] = {}: exports);
