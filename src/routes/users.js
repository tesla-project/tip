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


function getToken_payload(tesla_id, vle_id, mode, activity_type, activity_id, validity) {

    var payload = {
        //
        "iss": "tip-test",  // issuer
        "exp": new Date(new Date().getTime()+validity), // expiration time
        "iat": new Date(), // issued at
        "sub": tesla_id, // subject
        "aud": "tep", // audience
        "vle": vle_id,
        "mode": mode,
        "act": activity_type + activity_id
    };
    return payload;
}


/**
 * @api {POST} /users/id Get the TeSLA ID for the given user.
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
router.post('/id', function(req, res, next) {
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
                var keys = forge.pki.rsa.generateKeyPair(2048);

                var public_key=forge.pki.publicKeyToPem(keys.publicKey);
                var private_key=forge.pki.privateKeyToPem(keys.privateKey);

                // TODO: Create a CSR and send to the CA

                // Add information to the table
                models.createTeslaID(tesla_id, mail, public_key, private_key, function(data) {
                    if(data) {
                        var ret_data = {
                            "tesla_id": data.tesla_id,
                            "createdAt": data.createdAt,
                            "updatedAt": data.updatedAt
                        };
                        res.send(ret_data);
                    }
                });
            }
        });
    } else {
        res.status(401).send({ error: "InvalidMailFormat" });
    }
});


/**
 * @api {POST} /users/token Get a token for a user and activity. It can be used to authenticate with TEP
 * @apiName GetToken
 * @apiGroup Users
 *
 * @apiParam {String} tesla_id User TeSLA ID.
 * @apiParam {String} vle_id VLE identifier.
 * @apiParam {String} instrument_list List of instruments.
 * @apiParam {String="enrollment","verification"} mode Working mode, enrollment or verification.
 * @apiParam {String} [activity_type] Activity type
 * @apiParam {String} [activity_id] Activity type
 *
 * @apiSuccess {String} token Token to be used for authentication
 *
 * @apiError InvalidTeslaId Invalid TeSLA ID provided.
 * @apiError InvalidMode Invalid mode provided. Only "enrollment" and "validation" are accepted.
 * @apiError EmptyInstrumentList The list of instruments is empty or not provided
 * @apiError InvalidInstrument There are some invalid instruments codes in the provided list.
 * @apiError CertificateNotFound There are no certificate for this user in the TIP.
 * @apiError InvalidCertificate The certificate for this user is not valid.
 *
 * @apiExample {curl} Example usage for enrollment:
 *     curl --request POST --url https://tip.test.tesla-project.eu/users/token --header 'content-type: application/json' --data '{"tesla_id": "9cd125c3-badb-4aa7-b694-321e0d76858f", "vle_id": , "instrument_list": [1, 3, 6], "mode": "enrollment" }'
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "token": "9cd125c3-badb-4aa7-b694-321e0d76858f"
 *     }
 *
 * @apiExample {curl} Example usage for verification:
 *     curl --request POST --url https://tip.test.tesla-project.eu/users/token --header 'content-type: application/json' --data '{"tesla_id": "9cd125c3-badb-4aa7-b694-321e0d76858f", "vle_id": , "instrument_list": [1, 3, 6], "mode": "verification", "activity_type": " ", "activity_id": " "}'
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "token": "9cd125c3-badb-4aa7-b694-321e0d76858f"
 *     }
 */
router.post('/token', function(req, res, next) {
    var tesla_id = req.body.tesla_id;
    var vle_id = req.body.vle_id;
    var instrument_list = req.body.instrument_list;
    var mode = req.body.mode;
    var activity_type = req.body.activity_type;
    var activity_id = req.body.activity_id;

    var validity = 5 * 60 * 1000;

    // Check if tesla_id exists
    models.getkeys(tesla_id, function(data){
        if(data) {
            // Create the token (RS256 or ES256) RFC 7519
            var header = {
              "alg": "RS256",
              "typ": "JWT"
            };
            var payload = getToken_payload(tesla_id, vle_id, mode, activity_type, activity_id, validity);
            var unsigned_token = base64url(JSON.stringify(header)) + "." + base64url(JSON.stringify(payload));
            var private_key = forge.pki.privateKeyFromPem(data.private_key.toString());
            if(header.alg == "RS256") {
                var md = forge.md.sha256.create();
                md.update(unsigned_token);
                signature = forge.util.encode64(private_key.sign(md));
            } else if(header.alg == "ES256") {
                // TODO: Check ecdsa
            }
            var token = unsigned_token + "." + signature;
            var token_data = {
                "token": token
            };
            res.send(token_data);
        } else {
            res.status(401).send({ error: "InvalidTeslaId" });
        }
    });
});

router.post('/validate', function(req, res, next) {
    var token = req.body.token;

    var token_parts = token.split('.');
    var header = JSON.parse(base64url.decode(token_parts[0]));
    var payload = JSON.parse(base64url.decode(token_parts[1]));
    var signature = forge.util.decode64(token_parts[2]);

    // Check if tesla_id exists
    models.getkeys(payload.sub, function(data){
        if(data) {
            var public_key = forge.pki.publicKeyFromPem(data.public_key.toString());
            var verified = false;
            var md = forge.md.sha256.create();
            md.update(token_parts[0] + "." + token_parts[1]);
            if(header.alg == "RS256") {
                verified = public_key.verify(md.digest().bytes(), signature);
            } else if(header.alg == "ES256") {
                // TODO: Check ecdsa
            }

            var data = {
                "valid": verified,
                "expired": new Date() > new Date(payload.exp)
            };

            res.send(data);
        } else {
            res.status(401).send({ error: "InvalidTeslaId" });
        }
    });
});

module.exports = router;
