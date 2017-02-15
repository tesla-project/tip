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
/*
// create a rotating write stream
var tipLogStream = rfs('tip.log', {
  interval: '1d', // rotate daily
  path: logFolder
});
*/
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
            maxsize: 5242880, //5MB
            maxFiles: 5,
            colorize: false
        }),
        new winston.transports.File({
            name: 'error-file',
            level: 'error',
            filename: file_error,
            handleExceptions: true,
            json: true,
            maxsize: 5242880, //5MB
            maxFiles: 5,
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
