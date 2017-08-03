var request = require('request');
const url = require('url');
var fs = require('fs');
var path = require('path');
var secret_utils = require('../lib/secret_utils');

/*
PUT api/tip/addTipKey
{
  tip_public_key: "key",
  key_type: "type"
}

PUT api/tip/addUser
{
  tesla_id: "somenewteslaid",
  public_key: "somenewpublickey"
  key_type: "somekeytype"
}

return 200 OK with { status_code: "0" (added), "1" (updated) or "2" (error) }
return 403 NO AUTH later when using ssl certs

key_type: "RSA" / "ECDSA"
*/

function get_optons(url, json_data) {
    var options = {
        url: url.toString(),
        method: "PUT",
        //json: true,
        //headers: {
        //    "content-type": "application/json",
        //},
        //body: json_data,
        json: json_data,
        agentOptions: {
            cert: secret_utils.get_cert_value('CLIENT_CERT'),
            key: secret_utils.get_cert_value('CLIENT_KEY'),
            ca: secret_utils.get_cert_value('CLIENT_CA')
        }
    };

    /*
     agentOptions: {
            cert: fs.readFileSync(path.join(process.env.SSL_PATH, process.env.SECRET_PREFIX + process.env.SSL_CLIENT_CERT)),
            key: fs.readFileSync(path.join(process.env.SSL_PATH, process.env.SECRET_PREFIX + process.env.SSL_CLIENT_KEY)),
            ca: fs.readFileSync(path.join(process.env.SSL_PATH, process.env.SECRET_PREFIX + process.env.SSL_CLIENT_CA_CERT))
        }
    */

    return options;
}

exports.send_user_key = function(tesla_id, algorithm, key, callback) {

    var method_url = url.resolve(process.env.TEP_ADDRESS, 'api/tip/AddUser');
    var data = {
        tesla_id: tesla_id,
        public_key: key,
        key_type: algorithm
    };
    var options = get_optons(method_url, data);

    request(options, function (error, response, body) {
        callback(error, response);
    });
};

exports.send_key = function(algorithm, key, callback) {

    var method_url = url.resolve(process.env.TEP_ADDRESS, 'api/tip/AddTipKey');
    var data = {
        public_key: key,
        key_type: algorithm
    };
    var options = get_optons(url, data);

    request(options, function (error, response, body) {
        callback(error, response);
    });
};