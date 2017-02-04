var sql = require('sql.js');
var fs = require('fs');
var path = require('path');
var jQuery = require('jquery');
var ini = require('ini');
const dialog = require('electron').remote.dialog;
require('./dependencies/markerclusterer.js');
require('./node_modules/fancybox/dist/js/jquery.fancybox.pack.js');
require('./node_modules/fancybox/dist/helpers/js/jquery.fancybox-thumbs.js');
var GoogleMapsLoader = require('google-maps');

var config;
var configPath = './config.ini';
var markers = [];
var markerCluster;
var map;
var db;
var filterEnabled = true;

jQuery(document).ready(function() {
    jQuery(".fancybox").fancybox();
    console.log('ready');
    jQuery('#filterEnable').click(function () {
        filterEnabled = !filterEnabled;
        if (filterEnabled) {
            jQuery('#filterInput').show();
            jQuery('#filterEnable').text('Disable filters');
        }
        else {
            jQuery('#filterInput').hide();
            jQuery('#filterEnable').text('Filter photos');
        }
    })

    initializeMap();
});

/*
 * Load the application's configuration file.
 */
function loadIni() {
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
        var loadedConfig = ini.parse(fs.readFileSync(configPath, 'utf-8'));
        console.log('Loaded configuration from ini file:');
        console.log(loadedConfig);

        // Update any missing fields in the configuration object with default values
        config = jQuery.extend(true, configDefaults, loadedConfig);
    }
    catch (e) {
        console.log('Could not read configuration from ini file, setting defaults');
        console.log(e);
        config = ini.parse(ini.encode(configDefaults));
    }

    // Cast values to types required when initializing map
    config.map.centerLatitude = Number(config.map.centerLatitude);
    config.map.centerLongitude = Number(config.map.centerLongitude);
    config.map.zoom = Number(config.map.zoom);

    console.log('Configuration:');
    console.log(config);
}

/*
 * Update the application's configuration file with the current values in the configuration object.
 */
function saveIni() {
    console.log('Updating configuration file');
    fs.writeFileSync(configPath, ini.stringify(config));
}

/*
 * Update the starting location for the map in the application's configuration file.
 */
function setMapStartLocation() {
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

    console.log('Selected file: ' + files[0]);
    config.database.path = files[0];
    loadDatabase(config.database.path);
    saveIni();
}

/*
 * Initialize the Google Maps object.
 */
function initializeMap() {
    if (!config) {
        loadIni();
    }

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
          center: {lat: config.map.centerLatitude, lng: config.map.centerLongitude},
          zoom: config.map.zoom
        });

        // Update the markers on the map whenever the map is panned, zoomed, or when the map first
        // loads
        map.addListener('tilesloaded', function() {
            drawMarkers();
        });

        loadDatabase(config.database.path);
    });
}

/*
 *
 */
function drawMarkers() {
    console.log('Drawing markers on map');
    if (!map) {
      return;
    }
    var bounds = map.getBounds();
    if (!bounds) {
      console.log('Map not initialized');
      return;
    }
    var minLat = Math.min(bounds.getNorthEast().lat(), bounds.getSouthWest().lat());
    var maxLat = Math.max(bounds.getNorthEast().lat(), bounds.getSouthWest().lat());
    var minLng = Math.min(bounds.getNorthEast().lng(), bounds.getSouthWest().lng());
    var maxLng = Math.max(bounds.getNorthEast().lng(), bounds.getSouthWest().lng());

    var latitude;
    var longitude;
    var clusterMarkers = [];
    // Filter for markers within the current bounds of the map
    for (i = 0; i < markers.length; i++) {
        latitude = markers[i].getPosition().lat();
        longitude = markers[i].getPosition().lng();
        if (latitude <= maxLat && latitude >= minLat && longitude <= maxLng && longitude >= minLng) {
          clusterMarkers.push(markers[i]);
        }
    }

    markerCluster = new MarkerClusterer(map, markers, {imagePath: './icons/m', zoomOnClick: false});
    google.maps.event.addListener(markerCluster, 'clusterclick', function(cluster) {
        var clusterPhotos = [];
        for (i = 0; i < cluster.getMarkers().length; i++) {
            clusterPhotos.push({href: cluster.getMarkers()[i].photo.path,
                                title: cluster.getMarkers()[i].photo.title});
        }
        jQuery.fancybox.open(
              clusterPhotos,
              {padding: 5,
               helpers: {
                    thumbs: {
                      height: 50,
                      width: 50
                    }
               }}
            );
    });
}

/*
 * Load details of geotagged photos from a database.
 * @param {string} Absolute path of the database containing geotags to load.
 */
function loadDatabase(dbPath) {
    fs.readFile(dbPath, function (err, data) {
        if(err){
            console.log("An error ocurred reading the file :" + err.message);
            return;
        }
        // Change how to handle the file content
        var uInt8Array = new Uint8Array(data);
        db = new SQL.Database(uInt8Array);

        query = 'SELECT * FROM geotags';
        geotags = db.exec(query);

        var latitudeIndex = geotags[0].columns.indexOf('latitude');
        var longitudeIndex = geotags[0].columns.indexOf('longitude');
        var fileNameIndex = geotags[0].columns.indexOf('file_name');
        var filePathIndex = geotags[0].columns.indexOf('file_path');
        var photoData;
        markers = [];
        var marker;
        var info;
        var photoPath;
        var photoTitle;
        for (i = 0; i < geotags[0].values.length; i ++) {
            photoData = geotags[0].values[i];
            if (photoData.length != 4) {
              console.log('ERROR: ' + photoData);
              continue;
            }

            marker = new google.maps.Marker({
                            position: {lat: photoData[latitudeIndex],
                                        lng: photoData[longitudeIndex]}
                         });

            // Store attributes of photo with the marker, for loading the photo
            marker.photo = {
              path: path.join(photoData[filePathIndex], photoData[fileNameIndex]),
              title: photoData[fileNameIndex]
            };

            google.maps.event.addListener(marker, 'click', function() {
                jQuery.fancybox.open(
                      {href : this.photo.path, title: this.photo.title, padding: 5}
                    );
            });
            markers.push(marker);
        }
    });
}
