var fs = require('fs');
var GoogleMapsLoader = require('google-maps');
var MarkerClusterer = require('marker-clusterer-plus');
var path = require('path');
var ui = require('./ui');

var google;
var googleMap;

const markerClusterOptions = {
  photoPath: './icons/m',
  zoomOnClick: false,
  ignoreHidden: true,
  gridSize: 70
};

module.exports = {
  createMarkersFromPhotos: createMarkersFromPhotos,
  initializeMap: initializeMap,
  repaintMarkers: repaintMarkers
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
  ui.openWithFancyBox(markers);
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
function createMarkersFromPhotos (photos) {
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

      google.maps.event.addListener(marker, 'click', ui.markerOnClick);
      markers.push(marker);
    }
    resolve(markers);
  });
  return promise;
};

/**
 * Initialize the Google Map object.
 * @param {google.maps.Marker[]} markers Google Map markers for all photos to
 *                                       display on the map.
 * @param {number} centerLatitude Latitude of the initial center position of the
 *                                map.
 * @param {number} centerLongitude Longitude of the initial center position of
 *                                 the map.
 * @param {number} zoom Initial zoom level of the map.
 */
function initializeMap (markers, centerLatitude, centerLongitude, zoom) {
  fs.readFile('./google_maps.key', function (err, data) {
    if (err) {
      console.log('An error ocurred reading the file :' + err.message);
      return null;
    } else {
      GoogleMapsLoader.KEY = String(data);
    }
  });

  GoogleMapsLoader.load(function (gmap) {
    google = gmap;
    googleMap = new google.maps.Map(document.getElementById('map'), {
      center: { lat: centerLatitude, lng: centerLongitude },
      zoom: zoom
    });

    console.log('Num markers: %s', markers.length);
    var markerCluster = new MarkerClusterer(googleMap, markers, markerClusterOptions);
    google.maps.event.addListener(markerCluster, 'clusterclick', clusterClick);

    // Update the markers on the map whenever the map is panned, zoomed, or when
    // the map first loads
    googleMap.addListener('tilesloaded', function () {
      repaintMarkers(markerCluster, markers, googleMap.getBounds(), ui.getDateFilterStart(), ui.getDateFilterEnd());
    });
  });
}

/**
 * Updates the visibility of the markers on the map based on the bounds of the
 * current map view and date filters, then redraws the marker clusters.
 * @param {object} cluster MarkerCluster object.
 * @param {object[]} mapMarkers Array of Google Maps Marker objects.
 * @param {object} mapBounds Google Maps LatLngBounds object.
 * @param {number} startDate Unix timestamp representing the start of the date range.
 * @param {number} endDate Unix timestamp representing the start of the date range.
 */
function repaintMarkers (cluster, mapMarkers, mapBounds, startDate, endDate) {
  console.log('Repainting markers');

  if (!startDate) {
    startDate = Number.MIN_VALUE;
  }

  if (!endDate) {
    endDate = Number.MAX_VALUE;
  }

  for (var i = 0; i < mapMarkers.length; i++) {
    // TODO: Check if map for marker needs to be set to null
    mapMarkers[i].setMap(null);
    var latitude = mapMarkers[i].getPosition().lat();
    var longitude = mapMarkers[i].getPosition().lng();
    var isVisible = mapBounds.contains({ lat: latitude, lon: longitude }) &&
                                       mapMarkers[i].photo.createTime >= startDate &&
                                       mapMarkers[i].photo.createTime <= endDate;
    mapMarkers[i].setVisible(isVisible);
  }

  cluster.repaint();
}
