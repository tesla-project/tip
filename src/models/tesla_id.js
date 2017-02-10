"use strict";

module.exports = function(sequelize, DataTypes) {
    var TeslaID = sequelize.define("TeslaID", {
        tesla_id: {
            type: DataTypes.STRING,
            primaryKey: true
        },
        email: DataTypes.STRING
    });

    //TODO: Index by email, ensure is unique
    return TeslaID;
};
