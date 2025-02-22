import { basename, extname, join } from "path"
import { Photo } from "./model";

import MarkerClusterer from "marker-clusterer-plus";

var $ = global.jQuery;
require('jquery-ui-bundle');
require(join(__dirname, '../../node_modules/@fancyapps/fancybox/dist/jquery.fancybox.min.js'));

var google: any;
var googleMap: google.maps.Map;
var markerCluster: typeof MarkerClusterer;

const fancyBoxOptions = {
  loop: false
};

/**
 * Handler for when a cluster of markers on the map is clicked on to open all of
 * the photos in the cluster with Fancybox.
 * @param {MarkerCluster} cluster Cluster of markers on the map.
 */
export function clusterClick (cluster: typeof markerCluster) {
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

export function createMarkersFromPhotos (photos: typeof Photo[], onClick: () => void) {
  var promise = new Promise(function (resolve, reject) {
    var markers: google.maps.Marker[] = [];
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
        title: basename(photos[i].path, extname(photos[i].path)),
        createTime: photos[i].create_time
      };

      google.maps.event.addListener(marker, 'click', onClick);
      markers.push(marker);
    }
    resolve(markers);
  });
  return promise;
};

export function repaintMarkers (mapBounds: google.maps.LatLngBounds, startDate: number, endDate: number) {
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
