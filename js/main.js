global.jQuery = require('jquery');
var $ = global.jQuery;
require('jquery-ui-bundle');
var fs = require('fs');
var path = require('path');
require(path.join(__dirname, '../node_modules/fancybox/dist/js/jquery.fancybox.pack.js'));
require(path.join(__dirname, '../node_modules/fancybox/dist/helpers/js/jquery.fancybox-thumbs.js'));
var map = require(path.join(__dirname, 'map.js'));
var model = require(path.join(__dirname, 'model.js'));
var ui = require(path.join(__dirname, 'ui.js'));

const fancyBoxOptions = {
  padding: 5,
  helpers: {
    thumbs: {
      height: 50,
      width: 50
    }
  }
};
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
  clusterClick: clusterClick,
  filterDatesChanged: filterDatesChanged,
  initialize: initialize,
  loadConfig: loadConfig,
  saveMapStartLocation: saveMapStartLocation,
  saveSelectedDatabase: saveSelectedDatabase
};

/**
 * Handler for when a cluster of markers on the map is clicked on to open all of
 * the photos in the cluster with Fancybox.
 * @param {MarkerCluster} cluster Cluster of markers on the map.
 */
function clusterClick (cluster) {
  var markers = [];
  for (var i = 0; i < cluster.getMarkers().length; i++) {
    markers.push({
      href: cluster.getMarkers()[i].photo.path,
      title: cluster.getMarkers()[i].photo.title
    });
  }
  $.fancybox.open(markers, fancyBoxOptions);
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

    map.repaintMarkers(map.getMap().getBounds(), filterStartTimestamp, filterEndTimestamp);
  }
}

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
      map.initializeGoogleMapsLoader().then(function () {
        map.createMarkersFromPhotos(photos, ui.markerOnClick).then(markers => {
          map.setupMap(ui.getMapElement(), {
            center: {
              lat: config.map.centerLatitude,
              lng: config.map.centerLongitude
            },
            zoom: config.map.zoom
          }, markers, clusterClick);
          resolve();
        });
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
  var googleMap = map.getMap();
  if (googleMap) {
    console.log('Updating map start location');

    if (!config.map) {
      config.map = {};
    };

    config.map.centerLatitude = googleMap.getCenter().lat();
    config.map.centerLongitude = googleMap.getCenter().lng();
    config.map.zoom = googleMap.getZoom();
    saveConfig();
  }
}

/**
 * Save the selected database file to the application's configuration file, and
 * display the photos in that database on the map.
 * @param {string} databasePath Absolute path to the selected database.
 */
function saveSelectedDatabase (databasePath) {
  var promise = new Promise(function (resolve) {
    config.database.path = databasePath;
    saveConfig();

    model.Photo.findAll().then(photos => {
      map.createMarkersFromPhotos(photos, ui.markerOnClick);
      map.repaintMarkers(map.getMap().getBounds(), ui.getDateFilterStart(), ui.getDateFilterEnd());
      resolve();
    });
  })
  return promise;
}
