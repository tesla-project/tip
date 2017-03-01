var request = require('request');
const url = require('url');
var fs = require('fs');
var path = require('path');

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
        url: url,
        method: "PUT",
        json: json_data,
        agentOptions: {
            cert: fs.readFileSync(path.join(process.env.SSL_PATH, process.env.SSL_CERT)),
            key: fs.readFileSync(path.join(process.env.SSL_PATH, process.env.SSL_KEY)),
            ca: fs.readFileSync(path.join(process.env.SSL_PATH, process.env.SSL_CA_CERT))
        }
    };

    return options;
}

exports.send_user_key = function(tesla_id, algorithm, key, callback) {

    var method_url = url.resolve(process.env.TEP_ADDRESS, 'api/tip/addUser');
    var data = JSON.stringify({
        tesla_id: tesla_id,
        public_key: key,
        key_type: algorithm
    });
    var options = get_optons(method_url, data);

    request(options, function (error, response, body) {
        callback(error, response);
    });
};

exports.send_key = function(algorithm, key, callback) {

    var method_url = url.resolve(process.env.TEP_ADDRESS, 'api/tip/addTipKey');
    var data = JSON.stringify({
        public_key: key,
        key_type: algorithm
    });
    var options = get_optons(url, data);

    request(options, function (error, response, body) {
        callback(error, response);
    });
};