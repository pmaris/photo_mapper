var fs = require('fs');
var sql = require('sql.js');

module.exports = {
    addGeotaggedPhotosToDatabase: addGeotaggedPhotosToDatabase,
    createTable: createTable,
    getPhotosFromDatabase: getPhotosFromDatabase,
    tableExists: tableExists
}

/**
 * Write details of geotagged photos to a SQLite database.
 * @param {string} databasePath Absolute path of the SQLite database file.
 * @param {object[]} geotaggedPhotos Details of photos that have geotags in their EXIF metadata,
 *                                   with the following keys:
 *                                       filePath: Absolute path of the image file.
 *                                       latitude: The latitude of the location where the photo was
 *                                           taken.
 *                                       longitude: The longitude of the location where the photo
 *                                           was taken.
 *                                       createTime: Unix timestamp representing the time the photo
 *                                           was taken.
 * @param {boolean} updateExistingPhotos If true, the location and create time of photos that are
 *                                       already in the database (As determined by the file_path)
 *                                       will be updated.
 * @return {object} counts of the numbers of photos that were added and updated in the database:
 *                      numAdded: Count of the number of photos that were added to the database.
 *                      numUpdate: Count of the number of existing photos in the database that were
 *                          updated. Note that photos are counted as updated even if their values in
 *                          the database did not change.
 */
function addGeotaggedPhotosToDatabase(databasePath, geotaggedPhotos, updateExistingPhotos) {
    var db = new SQL.Database(fs.readFileSync(databasePath));

    var selectStatement = db.prepare('SELECT * FROM geotags WHERE file_path=:file_path');

    var insertSql = 'INSERT INTO geotags (file_path, latitude, longitude, create_time) ';
    insertSql += 'VALUES (:file_path, :latitude, :longitude, :create_time);';
    var insertStatement = db.prepare(insertSql);

    var updateSql = 'UPDATE geotags SET latitude=:latitude, longitude=:longitude, ';
    updateSql += 'create_time=:create_time WHERE file_path=:file_path';
    var updateStatement = db.prepare(updateSql);

    var photoExistsInDb;
    var currentPhoto;
    var photoObject;
    var numAdded = 0;
    var numUpdated = 0;

    for (i = 0; i < geotaggedPhotos.length; i++) {
        currentPhoto = geotaggedPhotos[i];

        // Check if photo is already in the database by querying for file path, and checking if the
        // result is a non-empty object
        selectStatement.step();
        photoObject = selectStatement.getAsObject({':file_path': currentPhoto.filePath});
        photoExistsInDb = Object.keys(photoObject).length > 0;

        if (!photoExistsInDb) {
            console.log('Adding geotags for file ' + currentPhoto.filePath + ' to database');
            insertStatement.run({':file_path': currentPhoto.filePath,
                                 ':latitude': currentPhoto.latitude,
                                 ':longitude': currentPhoto.longitude,
                                 ':create_time': currentPhoto.createTime});
            numAdded++;
        }
        else if (photoExistsInDb && updateExistingPhotos) {
            console.log('Updating existing photo in database');

            updateStatement.run({':file_path': currentPhoto.filePath,
                                 ':latitude': currentPhoto.latitude,
                                 ':longitude': currentPhoto.longitude,
                                 ':create_time': currentPhoto.createTime});
            numUpdated++;
        }
        else
        {
            console.log('Photo already exists in database, will not update');
        }
    }

    fs.writeFile(databasePath, new Buffer(db.export()));

    return {numAdded: numAdded,
            numUpdated: numUpdated};
}

/**
 * Creates a table in a SQLite database from a SQL script file and writes the database to a file
 * @param {string} createTablePath Absolute path of the .sql file containing the create table
 *                                 script for the database.
 * @param {string} databasePath Absolute path to write the SQLite database to. If this is not the
 *                              path of an existing database, a new datbase will be created.
 */
function createTable(createTablePath, databasePath) {
    console.log('Creating table in database from file %s', createTablePath);
    var db = new sql.Database();
    var statement = fs.readFileSync(createTablePath, 'utf-8');
    db.run(statement);
    fs.writeFile(databasePath, new Buffer(db.export()));
    console.log('created database');
}

/**
 * Get all geotagged photos from the database.
 * @param {string} databasePath Absolute path to write the SQLite database to. If this is not the
 *                              path of an existing database, a new datbase will be created.
 * @return {object[]} Details of photos in the database, with the following keys:
 *                        createTime: Unix timestamp representing the time the photo was taken.
 *                        filePath: Absolute path of the image file.
 *                        latitude: The latitude of the location where the photo was taken.
 *                        longitude: The longitude of the location where the photo was taken.
 */
function getPhotosFromDatabase(databasePath) {
    var photos = [];

    var fileBuffer = fs.readFileSync(databasePath);
    var db = new SQL.Database(fileBuffer);

    var query = 'SELECT latitude, longitude, file_path, create_time FROM geotags ORDER BY create_time DESC';
    var rows = db.exec(query);
    console.log('Reading ' + rows[0].values.length + ' geotagged photos from the database');

    var latitudeIndex = rows[0].columns.indexOf('latitude');
    var longitudeIndex = rows[0].columns.indexOf('longitude');
    var filePathIndex = rows[0].columns.indexOf('file_path');
    var createTimeIndex = rows[0].columns.indexOf('create_time');

    var photo;

    for (i = 0; i < rows[0].values.length; i ++) {
        photo = rows[0].values[i];

        photos.push({
            createTime: photo[createTimeIndex],
            filePath: photo[filePathIndex],
            latitude: photo[latitudeIndex],
            longitude: photo[longitudeIndex],
        });
    }

    return photos;
}

/**
 * Get all geotagged photos from the database.
 * @param {string} databasePath Absolute path to write the SQLite database to. If this is not the
 *                              path of an existing database, a new datbase will be created.
 * @return {boolean} Indicated if the table exists in the database or not.
 */
function tableExists(databasePath) {
    var exists = true;

    if (fs.existsSync(databasePath)) {
        console.log('Database file %s exists', databasePath);

        var fileBuffer = fs.readFileSync(databasePath);
        var db = new SQL.Database(fileBuffer);
        var result = db.exec('SELECT * FROM sqlite_master WHERE type="table" and name="geotags"');
        if (result.length == 0) {
            console.log('geotags table does not exist in database');
            exists = false;
        }
    }
    else {
        console.log('Database file %s does not exist', databasePath);
        exists = false;
    }

    return exists;
}
