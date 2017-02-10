var express = require('express');
var router = express.Router();
var models = require('../models');
var validator = require("email-validator");

/**
 * @api {POST} /user/id Get the TeSLA ID for the given user.
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
