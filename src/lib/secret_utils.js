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

