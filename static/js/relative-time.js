// Copyright (c) 2012, Joyent, Inc. All rights reserved.

(function(exports){

        var multipliers = {
                'second': 1000,
                'minute': 60000,
                'hour': 3600000,
                'day': 86400000,
                'week': 604800000
        }


        function getTime(now, n, period) {
                if (period.charAt(period.length - 1) === 's') {
                        period = period.substring(0, period.length - 1);
                }
                if (multipliers[period] !== undefined) {
                        var offset = n * multipliers[period];
                        return now - offset;
                } else if (period === 'month') {
                        var date = new Date(now);
                        //The javascript date library is smart enough to
                        // detect that we have an invalid day and set the
                        // month appropriately.  While not exactly what I think
                        // it should do (really Id want the end of the
                        // month rather than the beginning), it's good enough.
                        date.setMonth(date.getMonth() - n);
                        return date.getTime();
                } else if (period === 'year') {
                        var date = new Date(now);
                        //Same goes here, goes to March 1st instead of
                        // February 28th.  Close enough.
                        date.setFullYear(date.getFullYear() - n);
                        return date.getTime();
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
         *   - N month(s) ago
         *   - N year(s) ago
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
                                        ret = getTime(now, n, period);
                                }
                        }
                }

                return ret;
        };

})(typeof exports === 'undefined' ? this['RelativeTime'] = {}: exports);
