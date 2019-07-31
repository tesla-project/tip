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

var pm2 = require('pm2');
var logger = require("./logger");

var instances = process.env.NUM_THREADS || -1;
var maxMemory = process.env.WEB_MEMORY || 512;

pm2.connect(function() {
    pm2.start({
        script    : 'bin/www',
        name      : 'TeSLA Identity Provider',
        exec_mode : 'cluster',
        instances : instances,
        max_memory_restart : maxMemory + 'M',   // Auto-restart if process takes more than XXmo
        env: {                            // If needed declare some environment variables
            "NODE_ENV": "production"
        },
    }, function(err) {
        if (err) return console.error('Error while launching applications', err.stack || err);
        //console.log('PM2 and application has been succesfully started');
        logger.log('info','PM2 and application has been succesfully started');

        // Display logs in standard output
        pm2.launchBus(function(err, bus) {
            //console.log('[PM2] Log streaming started');
            logger.log('info', '[PM2] Log streaming started');

            bus.on('log:out', function(packet) {
                logger.log('info', '[App:%s] %s', packet.process.name, packet.data);
                //console.log('[App:%s] %s', packet.process.name, packet.data);
            });

            bus.on('log:err', function(packet) {
                logger.log('error', '[App:%s][Err] %s', packet.process.name, packet.data);
                //console.error('[App:%s][Err] %s', packet.process.name, packet.data);
            });
    });
  });
});

