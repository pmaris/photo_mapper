var fs = require('fs');
var path = require('path');
var jQuery = require('jquery');
var ui = require('jquery-ui-bundle');
var ini = require('ini');
const dialog = require('electron').remote.dialog;
require('./node_modules/fancybox/dist/js/jquery.fancybox.pack.js');
require('./node_modules/fancybox/dist/helpers/js/jquery.fancybox-thumbs.js');
var GoogleMapsLoader = require('google-maps');
var geotagFinder = require('./js/geotag_finder.js');
var databaseTools = require('./js/database_tools.js');

var defaultIniPath = './config.ini';
var markers = []
var markerCluster;
var map;
var db;
var selectedFolder = null;

var filterStartTimestamp;
var filterEndTimestamp;

jQuery(document).ready(function() {
    initialize();
});

/*
 * Perform initialization tasks after the document loads, including loading the application
 * configuration, reading the geotagged photos from the database, and creating the map, with the
 * photos from the database as markers.
 */
function initialize() {
    jQuery('.fancybox').fancybox();
    jQuery.getScript('node_modules/marker-clusterer-plus/src/markerclusterer.js', function() {
       console.log('Script loaded');
    });

    // Hide modal content
    jQuery('#findPhotosModal').hide();
    jQuery('#confirmSaveMapModal').hide();

    var config = loadIni(defaultIniPath);

    if (databaseTools.tableExists(config.database.path)) {
        console.log('Loading geotagged photos from database');
        photos = databaseTools.getPhotosFromDatabase(config.database.path);
        createMarkersFromPhotos(photos);
    }
    else {
        databaseTools.createTable('db/schema.sql', config.database.path);
    }

    initializeMap(config.map.centerLatitude, config.map.centerLongitude, config.map.zoom);
}

/*
 * Load the application's configuration file.
 * @param {string} iniPath Absolute path to the application's INI configuration file.
 * @return {object} Application configuration.
 */
function loadIni(iniPath) {
    var configDefaults = {
        map: {
            centerLatitude: 37,
            centerLongitude: -122,
            zoom: 10
        },
        database: {
            path: './geotags.db'
        }
    }

    try {
        var loadedConfig = ini.parse(fs.readFileSync(iniPath, 'utf-8'));
        console.log('Loaded configuration from ini file:');
        console.log(loadedConfig);

        // Update any missing fields in the configuration object with default values
        config = jQuery.extend(true, configDefaults, loadedConfig);
    }
    catch (e) {
        console.error('Could not read configuration from ini file, setting defaults');
        console.error(e);
        config = ini.parse(ini.encode(configDefaults));
    }

    // Cast values to types required when initializing map
    config.map.centerLatitude = Number(config.map.centerLatitude);
    config.map.centerLongitude = Number(config.map.centerLongitude);
    config.map.zoom = Number(config.map.zoom);

    console.log('Configuration:');
    console.log(config);

    return config;
}

/*
 * Initialize the Google Maps object.
 * @param {number} centerLatitude Latitude of the initial center position of the map.
 * @param {number} centerLongitude Longitude of the initial center position of the map.
 * @param {number} zoom Initial zoom level of the map.
 */
function initializeMap(centerLatitude, centerLongitude, zoom) {
    fs.readFile('./google_maps.key', function (err, data) {
        if(err){
            console.log("An error ocurred reading the file :" + err.message);
            return;
        }
        else {
            GoogleMapsLoader.KEY = String(data);
        }
    });

    GoogleMapsLoader.load(function(google) {
        map = new google.maps.Map(document.getElementById('map'), {
          center: {lat: centerLatitude, lng: centerLongitude},
          zoom: zoom
        });

        console.log('Num markers: %s', markers.length);
        markerCluster = new MarkerClusterer(map, markers, {imagePath: './icons/m',
                                                           zoomOnClick: false,
                                                           ignoreHidden: true,
                                                           gridSize: 70});
        google.maps.event.addListener(markerCluster, 'clusterclick', function(cluster) {
            var clusterMarkers = [];
            for (i = 0; i < cluster.getMarkers().length; i++) {
                clusterMarkers.push({href: cluster.getMarkers()[i].photo.path,
                                    title: cluster.getMarkers()[i].photo.title});
            }
            var fancyBoxOptions = {
                padding: 5,
                helpers: {
                    thumbs: {
                        height: 50,
                        width: 50
                    }
                }
            };

            jQuery.fancybox.open(clusterMarkers, fancyBoxOptions);
        });

        // Update the markers on the map whenever the map is panned, zoomed, or when the map first
        // loads
        map.addListener('tilesloaded', function() {
            repaintMarkers(markerCluster, markers, map.getBounds(), filterStartTimestamp, filterEndTimestamp);
        });
    });
}

/*
 * Updates the visibility of the markers on the map based on the bounds of the current map view and
 * date filters, then redraws the marker clusters.
 * @param {object} cluster MarkerCluster object.
 * @param {object[]} mapMarkers Array of Google Maps Marker objects.
 * @param {object} mapBounds Google Maps LatLngBounds object.
 * @param {number} filterStart Unix timestamp representing the start of the date range. If the date
 *                             range does not have a specific start time, this can be null
 * @param {number} filterEnd Unix timestamp representing the start of the date range. If the date
 *                             range does not have a specific start time, this can be null
 */
function repaintMarkers(cluster, mapMarkers, mapBounds, filterStart, filterEnd) {
    var latitude;
    var longitude;
    var isVisible;

    console.log('Repainting markers');

    // Filter for markers within the current bounds of the map and within the dates selected with
    // the date filters, if applied
    for (i = 0; i < mapMarkers.length; i++) {
        mapMarkers[i].setMap(null);
        latitude = mapMarkers[i].getPosition().lat();
        longitude = mapMarkers[i].getPosition().lng();
        isVisible = locationWithinMapBounds(latitude, longitude, mapBounds) &&
                    dateWithinRange(mapMarkers[i].photo.createTime, filterStart, filterEnd);
        mapMarkers[i].setVisible(isVisible);
    }

    cluster.repaint();
}

/*
 * Load details of geotagged photos into the global array of markers to draw on the map.
 * @param {object[]} photos Details of geotagged photos, with the following keys:
 *                              filePath: Absolute path of the image file.
 *                              latitude: The latitude of the location where the photo was taken.
 *                              longitude: The longitude of the location where the photo was taken.
 *                              createTime: Unix timestamp representing the time the photo was
 *                                  taken.
 */
function createMarkersFromPhotos(photos) {
    GoogleMapsLoader.load(function(google) {
        var marker;
        for (i=0; i < photos.length; i++) {
            marker = new google.maps.Marker({
                            position: {lat: photos[i].latitude,
                                       lng: photos[i].longitude}
                         });

            // Store attributes of photo with the marker, for loading the photo
            marker.photo = {
              path: photos[i].filePath,
              title: path.basename(photos[i].filePath),
              createTime: photos[i].createTime
            };

            google.maps.event.addListener(marker, 'click', function() {
                jQuery.fancybox.open(
                      {href: this.photo.path, title: this.photo.title, padding: 5}
                    );
            });
            markers.push(marker);
        }
    });
}

/*
 * Update the application's configuration file with the current values in the configuration object.
 */
function saveIni() {
    console.log('Updating configuration file');
    fs.writeFileSync(defaultIniPath, ini.stringify(config));
}

/*
 * Update the starting location for the map in the application's configuration file.
 */
function saveMapStartLocation() {
    if (map) {
        console.log('Updating map start location');
        config.map.centerLatitude = map.getCenter().lat();
        config.map.centerLongitude = map.getCenter().lng();
        config.map.zoom = map.getZoom();
        saveIni();
    }
}

/*
 * Open file dialog to choose the database file containing geotags.
 */
function selectDatabase() {
    var options = {
        title: 'Select geotags database',
        defaultPath: 'geotags.db',
        filters: [
            {name: 'Databases', extensions: ['db', 'sqlite', 'sqlite3']},
            {name: 'All Files', extensions: ['*']}
        ],
        properties: ['openFile']
    };
    var files = dialog.showOpenDialog(options);

    if (files) {
        config.database.path = files[0];
        saveIni();

        photos = databaseTools.getPhotosFromDatabase(config.database.path);
        createMarkersFromPhotos(photos);
       repaintMarkers(markerCluster, markers, map.getBounds(), filterStartTimestamp, filterEndTimestamp);
    }
}

/*
 * Open the folder selector to select a folder to search for geotagged photos.
 */
function selectFolder() {
    var options = {
        title: 'Select photos folder',
        properties: ['openDirectory']
    }
    selectedFolder = dialog.showOpenDialog(options)[0];
    console.log('Selected directory: ' + selectedFolder);
    jQuery('#folderPath').html(selectedFolder);
    jQuery('#noFolderSelected').hide();
}

/*
 * Open the modal for searching for geotagged photos.
 */
function openFindPhotosModal() {
    selectedFolder = null;
    jQuery('#noFolderSelected').hide();

    var modal = jQuery('#findPhotosModal');
    modal.dialog({
        autoOpen: true,
        modal: true,
        resizable: false,
        draggable: false,
        buttons: [{
            text: 'Start',
            click: function() {
                if (selectedFolder) {
                     startPhotoFinder(selectedFolder,
                                      jQuery('#fileExtensions')[0].value.split(' '),
                                      jQuery('#updateCheckbox')[0].checked);
                }
                else {
                    jQuery('#noFolderSelected').show();
                }
            }
        }]
    });
}

/*
 * Run the geotagged photo finder.
 */
function startPhotoFinder(folderPath, fileExtensions, updatePhotos) {
    var geotaggedPhotos = geotagFinder.getGeotaggedPhotos(folderPath, fileExtensions);
    databaseTools.addGeotaggedPhotosToDatabase('D:/Programing/photo_mapper/geotags.db', geotaggedPhotos, updatePhotos);
}

/*
 * Open the modal for confirming saving the starting view of the map.
 */
function confirmSaveMapStartLocation() {
    var modal = jQuery('#confirmSaveMapModal');
    modal.dialog({
        autoOpen: true,
        modal: true,
        resizable: false,
        draggable: false,
        buttons: [
            {
                text: 'OK',
                click: function() {
                    saveMapStartLocation();
                    modal.dialog('close');
                }
            },
            {
                text: 'Cancel',
                click: function() {
                    modal.dialog('close');
                }
            }
        ],
    });
}

/*
 * Handler for when the dates to filter photos by have changed.
 */
function filterDatesChanged() {
    var filtersVisible = jQuery('#dateFilter').is(':visible');

    if (filtersVisible) {
        var startDate = jQuery('#filterBeginDate')[0].value;
        var endDate = jQuery('#filterEndDate')[0].value;

        if (startDate) {
            var d = new Date(startDate);
            filterStartTimestamp = (d.getTime() / 1000) +  (d.getTimezoneOffset() * 60);
        }
        else
        {
            filterStartTimestamp = null;
        }

        if (endDate) {
            var d = new Date(endDate);
            filterEndTimestamp = (d.getTime() / 1000) +  (d.getTimezoneOffset() * 60);
        }
        else {
            filterEndTimestamp = null;
        }
    }

    console.log('Start timestamp: %s', filterStartTimestamp);
    console.log('End timestamp: %s', filterEndTimestamp);

    repaintMarkers(markerCluster, markers, map.getBounds(), filterStartTimestamp, filterEndTimestamp);
}

/*
 * Determine if the location where a photo was taken is within the boundaries of the current map
 * view.
 * @param {number} latitude The latitude of the location where a photo was taken.
 * @param {number} longitude The longitude of the location where a photo was taken.
 * @param {object} mapBounds Google Map Bound object, representing the boundaries of the current
 *                           map view.
 * @return {boolean} True if the location where the photo was taken is within the current map view's
 *                   boundaries.
 */
function locationWithinMapBounds(latitude, longitude, mapBounds) {
    var minLat = Math.min(mapBounds.getNorthEast().lat(), mapBounds.getSouthWest().lat());
    var maxLat = Math.max(mapBounds.getNorthEast().lat(), mapBounds.getSouthWest().lat());
    var minLng = Math.min(mapBounds.getNorthEast().lng(), mapBounds.getSouthWest().lng());
    var maxLng = Math.max(mapBounds.getNorthEast().lng(), mapBounds.getSouthWest().lng());

    return (latitude <= maxLat && latitude >= minLat && longitude <= maxLng && longitude >= minLng);
}

/*
 * Determine if the timestamp of a photo's creation time is within the range between an optional
 * start and end date.
 * @param {number} createDate Unix timestamp of when a photo was created.
 * @param {number} startDate Unix timestamp representing the start of the date range. If the date
 *                           range does not have a specific start time, this can be null.
 * @param {number} endDate Unix timestamp representing the end of the date range. If the date range
 *                         does not have a specific end time, this can be null.
 * @return {boolean} True if the createDate is between the startDate and endDate, inclusive.
 */
function dateWithinRange(createDate, startDate, endDate) {
    var withinRange = true;

    if (startDate) {
        withinRange = createDate >= startDate;
    }

    if (endDate && withinRange) {
        withinRange = createDate <= endDate;
    }

    return withinRange;
}
