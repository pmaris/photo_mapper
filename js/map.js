var fs = require('fs');
var path = require('path');
var $ = global.jQuery;
require('jquery-ui-bundle');
require(path.join(__dirname, '../node_modules/@fancyapps/fancybox/dist/jquery.fancybox.min.js'));
var GoogleMapsLoader = require('google-maps');
var MarkerClusterer = require('marker-clusterer-plus');

var google;
var googleMap;
var markerCluster;

const fancyBoxOptions = {
  loop: false
};
const markerClusterOptions = {
  photoPath: path.join(__dirname, '../icons/m'),
  zoomOnClick: false,
  ignoreHidden: true,
  gridSize: 70
};

module.exports = {
  createMarkerClusters: createMarkerClusters,
  createMarkersFromPhotos: createMarkersFromPhotos,
  getMap: getMap,
  initializeGoogleMapsLoader: initializeGoogleMapsLoader,
  repaintMarkers: repaintMarkers,
  setupMap: setupMap
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
      src: cluster.getMarkers()[i].photo.path,
      opts: {
        caption: cluster.getMarkers()[i].photo.title
      }
    });
  }
  $.fancybox.open(markers, fancyBoxOptions);
}

/**
 * Create the marker clusters for the map.
 * @param {google.maps.Marker[]} markers Google Map markers for all photos to
 *                                       display on the map.
 * @return {Promise} Resolves once the marker clusters have been created.
 */
function createMarkerClusters(markers) {
  var promise = new Promise( function (resolve) {
    markerCluster = new MarkerClusterer(googleMap, markers, markerClusterOptions);
    google.maps.event.addListener(markerCluster, 'clusterclick', clusterClick);
    resolve();
  });
  return promise;
}

/**
 * Create Google Maps markers for provided photos.
 * @param {object[]} photos Details of geotagged photos, with the following
 *                          keys and values:
 *                            path: Absolute path of the photo file.
 *                            latitude: The latitude of the location where the
 *                              photo was taken.
 *                            longitude: The longitude of the location where
 *                              the photo was taken.
 *                            create_time: Unix timestamp representing the time
 *                              the photo was taken.
 * @param {function} onClick Function to call when a map marker is clicked on.
 * @return {Promise} Resolves with an array of markers for all of the provided
 *                   photos. The position of the marker is the location where
 *                   the corresponding photo was taken, and each marker has a
 *                   "photo" object with additional attributes of the photo,
 *                   with the following keys and values:
 *                     path: Absolute path of the photo file.
 *                     title: Filename of the photo, without the file extension.
 *                     createTime: Unix timestamp representing the time the
 *                       photo was taken.
 */
function createMarkersFromPhotos (photos, onClick) {
  var promise = new Promise(function (resolve, reject) {
    var markers = [];
    for (var i = 0; i < photos.length; i++) {
      var marker = new google.maps.Marker({
        position: {
          lat: photos[i].latitude,
          lng: photos[i].longitude
        }
      });

      // Store attributes of photo with the marker, for display on the map
      marker.photo = {
        path: photos[i].path,
        title: path.basename(photos[i].path, path.extname(photos[i].path)),
        createTime: photos[i].create_time
      };

      google.maps.event.addListener(marker, 'click', onClick);
      markers.push(marker);
    }
    resolve(markers);
  });
  return promise;
};

/**
 * Retrieve the module's Google Map instance.
 * @return {google.maps.Map} The module's Google Map object. This can be
 *                           undefined if the method is called before the map
 *                           has been initialized.
 */
function getMap () {
  return googleMap;
}

/**
 * Initialize the GoogleMapsLoader by setting the Google Maps API key and then
 * calling the GoogleMapsLoader's load function, and sets the global google
 * variable after the GoogleMapsLoader has loaded.
 sets the global google value with
 * @return {Promise} Resolves once the GoogleMapsLoader has loaded, and the
 *                   global google variable has been set. Rejects if the
 *                   Google Maps key file cannot be read.
 */
function initializeGoogleMapsLoader () {
  var promise = new Promise(function (resolve, reject) {
    fs.readFile(path.join(__dirname, '../google_maps.key'), function (err, data) {
      if (err) {
        reject(new Error('An error ocurred when reading the google maps API key file: ' + err.message));
      } else {
        GoogleMapsLoader.KEY = String(data);
        GoogleMapsLoader.load(function (googleObj) {
          google = googleObj;
          resolve();
        });
      }
    });
  });
  return promise;
}

/**
 * Updates the visibility of the markers on the map based on the bounds of the
 * current map view and date filters, then redraws the marker clusters.
 * @param {object} mapBounds Google Maps LatLngBounds object.
 * @param {number} startDate Unix timestamp representing the start of the date
 *                           range, or null if no start date filter should be
 *                           applied.
 * @param {number} endDate Unix timestamp representing the start of the date
 *                         range, or null if no end date filter should be
 *                         applied.
 */
function repaintMarkers (mapBounds, startDate, endDate) {
  console.log('Repainting markers');

  if (!startDate) {
    startDate = Number.MIN_VALUE;
  }

  if (!endDate) {
    endDate = Number.MAX_VALUE;
  }

  var mapMarkers = markerCluster.getMarkers();
  for (var i = 0; i < mapMarkers.length; i++) {
    // TODO: Check if map for marker needs to be set to null
    mapMarkers[i].setMap(null);
    var latitude = mapMarkers[i].getPosition().lat();
    var longitude = mapMarkers[i].getPosition().lng();
    var isVisible = mapBounds.contains({ lat: latitude, lng: longitude }) &&
                                       mapMarkers[i].photo.createTime >= startDate &&
                                       mapMarkers[i].photo.createTime <= endDate;
    mapMarkers[i].setVisible(isVisible);
  }

  markerCluster.repaint();
}

/**
 * Initialize the Google Map object, and add a MarkerClusterer to the map for
 * the provided markers, and paint the markers on the map.
 * @param {Element} mapElement The DOM element containing the Google map.
 * @param {google.maps.MapOptions} mapOptions Object containing the options to
 *                                            create the map with.
 * @param {google.maps.Marker[]} markers Google Map markers for all photos to
 *                                       display on the map.
 * @return {Promise} Resolves once the map has been setup. Rejects if
 *                   GoogleMapsLoader has not been initialized.
 */
function setupMap (mapElement, mapOptions, markers) {
  var promise = new Promise(function (resolve, reject) {
    if (!google) {
      reject(new Error('Google Maps Loader not initialized'));
    }
    googleMap = new google.maps.Map(mapElement, mapOptions);

    console.log('Num markers: %s', markers.length);
    createMarkerClusters(markers, clusterClick).then( function () {
      // Update the markers on the map whenever the map is panned, zoomed, or when
      // the map first loads
      googleMap.addListener('tilesloaded', function () {
        repaintMarkers(googleMap.getBounds(), null, null);
      });
      resolve();
    });
    return promise;
  });
}
