const Sequelize = require('sequelize');

module.exports = {
    Photo: Photo,
};

const sequelize = new Sequelize('sqlite:../geotags.db');

const Photo = sequelize.define('photo', {
    path: Sequelize.STRING,
    latitude: Sequelize.DOUBLE,
    longitude: Sequelize.DOUBLE,
    create_time: Sequelize.INTEGER
});

Photo.sync();
