var express = require('express');
var router = express.Router();
var models = require('../models');
var validator = require("email-validator");

/**
 * @api {POST} /users/id Get the TeSLA ID for the given user.
 * @apiName GetUser
 * @apiGroup User
 *
 * @apiParam {String} mail User email.
 *
 * @apiSuccess {String} tesla_id TeSLA ID for the user
 * @apiSuccess {String} email User email.
 * @apiSuccess {Date} createdAt TeSLA ID creation date.
 * @apiSuccess {Date} updatedAt TeSLA ID last update date.
 *
 * @apiError InvalidMailFormat
 *
 * @apiExample {curl} Example usage:
 *     curl --request POST --url https://tip.test.tesla-project.eu/users/id --header 'content-type: application/json' --data '{"mail": "xbaro@uoc.edu"}'
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "tesla_id": "9cd125c3-badb-4aa7-b694-321e0d76858f",
 *       "email": "xbaro@uoc.edu",
 *       "createdAt": "2017-02-09T21:06:51.215Z",
 *       "updatedAt": "2017-02-09T21:06:51.215Z"
 *     }
 */
router.post('/id', function(req, res, next) {
    var mail = req.body.mail;
    if(validator.validate(mail)) {
        models.getTeslaID(mail, function (data) {
            res.send(data);
        });
    } else {
        res.status(401).send({ error: "InvalidMailFormat" });
    }
});

module.exports = router;
