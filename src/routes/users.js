var express = require('express');
var router = express.Router();
var models = require('../models');
var validator = require("email-validator");
var crypto = require("crypto");
const base64url = require('base64url');
var fs = require('fs');
var path = require('path');
var forge = require('node-forge');
const uuidV4 = require('uuid/v4');
var clientCertificateAuth = require('client-certificate-auth');
var tep_utils = require('../lib/tep_utils');
var logger = require("../logger");
var jwt = require('jsonwebtoken');

var secret_utils = require('../lib/secret_utils');

function check_plugin_cert(cert) {
    var cn_parts = cert.subject.CN.split('.');
    var tip_cert = forge.pki.certificateFromPem(secret_utils.get_cert_value('CLIENT_CERT'));
    if (cn_parts[0]!="plugin" && cn_parts[0]!="lti") {
        logger.error('Invalid CN. Do not corresponds to a plugin');
        return false;
    }

    var tip_organization=tip_cert.subject.getField('O').value;

    if (cert.subject.O!=tip_organization) {
        logger.error('Invalid O. TIP organization and plugin organizations are not the same.');
        return false;
    }
    return true;
}

// Create the payload for a token
function getToken_payload(tesla_id, vle_id, mode, activity_type, activity_id, validity) {

    var payload = {
        //
        "iss": process.env.TOKEN_ISSUER,  // issuer
        "exp": Math.round(new Date(new Date().getTime()+validity).getTime()/1000), // expiration time
        "iat": Math.round(new Date().getTime()/1000), // issued at
        "sub": tesla_id, // subject
        "vle": vle_id,
        "mode": mode,
        "act_type": activity_type,
        "act_id": activity_id
    };
    return payload;
}

function get_keys(callback) {
    if (process.env.KEY_POOL_ENABLED==1) {
        models.get_key_from_pool(process.env.KEY_POOL_SIZE, function(public_key, private_key, num_keys) {
            if(num_keys<process.env.KEY_POOL_SIZE) {
                forge.pki.rsa.generateKeyPair({bits: 2048, workers: 2}, callback);
            } else {
                keys={publicKey: forge.pki.publicKeyFromPem(public_key.toString()), privateKey: forge.pki.privateKeyFromPem(private_key.toString())};
                callback(null, keys);
            }
        });
    } else {
        forge.pki.rsa.generateKeyPair({bits: 2048, workers: 2}, callback);
    }
}

// Create a Certificate Signature Request (CSR)
function getCSR(keys, CN, country, state, locality, organization, OU) {
    var csr = forge.pki.createCertificationRequest();
    csr.publicKey = keys.publicKey;
    csr.setSubject(
        [{
            name: 'commonName',
            value: CN
        }, {
            name: 'countryName',
            value: country
        }, {
            shortName: 'ST',
            value: state
        }, {
            name: 'localityName',
            value: locality
        }, {
            name: 'organizationName',
            value: organization
        }, {
            shortName: 'OU',
            value: OU
        }]
    );

    /*
    // set (optional) attributes
    csr.setAttributes(
        [{
            name: 'challengePassword',
            value: 'password'
        }, {
            name: 'unstructuredName',
            value: 'My Company, Inc.'
        }, {
            name: 'extensionRequest',
            extensions: [{
                name: 'subjectAltName',
                altNames: [{
                    // 2 is DNS type
                    type: 2,
                    value: 'test.domain.com'
                }, {
                    type: 2,
                    value: 'other.domain.com'
                }, {
                    type: 2,
                    value: 'www.domain.net'
                }]
            }]
        }]
    );
    */
    // sign certification request
    csr.sign(keys.privateKey);

    return csr;
}

/**
 * @api {POST} /users/id Get the TeSLA ID for the given user. Using RFC4122 v4
 * @apiName GetUser
 * @apiGroup Users
 *
 * @apiParam {String} mail User email.
 *
 * @apiSuccess {String} tesla_id TeSLA ID for the user
 * @apiSuccess {String} email User email.
 * @apiSuccess {Date} createdAt TeSLA ID creation date.
 * @apiSuccess {Date} updatedAt TeSLA ID last update date.
 *
 * @apiError InvalidMailFormat Provided mail is not valid
 * @apiError InvalidCertificates Error creating user certificates
 * @apiError InvalidPluginCertificate Provided certificate by Plugin cannot be validated
 * @apiError TEPConnectionFailed Cannot connect to the TEP (only if TEP_ENFORCE_KEY_SHARING is enabled)
 * @apiError TEPAccessForbidden TEP returned a 403 status code.
 * @apiError TEPKeySharingError Error while sending the public key to TEP (only if TEP_ENFORCE_KEY_SHARING is enabled)
 *
 * @apiExample {curl} Example usage:
 *     curl --request POST --url https://tip.test.tesla-project.eu/users/id --header 'content-type: application/json' --data '{"mail": "xbaro@uoc.edu"}'
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "tesla_id": "9cd125c3-badb-4aa7-b694-321e0d76858f",
 *       "createdAt": "2017-02-09T21:06:51.215Z",
 *       "updatedAt": "2017-02-09T21:06:51.215Z"
 *     }
 */

var use_auth=null;

if (process.env.AUTH_REQUESTS=="1" || process.env.AUTH_REQUESTS==1){
    use_auth=clientCertificateAuth(check_plugin_cert);
} else {
    use_auth=function always_auth(req, res, next) {
        return next();
    }
}

router.post('/id', use_auth, function(req, res, next) {
    var mail = req.body.mail;
    if(validator.validate(mail)) {
        models.getTeslaID(mail, function (data) {
            if(data) {
                var ret_data = {
                    "tesla_id": data.tesla_id,
                    "createdAt": data.createdAt,
                    "updatedAt": data.updatedAt
                };
                res.send(ret_data);
            } else {
                // Create a new TeSLA ID
                var tesla_id = uuidV4();
                // Generate a key pair
                //forge.pki.rsa.generateKeyPair({bits: 2048, workers: 2}, function(err, keys) {
                get_keys(function(err, keys) {
                    if (err) {
                         res.status(400).send({ error: "InvalidCertificates" });
                         return;
                    }
                    var public_key=forge.pki.publicKeyToPem(keys.publicKey);
                    var private_key=forge.pki.privateKeyToPem(keys.privateKey);

                    // Create a CSR and send it to CA
                    //var tip_key = forge.pki.publicKeyFromPem(fs.readFileSync(path.join(process.env.SSL_PATH, process.env.SSL_CERT)));
                    //var csr = getCSR(keys, tesla_id, tip_contry, tip_state, tip_locality, tip_organization, "TIP");

                    // TODO: Create a CSR and send to the CA

                    // Add information to the table
                    models.createTeslaID(tesla_id, mail, public_key, private_key, function(data) {
                        if(data) {
                            var ret_data = {
                                "tesla_id": data.tesla_id,
                                "createdAt": data.createdAt,
                                "updatedAt": data.updatedAt
                            };

                            // Send the public key or certificate to TEP
                            if(process.env.SEND_PUBLIC_KEY=='1') {
                                tep_utils.send_user_key(tesla_id, 'RSA', public_key, function (error, response) {
                                    if (!error && response.statusCode == 200) {
                                        res.send(ret_data);
                                    } else if (process.env.TEP_ENFORCE_KEY_SHARING == '1') {
                                        if (error) {
                                            logger.error('Error connecting to the TEP.', {error: error});
                                            res.status(400).send({error: "TEPConnectionFailed"});
                                        } else {
                                            if (response.statusCode == 403) {
                                                logger.error('Status code 403 from TEP.', {response: response});
                                                res.status(400).send({error: "TEPAccessForbidden"});
                                            } else {
                                                logger.error('Unexpected status code from TEP.', {statusCode: response.statusCode});
                                                res.status(400).send({error: "TEPKeySharingError"});
                                            }
                                        }
                                    } else {
                                        logger.warn('Public key not delivered to TEP. TEP_ENFORCE_KEY_SHARING is disabled.', {
                                            error: error,
                                            response: response
                                        });
                                        res.send(ret_data);
                                    }
                                });
                            } else {
                                logger.warn('Public key not delivered to TEP. SEND_PUBLIC_KEY is disabled.');
                                res.send(ret_data);
                            }
                        }
                    });
                });
            }
        });
    } else {
        res.status(400).send({ error: "InvalidMailFormat" });
    }
});


/**
 * @api {POST} /users/token Get a token for a user and activity. It can be used to authenticate with TEP. Using RFC7519.
 * @apiName GetToken
 * @apiGroup Users
 *
 * @apiParam {String} tesla_id User TeSLA ID.
 * @apiParam {String} vle_id VLE identifier.
 * @apiParam {Number[]} instrument_list List of instrument codes.
 * @apiParam {String="enrollment","verification"} mode Working mode, enrollment or verification.
 * @apiParam {String} [activity_type] Activity type
 * @apiParam {String} [activity_id] Activity type
 * @apiParam {String} [validity] Token validity in seconds (default 300 = 5 minutes)
 *
 * @apiSuccess {String} token Token to be used for authentication
 *
 * @apiError InvalidTeslaId Invalid TeSLA ID provided.
 * @apiError InvalidMode Invalid mode provided. Only "enrollment" and "verification" are accepted.
 * @apiError EmptyInstrumentList The list of instruments is empty or not provided
 * @apiError InvalidInstrument There are some invalid instruments codes in the provided list.
 * @apiError CertificateNotFound There are no certificate for this user in the TIP.
 * @apiError InvalidCertificate The certificate for this user is not valid.
 * @apiError InvalidValidity The validity is incorrect. Must be a value between 1 and 900(15 minutes) seconds.
 * @apiError InvalidPluginCertificate Provided certificate by Plugin cannot be validated
 * @apiError TEPConnectionFailed Cannot connect to the TEP (only if TEP_ENFORCE_KEY_SHARING is enabled)
 * @apiError TEPAccesForbidden TEP returned a 403 status code.
 * @apiError TEPKeySharingError Error while sending the public key to TEP (only if TEP_ENFORCE_KEY_SHARING is enabled)
 *
 * @apiExample {curl} Example usage for enrollment:
 *     curl --request POST --url https://tip.test.tesla-project.eu/users/token --header 'content-type: application/json' --data '{"tesla_id": "9cd125c3-badb-4aa7-b694-321e0d76858f", "vle_id": , "instrument_list": [1, 3, 6], "mode": "enrollment" }'
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ0aXAtdGVzdCIsImV4cCI6IjIwMTctMDItMTZUMjI6MTc6NDcuODYyWiIsImlhdCI6IjIwMTctMDItMTZUMjI6MTI6NDcuODYyWiIsInN1YiI6IjRlOTkzNjIyLTdlZmQtNGMyMS1iNmQ3LTgyYjgzYTEyYWUyYiIsInZsZSI6MywibW9kZSI6ImVucm9sbG1lbnQiLCJhY3QiOm51bGx9.d1pvlNqoqVjQ8FacPcYJIBysa84O+B6mmaOdHpgJ0kmgTvvTil5oGvH3nGxFUkR7O+f4XiYJhzj/pM59YCjQa0j0HVsG9P4Ij0QDCVBZPEpnQTnFa62C/ox3nu/EWjbOBCY+LwuNGXzkdeaGm9a9dhejrKLbBQJ5Vxw64ST6iMweNxSHGELWQlFkt38R7PbzhHvznFWfnmBRlRXCOyZ3Sk1piv/dpkkwZYDtMl26oJMPr1k+Kvb8ywOylaW9fO89In7O7ZXxW4uE92+8VDHUW98hJXq0EKFmP8ACA51uy6tPVNbw7fQryOsFkj525hS1nY7MTXBxBzp5Eg4HkJSDRw=="
 *     }
 *
 * @apiExample {curl} Example usage for verification:
 *     curl --request POST --url https://tip.test.tesla-project.eu/users/token --header 'content-type: application/json' --data '{"tesla_id": "9cd125c3-badb-4aa7-b694-321e0d76858f", "vle_id": , "instrument_list": [1, 3, 6], "mode": "verification", "activity_type": "quiz", "activity_id": "34"}'
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ0aXAtdGVzdCIsImV4cCI6IjIwMTctMDItMTZUMjI6MTc6NDcuODYyWiIsImlhdCI6IjIwMTctMDItMTZUMjI6MTI6NDcuODYyWiIsInN1YiI6IjRlOTkzNjIyLTdlZmQtNGMyMS1iNmQ3LTgyYjgzYTEyYWUyYiIsInZsZSI6MywibW9kZSI6ImVucm9sbG1lbnQiLCJhY3QiOm51bGx9.d1pvlNqoqVjQ8FacPcYJIBysa84O+B6mmaOdHpgJ0kmgTvvTil5oGvH3nGxFUkR7O+f4XiYJhzj/pM59YCjQa0j0HVsG9P4Ij0QDCVBZPEpnQTnFa62C/ox3nu/EWjbOBCY+LwuNGXzkdeaGm9a9dhejrKLbBQJ5Vxw64ST6iMweNxSHGELWQlFkt38R7PbzhHvznFWfnmBRlRXCOyZ3Sk1piv/dpkkwZYDtMl26oJMPr1k+Kvb8ywOylaW9fO89In7O7ZXxW4uE92+8VDHUW98hJXq0EKFmP8ACA51uy6tPVNbw7fQryOsFkj525hS1nY7MTXBxBzp5Eg4HkJSDRw=="
 *     }
 */
router.post('/token', function(req, res, next) {
    var tesla_id = req.body.tesla_id;
    var vle_id = req.body.vle_id;
    var instrument_list = req.body.instrument_list;
    var mode = req.body.mode;
    var activity_type = req.body.activity_type;
    var activity_id = req.body.activity_id;
    var validity_val = req.body.validity;
    var max_allowed_validity = process.env.MAX_TOKEN_VALIDITY || 900;
    var token_validity = process.env.FORCE_TOKEN_VALIDITY || 0;

    // TODO: remove this lines and put this staff in correct way. The problem is middlewware.
    if (!Array.isArray(instrument_list)) {
        instrument_list = [instrument_list];
    }

    if(token_validity>0) {
        validity_val = token_validity;
        max_allowed_validity = token_validity;
    }

    var validity = 5 * 60 * 1000;
    if(validity_val) {
        validity = validity_val * 1000;
    }
    if(validity < 1000 || validity > (max_allowed_validity * 1000)) {
        res.status(400).send({ error: "InvalidValidity" });
        return;
    }

    if(mode!="enrollment" && mode!="verification") {
        res.status(400).send({ error: "InvalidMode" });
        return;
    }

    if(!instrument_list || instrument_list.length<=0) {
        res.status(400).send({ error: "EmptyInstrumentList" });
        return;
    }

    if(Math.min.apply(null, instrument_list)<1 || Math.max.apply(null, instrument_list)>7) {
        res.status(400).send({ error: "InvalidInstrument" });
        return;
    }

    // Check if tesla_id exists
    models.getkeys(tesla_id, function(data){
        if(data) {
            // Create the token (RS256 or ES256) RFC 7519
            if(!data.private_key || !data.public_key) {
                res.status(400).send({ error: "CertificateNotFound" });
                return;
            }
            var private_key = null;
            var public_key = null;
            try{
                private_key = forge.pki.privateKeyFromPem(data.private_key.toString());
                public_key = forge.pki.publicKeyFromPem(data.public_key.toString());
            } catch (e) {
                res.status(400).send({ error: "InvalidCertificate" });
                return;
            }
            var payload = getToken_payload(tesla_id, vle_id, mode, activity_type, activity_id, validity);
            var token = jwt.sign(payload, data.private_key.toString(), { algorithm: 'RS256'});
            var token_data = {
                "token": token
            };


            // Update the public key or certificate to TEP
            if(process.env.SEND_PUBLIC_KEY=='1') {
                tep_utils.send_user_key(tesla_id, 'RSA', data.public_key.toString(), function (error, response) {
                    if (!error && response.statusCode == 200) {
                        res.send(token_data);
                    } else if (process.env.TEP_ENFORCE_KEY_SHARING == '1') {
                        if (error) {
                            logger.error('Error connecting to the TEP.', {error: error});
                            res.status(400).send({error: "TEPConnectionFailed"});
                        } else {
                            if (response.statusCode == 403) {
                                logger.error('Status code 403 from TEP.', {response: response});
                                res.status(400).send({error: "TEPAccessForbidden"});
                            } else {
                                logger.error('Unexpected status code from TEP.', {statusCode: response.statusCode});
                                res.status(400).send({error: "TEPKeySharingError"});
                            }
                        }
                    } else {
                        logger.log('warn', 'Public key not delivered to TEP. TEP_ENFORCE_KEY_SHARING is disabled.', {
                            error: error,
                            response: response
                        });
                        res.send(token_data);
                    }
                });
            } else {
                logger.log('warn', 'Public key not delivered to TEP. SEND_PUBLIC_KEY is disabled.');
                res.send(token_data);
            }
        } else {
            res.status(401).send({ error: "InvalidTeslaId" });
        }
    });
});

/**
 * @api {POST} /users/validate Validate a token. Using RFC7519.
 * @apiName ValidateToken
 * @apiGroup Users
 *
 * @apiParam {String} token Token to be validated
 *
 * @apiSuccess {Boolean} valid True if the token is valid (data and signature are correct), false if data and signature are not valid.
 * @apiSuccess {Boolean} expired True if the token is expired, or false if it valid
 *
 * @apiError InvalidTeslaId Invalid TeSLA ID in the token.
 * @apiError CertificateNotFound There are no certificate for the user in the token.
 * @apiError InvalidCertificate The certificate for the user in the token is not valid.
 * @apiError InvalidAlgorithm The algorithm used by the token is not supported.
 * @apiError TEPCertificateError TEP certificate cannot be validated.
 *
 * @apiExample {curl} Example usage:
 *     curl --request POST --url https://tip.test.tesla-project.eu/users/token --header 'content-type: application/json' --data '{"token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ0aXAtdGVzdCIsImV4cCI6IjIwMTctMDItMTZUMjI6MTc6NDcuODYyWiIsImlhdCI6IjIwMTctMDItMTZUMjI6MTI6NDcuODYyWiIsInN1YiI6IjRlOTkzNjIyLTdlZmQtNGMyMS1iNmQ3LTgyYjgzYTEyYWUyYiIsInZsZSI6MywibW9kZSI6ImVucm9sbG1lbnQiLCJhY3QiOm51bGx9.d1pvlNqoqVjQ8FacPcYJIBysa84O+B6mmaOdHpgJ0kmgTvvTil5oGvH3nGxFUkR7O+f4XiYJhzj/pM59YCjQa0j0HVsG9P4Ij0QDCVBZPEpnQTnFa62C/ox3nu/EWjbOBCY+LwuNGXzkdeaGm9a9dhejrKLbBQJ5Vxw64ST6iMweNxSHGELWQlFkt38R7PbzhHvznFWfnmBRlRXCOyZ3Sk1piv/dpkkwZYDtMl26oJMPr1k+Kvb8ywOylaW9fO89In7O7ZXxW4uE92+8VDHUW98hJXq0EKFmP8ACA51uy6tPVNbw7fQryOsFkj525hS1nY7MTXBxBzp5Eg4HkJSDRw=="}'
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "valid": true
 *       "expired": false
 *     }
 */
router.post('/validate', function(req, res, next) {
    var token = req.body.token;

    var token_parts = token.split('.');
    var header = JSON.parse(base64url.decode(token_parts[0]));
    var payload = JSON.parse(base64url.decode(token_parts[1]));
    var signature = base64url.decode(token_parts[2]);

    // Check if tesla_id exists
    models.getkeys(payload.sub, function(data){
        if(data) {
            var public_key = null;
            if(!data.public_key) {
                res.status(400).send({ error: "CertificateNotFound" });
                return;
            }
            try {
                public_key = forge.pki.publicKeyFromPem(data.public_key.toString());
            } catch(e) {
                res.status(400).send({ error: "InvalidCertificate" });
                return;
            }
            var verified = false;
            var md = forge.md.sha256.create();
            md.update(token_parts[0] + "." + token_parts[1]);
            if(header.alg == "RS256") {
                verified = public_key.verify(md.digest().bytes(), signature);
            } else if(header.alg == "ES256") {
                // TODO: Check ecdsa
                res.status(400).send({ error: "InvalidAlgorithm" });
                return;
            } else {
                res.status(400).send({ error: "InvalidAlgorithm" });
                return;
            }

            var data = {
                "valid": verified,
                "expired": new Date() > new Date(payload.exp)
            };

            res.send(data);
        } else {
            res.status(400).send({ error: "InvalidTeslaId" });
        }
    });
});

function getCert(tesla_id, keys) {
    var tip_cert = forge.pki.certificateFromPem(secret_utils.get_cert_value(process.env.SSL_CERT));
    // var csr_sample = forge.pki.certificationRequestFromPem(fs.readFileSync(path.join(process.env.SSL_PATH, 'sample.csr')));

    var tip_contry=tip_cert.subject.getField('C');
    var tip_state=tip_cert.subject.getField('ST');
    var tip_locality=tip_cert.subject.getField('L');
    var tip_organization=tip_cert.subject.getField('OU');
    var cn=tip_cert.subject.getField('CN');

    var csr = getCSR(keys, tesla_id, tip_contry, tip_state, tip_locality, tip_organization, "TIP");

    var https = require('https');

    var options = {
        host: 'tesla-universities.telecom-sudparis.eu',
        port: 2001,
        path: '/',
        method: 'GET',
        key: fs.readFileSync(path.join(process.env.SSL_PATH, 'xbarosole.key.pem')),
        cert: fs.readFileSync(path.join(process.env.SSL_PATH, 'xbarosole.cert.pem')),
        ca: null
    };

    var req = https.request(options, function(res) {
        logger.log("statusCode: ", res.statusCode);
        logger.log("headers: ", res.headers);

        res.on('data', function(d) {
            process.stdout.write(d);
        });
    });
    req.end();

    req.on('error', function(e) {
        logger.error(e);
    });
}

router.get('/test_csr', function(req, res, next) {
    var tesla_id = uuidV4();
    forge.pki.rsa.generateKeyPair({bits: 2048, workers: 2}, function(err, keys) {
        if (err) {
            res.status(400).send({error: "InvalidCertificates"});
            return;
        }
        var data = getCert(tesla_id, keys);
    });
});


module.exports = router;
