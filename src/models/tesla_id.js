"use strict";

module.exports = function(sequelize, DataTypes) {
    var TeslaID = sequelize.define("TeslaID", {
        tesla_id: {
            type: DataTypes.UUID,
            primaryKey: true
        },
        email: DataTypes.STRING,
        public_key: DataTypes.BLOB,
        private_key: DataTypes.BLOB
    }, {
        indexes: [
            {
              unique: true,
              fields: ['email']
            }
        ]
    });

    return TeslaID;
};

