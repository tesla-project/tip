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

var fs = require('fs');
var path = require('path');

exports.get_value = function(name) {
    var secret_path = path.join('/var/run/secrets', process.env.SECRET_PREFIX + name);
    var value=null;
    if(fs.existsSync(secret_path)) {
        value= fs.readFileSync(secret_path);
    } else {
        value = process.env[name];
    }

    return value;
};

exports.get_cert_value = function(name) {
    var secret_path = path.join('/var/run/secrets', process.env.SECRET_PREFIX + name);
    var value=null;
    if(fs.existsSync(secret_path)) {
        value= fs.readFileSync(secret_path);
    } else {
        value = fs.readFileSync(path.join(process.env.SSL_PATH, process.env[name]));
    }

    return value;
};

exports.get_path = function(name) {
    var secret_path = path.join('/var/run/secrets', process.env.SECRET_PREFIX + name);
    var value=null;
    if(fs.existsSync(secret_path)) {
        value = secret_path;
    } else {
        value = process.env[name];
    }

    return value;
};

exports.get_cert_path = function(name) {
    var secret_path = path.join('/var/run/secrets', process.env.SECRET_PREFIX + name);
    var value=null;
    if(fs.existsSync(secret_path)) {
        value = secret_path;
    } else {
        value = path.join(process.env.SSL_PATH, process.env[name]);
    }

    return value;
};

