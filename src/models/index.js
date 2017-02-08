"use strict";

var fs        = require("fs");
var path      = require("path");
var Sequelize = require("sequelize");
var env       = process.env.NODE_ENV || "development";
var db        = {};
/*
var db_config = {
    "username": process.env.DB_USER | 'tesla',
    "password": process.env.DB_PASSWORD | 'TeSLApassword',
    "database": process.env.DB_NAME | "TeSLAdb",
    "host": process.env.DB_HOST | 'tip-db',
    "port": process.env.DB_PORT | 5432,
    "dialect": "postgres"
  };
*/
var db_config = {
    "username": 'tesla',
    "password": 'TeSLApassword',
    "database": 'TeSLAdb',
    "host": 'tip-db',
    "port": 5432,
    "dialect": "postgres"
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

db.getConfigSync = function() {
  var ret_val = null;
  db.Config.findAll().then(function(data) {
    if(data) {
      ret_val = data[0];
    } else {
      db.Config.create().then(function (data) {
        if (data) {
          ret_val = data;
        } else {
          ret_val = {};
        }
      });
    }
  });
  while(!ret_val);

  return ret_val;
};

module.exports = db;
