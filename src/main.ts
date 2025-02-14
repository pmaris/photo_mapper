import { readFileSync, writeFileSync } from "fs"
import { join } from "path"

import { createMarkersFromPhotos, getMap, initializeGoogleMapsLoader, repaintMarkers, setupMap } from "./map"
import { Photo } from "./model"
import type { Config } from "./types"
import { getDateFilterEnd, getDateFilterStart, filtersAreVisible, getMapElement, initializeFancybox, markerOnClick } from "./ui"

global.jQuery = require('jquery');

export const configPath = join(__dirname, '../config.json');
export var config: Config = {};
export const configDefaults: Config = {
  map: {
    centerLatitude: 37,
    centerLongitude: -122,
    zoom: 10
  }
};

/*
 * Handler for when the dates to filter photos by have changed, to repaint the
 * markers on the map that should be visible with the current date filters.
 */
export function filterDatesChanged () {
  if (filtersAreVisible()) {
    var filterStartTimestamp = getDateFilterStart();
    var filterEndTimestamp = getDateFilterEnd();

    if (!filterStartTimestamp) {
      filterStartTimestamp = Number.MIN_VALUE;
    }

    if (!filterEndTimestamp) {
      filterEndTimestamp = Number.MAX_VALUE;
    }

    console.log('Start timestamp: %s', filterStartTimestamp);
    console.log('End timestamp: %s', filterEndTimestamp);

    repaintMarkers(getMap().getBounds(), filterStartTimestamp, filterEndTimestamp);
  }
}

/*
 * Perform initialization tasks after the document loads, including initializing
 * Fancybox, loading the application's configuration, reading the geotagged
 * photos from the database, and creating the map, with the photos from the
 * database as markers.
 */
export function initialize (): Promise<null> {
  var promise: Promise<null> = new Promise(function (resolve, reject) {
    initializeFancybox();
    config = loadConfig(configPath);
    Photo.findAll().then(function (photos: typeof Photo[]) {
      initializeGoogleMapsLoader().then(function () {
        createMarkersFromPhotos(photos, markerOnClick).then((markers: google.maps.Marker[]) => {
          setupMap(getMapElement(), {
            center: {
              lat: config.map.centerLatitude,
              lng: config.map.centerLongitude
            },
            zoom: config.map.zoom
          }, markers);
          resolve(null);
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
export function loadConfig (configPath: string): Config {
  try {
    var loadedConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
    console.log('Loaded configuration from JSON file: ' + JSON.stringify(loadedConfig));

    // Update any missing fields in the configuration object with default values
    config = {};
    for (var key of Object.keys(configDefaults)) {
      config[key] = Object.assign({}, configDefaults[key], loadedConfig[key]);
    }
  } catch (err) {
    console.error('Could not read configuration from config file, setting defaults');
    console.error(err);
    config = configDefaults;
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
 * @param {Config} newConfig The new configuration to save
 */
export function saveConfig (newConfig: Config) {
  console.log('Updating configuration file');
  writeFileSync(configPath, JSON.stringify(newConfig));
}

/*
 * Update the starting location for the map in the application's configuration
 * file.
 */
export function saveMapStartLocation () {
  var googleMap = getMap();
  if (googleMap) {
    console.log('Updating map start location');

    if (!config.map) {
      config.map = {};
    };

    config.map.centerLatitude = googleMap.getCenter().lat();
    config.map.centerLongitude = googleMap.getCenter().lng();
    config.map.zoom = googleMap.getZoom();
    saveConfig(config);
  }
}
