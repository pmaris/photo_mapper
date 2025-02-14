const Sequelize = require('sequelize');
var path = require('path');

const sequelize = new Sequelize({
    dialect:'sqlite',
    storage: path.join(__dirname, '../geotags.db')
});

// Database file must be created if it doesn't already exist before defining the
// model
sequelize.sync();

export const Photo = sequelize.define('photos', {
  path: {
    type: Sequelize.STRING,
    primaryKey: true
  },
  latitude: Sequelize.DOUBLE,
  longitude: Sequelize.DOUBLE,
  create_time: Sequelize.INTEGER
});

Photo.sync();
