const Sequelize = require('sequelize');

const sequelize = new Sequelize('sqlite:../geotags.db');

// Database file must be created if it doesn't already exist before defining the
// model
sequelize.sync();

const Photo = sequelize.define('photos', {
  path: {
    type: Sequelize.STRING,
    primaryKey: true
  },
  latitude: Sequelize.DOUBLE,
  longitude: Sequelize.DOUBLE,
  create_time: Sequelize.INTEGER
});

Photo.sync();

module.exports = {
  Photo: Photo
};
