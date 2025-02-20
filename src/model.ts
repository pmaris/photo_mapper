import { Sequelize, DOUBLE, STRING, INTEGER } from 'sequelize';
import { join } from 'path';

import * as A from 'sqlite3'

const DATABASE_FILENAME = 'photos.db'

const sequelize = new Sequelize({
    dialect:'sqlite',
    storage: DATABASE_FILENAME
});

// Database file must be created if it doesn't already exist before defining the
// model
sequelize.sync();

export const Photo = sequelize.define('photos', {
  path: {
    type: STRING,
    primaryKey: true
  },
  latitude: DOUBLE,
  longitude: DOUBLE,
  create_time: INTEGER
});

Photo.sync();
