/*
 * TeSLA Identity Provider
 * Copyright (C) 2019 Universitat Oberta de Catalunya
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

var path = require('path');
var winston = require('winston');
winston.emitErrs = true;

var rfs = require('rotating-file-stream');
var fs=require('fs');

// Log file
var logFolder = path.join(__dirname, 'log');
if (process.env.LOGS_FOLDER) {
    logFolder = process.env.LOGS_FOLDER;
}

// ensure log directory exists
fs.existsSync(logFolder) || fs.mkdirSync(logFolder);
console.log('TeSLA Identity Provider: Logs stored at folder ' + logFolder);

var file_access = path.join(logFolder, 'tip.access.log');
var file_error = path.join(logFolder, 'tip.error.log');

var logger = new winston.Logger({
    transports: [
        new winston.transports.File({
            name: 'info-file',
            level: 'info',
            filename: file_access,
            handleExceptions: true,
            json: true,
            maxsize: process.env.LOG_ROTATE_MAX_BYTES,
            maxFiles: process.env.LOG_ROTATE_BACKUP_COUNT,
            colorize: false
        }),
        new winston.transports.File({
            name: 'error-file',
            level: 'error',
            filename: file_error,
            handleExceptions: true,
            json: true,
            maxsize: process.env.LOG_ROTATE_MAX_BYTES,
            maxFiles: process.env.LOG_ROTATE_BACKUP_COUNT,
            colorize: false
        }),
        new winston.transports.Console({
            level: 'debug',
            handleExceptions: true,
            json: false,
            colorize: true
        })
    ],
    exitOnError: false
});

module.exports = logger;
module.exports.stream = {
    write: function(message, encoding){
        logger.info(message);
    }
};

module.exports.exitAfterFlush = function(code) {
    logger.transports['error-file'].on('flush', function() {
        process.exit(code);
    });
};

