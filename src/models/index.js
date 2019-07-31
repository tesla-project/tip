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

"use strict";

var fs        = require("fs");
var path      = require("path");
var Sequelize = require("sequelize");
var env       = process.env.NODE_ENV || "development";
var logger = require("../logger");
var db        = {};
var secret_utils = require('../lib/secret_utils');

var db_config = {
    "username": process.env.DB_USER,
    "password": secret_utils.get_value('DB_PASSWORD'),
    "database": process.env.DB_NAME,
    "host": process.env.DB_HOST,
    "port": process.env.DB_PORT,
    "dialect": "postgres",
    "logging": logger.info
  };
var sequelize = new Sequelize(db_config.database, db_config.username, db_config.password, db_config);

fs
  .readdirSync(__dirname)
  .filter(function(file) {
    return (file.indexOf(".") !== 0) && (file !== "index.js");
  })
  .forEach(function(file) {
    var model = sequelize.import(path.join(__dirname, file));
    db[model.name] = model;
  });

Object.keys(db).forEach(function(modelName) {
  if ("associate" in db[modelName]) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

db.getTeslaID = function(email, callback) {
    db.TeslaID.findOne({ where: { email: email}}).then(callback);
};

db.getkeys = function(tesla_id, callback, error_callback) {
  db.TeslaID.findOne({ where: { tesla_id: tesla_id}}).then(callback).catch(function(error) {
      if (error_callback) {
          error_callback(error)
      } else {
          logger.log(error);
      }
  });
};

db.createTeslaID = function(tesla_id, email, public_key, private_key, callback) {
  db.TeslaID.findOne({ where: { email: email}}).then(
      function(data) {
          if (data) {
              callback(null);
          } else {
              db.TeslaID.create({tesla_id: tesla_id, email:email, public_key: public_key, private_key: private_key}).then(
                  function (data) {
                      callback(data)
                  }
              );
          }
      });
};

db.get_key_from_pool = function(pool_size, callback) {
  db.TeslaID.findAndCountAll({
      limit: pool_size
  }).then(
      function(data) {
          if (data.count==0) {
              callback(null, null, 0);
          } else {
              var idx = Math.floor(Math.random() * (Math.min(data.count, pool_size)));
              try {
                  if(data.rows[idx]) {
                      var public_key = data.rows[idx].public_key;
                      var private_key = data.rows[idx].private_key;
                      callback(public_key, private_key, data.count);
                  } else {
                      var public_key = data.rows[0].public_key;
                      var private_key = data.rows[0].private_key;
                      callback(public_key, private_key, data.count);
                  }
              } catch(err) {
                  callback(null, null, 0);
              }
          }
      });
};

db.getTeslaIDsByEmails = function(emails, callback) {
    db.TeslaID.findAll({ where: { email: emails}}).then(callback);
};

module.exports = db;
