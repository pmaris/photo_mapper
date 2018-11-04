var fs = require('fs');
var map = require('./map.js');
var model = require('./model.js');
var ui = require('./ui.js')

const configPath = './config.json';
var config = {};
const configDefaults = {
  map: {
    centerLatitude: 37,
    centerLongitude: -122,
    zoom: 10
  },
  database: {
    path: './geotags.db'
  }
};

module.exports = {
  filterDatesChanged: filterDatesChanged,
  initialize: initialize,
  loadConfig: loadConfig,
  saveConfig: saveConfig,
  saveMapStartLocation: saveMapStartLocation
};

/*
 * Perform initialization tasks after the document loads, including initializing
 * Fancybox, loading the application's configuration, reading the geotagged
 * photos from the database, and creating the map, with the photos from the
 * database as markers.
 */
function initialize () {
  var promise = new Promise(function (resolve, reject) {
    ui.initializeFancybox();
    config = loadConfig(configPath);
    model.Photo.findAll().then(function (photos) {
      var markers = map.createMarkersFromPhotos(photos);
      map.initializeGoogleMapsLoader().then(function () {
        map.initializeMap(markers, config.map.centerLatitude, config.map.centerLongitude, config.map.zoom);
        resolve();
      });
    });
  });
  return promise;
}

/**
 * Load the application's configuration file.
 * @param {string} configPath Absolute path to the application's configuration
 *                         file.
 * @return {object} Application configuration.
 */
function loadConfig (configPath) {
  try {
    var loadedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    console.log('Loaded configuration from JSON file: ' + JSON.stringify(loadedConfig));

    // Update any missing fields in the configuration object with default values
    config = {};
    for (var key of Object.keys(configDefaults)) {
      config[key] = Object.assign({}, configDefaults[key], loadedConfig[key]);
    }
  } catch (err) {
    console.error('Could not read configuration from config file, setting defaults');
    console.error(err);
    config = JSON.parse(JSON.stringify(configDefaults));
  }

  // If any numerical value is not a number, use the default value for that field
  config.map.centerLatitude = typeof config.map.centerLatitude === 'number' ? config.map.centerLatitude : configDefaults.map.centerLatitude;
  config.map.centerLongitude = typeof config.map.centerLongitude === 'number' ? config.map.centerLongitude : configDefaults.map.centerLongitude;
  config.map.zoom = typeof config.map.zoom === 'number' ? config.map.zoom : configDefaults.map.zoom;

  console.log('Configuration: ' + JSON.stringify(config));

  return config;
}

/*
 * Update the application's configuration file with the current values in the
 * configuration object.
 */
function saveConfig () {
  console.log('Updating configuration file');
  fs.writeFileSync(configPath, JSON.stringify(config));
}

/*
 * Update the starting location for the map in the application's configuration
 * file.
 */
function saveMapStartLocation () {
  if (map.googleMap) {
    console.log('Updating map start location');

    if (!config.map) {
      config.map = {};
    };

    config.map.centerLatitude = map.googleMap.getCenter().lat();
    config.map.centerLongitude = map.googleMap.getCenter().lng();
    config.map.zoom = map.googleMap.getZoom();
    saveConfig();
  }
}

/*
 * Handler for when the dates to filter photos by have changed, to repaint the
 * markers on the map that should be visible with the current date filters.
 */
function filterDatesChanged () {
  if (ui.filtersAreVisible()) {
    var filterStartTimestamp = ui.getDateFilterStart();
    var filterEndTimestamp = ui.getDateFilterEnd();

    if (!filterStartTimestamp) {
      filterStartTimestamp = Number.MIN_VALUE;
    }

    if (!filterEndTimestamp) {
      filterEndTimestamp = Number.MAX_VALUE;
    }

    console.log('Start timestamp: %s', filterStartTimestamp);
    console.log('End timestamp: %s', filterEndTimestamp);

    map.repaintMarkers(map.googleMap.getBounds(), filterStartTimestamp, filterEndTimestamp);
  }
}
