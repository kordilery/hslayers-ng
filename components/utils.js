/**
 * @namespace hs.map
 * @memberOf hs
 */
define(['angular', 'app'], function(angular, app) {
    angular.module('hs.utils', ['hs'])

    /**
     * @class hs.utils.service
     * @memberOf hs.utils
     * @param {object} config - Application configuration
     * @description Service for containing various utility functions
     */
    .service('hs.utils.service', ['config', function(config) {
        var me = this;

        this.proxify = function(url, toEncoding) {
            toEncoding = angular.isUndefined(toEncoding) ? true : toEncoding;
            var outUrl = url;
            if (url.substring(0, 4) == 'http' && url.indexOf(window.location.origin) == -1) {
                if (typeof use_proxy === 'undefined' || use_proxy === true) {

                    outUrl = "/cgi-bin/hsproxy.cgi?";
                    if (toEncoding && url.indexOf('FORMAT=image') == -1) outUrl += "toEncoding=utf-8&";
                    outUrl = outUrl + "url=" + encodeURIComponent(url);
                }
            }
            return outUrl;
        }

        this.parseHexString = function(hex) {
            for (var bytes = [], c = 0; c < hex.length; c += 2)
                bytes.push(parseInt(hex.substr(c, 2), 16));
            return bytes;
        }

        this.createHexString = function(bytes) {
            for (var hex = [], i = 0; i < bytes.length; i++) {
                hex.push((bytes[i] >>> 4).toString(16));
                hex.push((bytes[i] & 0xF).toString(16));
            }
            return hex.join("");
        }

        this.getParamsFromUrl = function(str) {
            if (typeof str !== 'string') {
                return {};
            }

            if (str.indexOf('?') > -1)
                str = str.substring(str.indexOf("?") + 1);
            else
                return {};

            return str.trim().split('&').reduce(function(ret, param) {
                var parts = param.replace(/\+/g, ' ').split('=');
                var key = parts[0];
                var val = parts[1];

                key = decodeURIComponent(key);
                // missing `=` should be `null`:
                // http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
                val = val === undefined ? null : decodeURIComponent(val);

                if (!ret.hasOwnProperty(key)) {
                    ret[key] = val;
                } else if (Array.isArray(ret[key])) {
                    ret[key].push(val);
                } else {
                    ret[key] = [ret[key], val];
                }

                return ret;
            }, {});
        };

        this.paramsToURL = function(array) {
            var pairs = [];
            for (var key in array)
                if (array.hasOwnProperty(key))

                    pairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(array[key]));
            return pairs.join('&');
        }

        this.generateUuid = function() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0,
                    v = c == 'x' ? r : r & 0x3 | 0x8;
                return v.toString(16);
            });
        }

        Date.isLeapYear = function(year) {
            return (((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0));
        };

        Date.getDaysInMonth = function(year, month) {
            return [31, (Date.isLeapYear(year) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
        };

        Date.prototype.isLeapYear = function() {
            return Date.isLeapYear(this.getFullYear());
        };

        Date.prototype.getDaysInMonth = function() {
            return Date.getDaysInMonth(this.getFullYear(), this.getMonth());
        };

        Date.prototype.addMonths = function(value) {
            var n = this.getDate();
            this.setDate(1);
            this.setMonth(this.getMonth() + value);
            this.setDate(Math.min(n, this.getDaysInMonth()));
            return this;
        };

        Date.prototype.monthDiff = function(d2) {
            var months;
            months = (d2.getFullYear() - this.getFullYear()) * 12;
            months -= this.getMonth() + 1;
            months += d2.getMonth();
            return months <= 0 ? 0 : months;
        }

        String.prototype.hashCode = function() {
            var hash = 0;
            if (this.length == 0) return hash;
            for (i = 0; i < this.length; i++) {
                char = this.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32bit integer
            }
            return hash;
        }

        String.prototype.replaceAll = function(search, replacement) {
            var target = this;
            return target.replace(new RegExp(search, 'g'), replacement);
        };
        

        if (!String.prototype.format) {
            String.prototype.format = function() {
                var args = arguments;
                return this.replace(/{(\d+)}/g, function(match, number) { 
                return typeof args[number] != 'undefined'
                    ? args[number]
                    : match
                ;
                });
            };
        }

    }])
})
