global.jQuery = require('jquery');
var $ = global.jQuery;
require('jquery-ui-bundle');
var fs = require('fs');
var path = require('path');
require(path.join(__dirname, '../node_modules/fancybox/dist/js/jquery.fancybox.pack.js'));
require(path.join(__dirname, '../node_modules/fancybox/dist/helpers/js/jquery.fancybox-thumbs.js'));
var geotagFinder = require(path.join(__dirname, 'geotag_finder.js'));
var map = require(path.join(__dirname, 'map.js'));
var model = require(path.join(__dirname, 'model.js'));

const dialog = require('electron').remote.dialog;

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

var cancelFinder;
var selectedFolder;

module.exports = {
  confirmSaveMapStartLocation: confirmSaveMapStartLocation,
  filtersAreVisible: filtersAreVisible,
  filterDatesChanged: filterDatesChanged,
  getDateFilterEnd: getDateFilterEnd,
  getDateFilterStart: getDateFilterStart,
  getMapElement: getMapElement,
  initialize: initialize,
  initializeFancybox: initializeFancybox,
  loadConfig: loadConfig,
  markerOnClick: markerOnClick,
  openFindPhotosModal: openFindPhotosModal,
  saveConfig: saveConfig,
  saveMapStartLocation: saveMapStartLocation,
  selectDatabase: selectDatabase,
  selectFolder: selectFolder
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
 * Open the modal for confirming saving the starting view of the map.
 */
function confirmSaveMapStartLocation () {
  var modal = $('#confirm-save-map');
  modal.dialog({
    autoOpen: true,
    modal: true,
    resizable: false,
    draggable: false,
    closeOnEscape: false,
    open: function (event, ui) { $('.ui-dialog-titlebar-close').hide(); },
    buttons: [
      {
        text: 'OK',
        click: function () {
          saveMapStartLocation();
          modal.dialog('close');
        }
      },
      {
        text: 'Cancel',
        click: function () {
          modal.dialog('close');
        }
      }
    ]
  });
}

function confirmCancelFinder () {
  var modal = $('#confirm-cancel-finder');
  modal.dialog({
    autoOpen: true,
    modal: true,
    resizable: false,
    draggable: false,
    closeOnEscape: false,
    open: function (event, ui) { $('.ui-dialog-titlebar-close').hide(); },
    buttons: [
      {
        text: 'Cancel search',
        'class': 'button-red',
        click: function () {
          cancelFinder = true;
          modal.dialog('close');
          $('#finder-progress-modal').dialog('destroy');
        }
      },
      {
        text: 'Continue search',
        'class': 'button-blue',
        click: function () {
          modal.dialog('close');
        }
      }
    ]
  });
}

function initFinderUi () {
  $('#progress-bar-label').text('Counting photos');
  $('#finder-progress-bar').progressbar({
    value: false
  });
  $('#finder-result').hide();
  $('#finder-result').text('');
  $('#close-finder-modal-button').hide()
}

function filtersAreVisible () {
  return $('#date-filter').is(':visible');
};

/*
 * Handler for when the dates to filter photos by have changed, to repaint the
 * markers on the map that should be visible with the current date filters.
 */
function filterDatesChanged () {
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

    map.repaintMarkers(map.getMap().getBounds(), filterStartTimestamp, filterEndTimestamp);
  }
}

/**
 * Get the value of the date input in the UI with the ending date for the filter
 * to only show photos on the map taken in a specific date range.
 * @return {number} Unix epoch timestamp of the ending day of the date filter
 *                  range, or null if the filter has not been set.
 */
function getDateFilterEnd () {
  var endDate = $('#filter-end-date')[0].value;
  if (endDate) {
    var end = new Date(endDate);
    return (end.getTime() / 1000) + (end.getTimezoneOffset() * 60) + (60 * 60 * 24) - 1;
  } else {
    return null;
  }
};

/**
 * Get the value of the date input in the UI with the starting date for the
 * filter to only show photos on the map taken in a specific date range.
 * @return {number} Unix epoch timestamp of the starting day of the date filter
 *                  range, or null if the filter has not been set.
 */
function getDateFilterStart () {
  var startDate = $('#filter-begin-date')[0].value;
  if (startDate) {
    var start = new Date(startDate);
    return (start.getTime() / 1000) + (start.getTimezoneOffset() * 60);
  } else {
    return null;
  }
};

function getMapElement () {
  return document.getElementById('map');
};

/*
 * Perform initialization tasks after the document loads, including initializing
 * Fancybox, loading the application's configuration, reading the geotagged
 * photos from the database, and creating the map, with the photos from the
 * database as markers.
 */
function initialize () {
  var promise = new Promise(function (resolve, reject) {
    initializeFancybox();
    config = loadConfig(configPath);
    model.Photo.findAll().then(function (photos) {
      var markers = map.createMarkersFromPhotos(photos);
      map.initializeGoogleMapsLoader().then(function () {
        map.setupMap(getMapElement(), {
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
  return promise;
}

function initializeFancybox () {
  $('.fancybox').fancybox();
};

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

function markerOnClick () {
  $.fancybox.open({ href: this.photo.path, title: this.photo.title, padding: 5 });
};

/*
 * Open the modal for searching for geotagged photos.
 */
function openFindPhotosModal () {
  selectedFolder = null;
  $('#no-folder-selected').hide();

  $('#find-photos-modal').dialog({
    autoOpen: true,
    modal: true,
    dialogClass: 'no-close',
    resizable: false,
    draggable: false,
    closeOnEscape: false,
    open: function (event, ui) { $('.ui-dialog-titlebar-close').hide(); },
    buttons: [
      {
        text: 'Cancel',
        'class': 'button-red',
        click: function () {
          $('#find-photos-modal').dialog('destroy');
        }
      },
      {
        text: 'Start',
        'class': 'button-blue',
        click: function () {
          if (selectedFolder) {
            startPhotoFinder(selectedFolder,
              $('#file-extensions')[0].value.split(' '),
              $('#update-photos-checkbox')[0].checked);
          } else {
            $('#no-folder-selected').show();
          }
        }
      }
    ]
  });
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

/*
 * Open file dialog to choose the database file containing geotags.
 */
function selectDatabase () {
  var options = {
    title: 'Select geotags database',
    defaultPath: 'geotags.db',
    filters: [
      { name: 'Databases', extensions: ['db', 'sqlite', 'sqlite3'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  };
  var files = dialog.showOpenDialog(options);

  if (files) {
    config.database.path = files[0];
    saveConfig();

    model.Photo.findAll().then(photos => {
      map.createMarkersFromPhotos(photos, markerOnClick);
    });
    map.repaintMarkers(map.getBounds(), getDateFilterStart(), getDateFilterEnd());
  }
}

/*
 * Open the folder selector to select a folder to search for geotagged photos.
 */
function selectFolder () {
  var options = {
    title: 'Select photos folder',
    properties: ['openDirectory']
  }
  selectedFolder = dialog.showOpenDialog(options)[0];
  console.log('Selected directory: ' + selectedFolder);
  $('#folder-path').val(selectedFolder);
  $('#no-folder-selected').hide();
}

/**
 * Setter for the max value for the progress bar shown in the UI when adding
 * geotagged photos to the application database and for finding photos without
 * geotags.
 * @param {number} maxValue The maximum value to set for the progress bar.
 */
function setProgressBarMax (maxValue) {
  $('#finder-progress-bar').progressbar('option', 'max', maxValue);
  $('#finder-progress-bar').progressbar('option', 'value', 0);
}

/*
 * Setter for the current value for the progress bar shown in the UI when adding
 * geotagged photos to the application database and for finding photos without
 * geotags.
 * @param {number} value The value to set for the progress bar.
 */
function setProgressBarValue (value) {
  $('#finder-progress-bar').progressbar('option', 'value', value);
  $('#progress-bar-label').text(value + ' / ' + $('#finder-progress-bar').progressbar('option', 'max') + ' photos checked');
}

/*
 * Run the geotagged photo finder.
 */
function startPhotoFinder (folderPath, fileExtensions, updatePhotos) {
  $('#find-photos-modal').dialog('destroy');
  var modal = $('#finder-progress-modal');
  modal.dialog({
    autoOpen: true,
    modal: true,
    resizable: false,
    draggable: false,
    title: 'Searching for geotagged photos',
    closeOnEscape: false,
    open: function (event, ui) { $('.ui-dialog-titlebar-close').hide(); },
    buttons: [
      {
        text: 'Cancel',
        'class': 'button-red',
        id: 'cancel-finder-button',
        click: function () {
          confirmCancelFinder();
        }
      },
      {
        text: 'Close',
        'class': 'button-blue',
        id: 'close-finder-modal-button',
        click: function () {
          modal.dialog('destroy');
        }
      }
    ]
  });

  initFinderUi();

  cancelFinder = false;

  geotagFinder.getPhotoPaths(folderPath, fileExtensions).then(function (photos) {
    setProgressBarMax(photos.length);
    geotagFinder.getPhotoGeotags(photos, setProgressBarValue, 100, function (geotaggedPhotos) {
      $('#progress-bar-label').text('Adding photos to database');
      console.log('DONE');
      model.Photo.bulkCreate(geotaggedPhotos, { updateOnDuplicate: ['latitude', 'longitude'] });
      map.repaintMarkers(map.getBounds(), getDateFilterStart(), getDateFilterEnd());

      $('#finder-result').show();
      var resultString = 'Number of photos added: ' + geotaggedPhotos.length;
      if (updatePhotos) {
        resultString += '<br>Number of photos updated: ' + updatePhotos.length;
      }
      $('#finder-result').html(resultString);
      $('#progress-bar-label').text('Finished');

      $('#close-finder-modal-button').show();
      $('#cancel-finder-button').hide();
      console.log($('#close-finder-modal-button'));
    });
  });
}
