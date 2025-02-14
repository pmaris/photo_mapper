import { clusterClick, createMarkersFromPhotos, getMap, initializeGoogleMapsLoader, repaintMarkers, setupMap } from "../src/map";

beforeAll(() => {
    global.jQuery = jest.fn();
})

afterEach(() => {
    jest.resetAllMocks();
});

var readFile: jest.Mock;

jest.mock("fs", () => {
  readFile = jest.fn(() => { return "" });

  return {
    readFile,
  }
});

var google: jest.Mock;
var googleMap: object;
var markerCluster: jest.Mock;
var markerClusterer: jest.Mock;

jest.mock('../src/map', () => {
    google = jest.fn();
    googleMap = {
      maps: {
        Marker: jest.fn(),
        event: {
          addListener: jest.fn()
        }
      }
    };
    markerCluster = jest.fn();
    markerClusterer = jest.fn();

    return {
        ...jest.requireActual('../src/map'),
        google,
        googleMap,
        markerCluster,
        MarkerClusterer: markerClusterer
    }
})

jest.mock('../src/ui', () => {
    return {
        markerOnClick: jest.fn(),
        openWithFancyBox: jest.fn(),
        getDateFilterEnd: jest.fn(),
        getDateFilterStart: jest.fn(),
        getMapElement: jest.fn()
    }
})

describe('map', function () {
  describe('#createMarkersFromPhotos()', function () {
    it('should return Google Maps markers for every photo', function () {
      var Marker = jest.fn();
      googleMap = {
        maps: {
          Marker: Marker,
          event: {
            addListener: jest.fn()
          }
        }
      };

      var photos = [
        {
          path: '/foo/bar.jpg',
          latitude: 32.54,
          longitude: 28.84,
          create_time: 123456789
        },
        {
          path: '/baz/buz.jpg',
          latitude: -75.48,
          Longitude: -36.38,
          create_time: 987654321
        }
      ];

      return createMarkersFromPhotos(photos, function () {}).then(function (markers) {
        expect(markers).toHaveLength(2);
        expect(Marker).toHaveBeenCalledTimes(2);
        expect(Marker).toHaveBeenCalledWith({ position: { lat: photos[0].latitude, lng: photos[0].longitude } });
        expect(Marker).toHaveBeenCalledWith({ position: { lat: photos[1].latitude, lng: photos[1].longitude } });
      });
    });

    it('should add the properties of the photo to each marker', function () {
      var photos = [
        {
          path: '/foo/bar.jpg',
          latitude: 32.54,
          longitude: 28.84,
          create_time: 123456789
        },
        {
          path: '/baz/buz.jpg',
          latitude: -75.48,
          Longitude: -36.38,
          create_time: 987654321
        }
      ];

      return createMarkersFromPhotos(photos, function () {}).then(function (markers) {
        expect(markers[0].photo).toEqual({
          path: photos[0].path,
          title: 'bar',
          createTime: photos[0].create_time
        });
        expect(markers[1].photo).toEqual({
          path: photos[1].path,
          title: 'buz',
          createTime: photos[1].create_time
        });
      });
    });

    it('should add on click events for every marker', function () {
      var addListener = jest.fn();
      var onClick = jest.fn();
      googleMap = {
        maps: {
          Marker: jest.fn(),
          event: {
            addListener: addListener
          }
        }
      };

      var photos = [
        {
          path: '/foo/bar.jpg',
          latitude: 32.54,
          longitude: 28.84,
          create_time: 123456789
        },
        {
          path: '/baz/buz.jpg',
          latitude: -75.48,
          Longitude: -36.38,
          create_time: 987654321
        }
      ];
      return createMarkersFromPhotos(photos, onClick).then(function (markers) {
        expect(addListener).toHaveBeenCalledTimes(2);
        expect(addListener).toHaveBeenCalledWith(markers[0], 'click', onClick);
        expect(addListener).toHaveBeenCalledWith(markers[1], 'click', onClick);
      });
    });
  });

  describe('#getMap()', function () {
    it('should return the module\'s googleMap object', function () {
      expect(getMap()).toEqual(googleMap);
    })
  });

//   describe('#initializeGoogleMapsLoader()', function () {
//     it('should set the Google Maps API key to the contents of the google_maps.key file', function () {
//       var key = 'foobar';
//       readFile.mockReturnValue([null, key])
//     //   readFile.yields(null, key);
//       return initializeGoogleMapsLoader().then(function () {
//         expect(map.__get__('GoogleMapsLoader').KEY).toEqual(key);
//       });
//     });

//     it('should throw an error if the google_maps.key file cannot be read', function () {
//         readFile.mockReturnValue(['Error', null])
//     //   readFile.yields('Error', null);
//       rejects(initializeGoogleMapsLoader);
//     });

//     it('should set the "google" global variable after loading the Google Maps Loader', function () {
//       readFile.mockReturnValue([null, 'foo'])
//     //   readFile.yields(null, 'foo');
//       map.__get__('GoogleMapsLoader').load.yields(google);
//       return initializeGoogleMapsLoader().then(function () {
//         expect(map.__get__('google')).toEqual(google);
//       });
//     });
//   });

//   describe('#repaintMarkers', function () {
//     var marker: any;

//     beforeEach(() => {
//         marker = {
//             setMap: jest.fn(),
//             setVisible: jest.fn(),
//             photo: {
//               createTime: 1234
//             },
//             getPosition: function () {
//               return {
//                 lat: jest.fn(),
//                 lng: jest.fn()
//               }
//             }
//         };

//         markerCluster = {
//             repaint: jest.fn(),
//             getMarkers: jest.fn(() => { return [marker]} )
//         }; 
//     });

//     it('should set markers within the map bounds to visible if the default start and end times are used', function () {
//       var mapBounds = {
//         contains: function () {
//           return true;
//         }
//       };

//     //   map.__set__('markerCluster', markerCluster); 

//       repaintMarkers(mapBounds);

//       expect(marker.setVisible).toHaveBeenCalledTimes(1);
//       expect(marker.setVisible).toHaveBeenCalledWith(true);
//     });

//     it('should set markers within the map bounds to visible for photos taken between the start and end date filters', function () {
//       var startDate = 1234;
//       var mapBounds = {
//         contains: function () {
//           return true;
//         }
//       };
//       marker.photo.createTime = startDate + 1;

//     //   map.__set__('markerCluster', markerCluster);

//       repaintMarkers(mapBounds, startDate, startDate + 2);

//       expect(marker.setVisible).toHaveBeenCalledTimes(1);
//       expect(marker.setVisible).toHaveBeenCalledWith(true);
//     });

//     it('should set markers outside of the map bounds to not be visible', function () {
//       var mapBounds = {
//         contains: function () {
//           return false;
//         }
//       };

//     //   map.__set__('markerCluster', markerCluster);

//       repaintMarkers(mapBounds);

//       expect(marker.setVisible).toHaveBeenCalledTimes(1);
//       expect(marker.setVisible).toHaveBeenCalledWith(false);
//     });

//     it('should set markers for photos taken before the start date filter to not be visible', function () {
//       var startDate = 1234;
//       var mapBounds = {
//         contains: function () {
//           return true;
//         }
//       };
//       marker.photo.createTime = startDate - 1;

//     //   map.__set__('markerCluster', markerCluster);

//       repaintMarkers(mapBounds, startDate, Number.MAX_VALUE);

//       expect(marker.setVisible).toHaveBeenCalledTimes(1);
//       expect(marker.setVisible).toHaveBeenCalledWith(false);
//     });

//     it('should set markers for photos taken after the end date filter to not be visible', function () {
//       var endDate = 1234;
//       var mapBounds = {
//         contains: function () {
//           return true;
//         }
//       };
//       marker.photo.createTime = endDate + 1;

//     //   map.__set__('markerCluster', markerCluster);

//       repaintMarkers(mapBounds, Number.MIN_VALUE, endDate);

//       expect(marker.setVisible).toHaveBeenCalledTimes(1);
//       expect(marker.setVisible).toHaveBeenCalledWith(false);
//     });

//     it('should repaint the marker cluster', function () {
//         markerCluster.getMarkers.mockReturnValue([])
//         // map.__set__('markerCluster', markerCluster);
//         repaintMarkers({});

//         expect(markerCluster.repaint).toHaveBeenCalledTimes(1);
//     });
//   });

//   describe('#setupMap()', function () {
//     it('should throw an error if the Google Maps Loader has not been initialized', function () {
//       map.__set__('google', undefined);
//       rejects(setupMap({}, {}, [], function () {}));
//     });

//     it('should create the Map object', function () {
//       var googleMap = {
//         addListener: jest.fn()
//       };
//       var mapElement = {};
//       var Map = jest.fn(() => { return googleMap });
//       var google = {
//         maps: {
//           Map: Map,
//           event: {
//             addListener: jest.fn()
//           }
//         }
//       };
//       map.__set__('google', google);
//     //   map.__set__('MarkerClusterer', jest.fn());

//       var mapOptions = {
//         center: {
//           lat: 56.7,
//           lng: -123.45
//         },
//         zoom: 12
//       }

//       setupMap(mapElement, mapOptions, [], function () {})
//       expect(map.__get__('googleMap')).toEqual(googleMap);
//       expect(Map).toHaveBeenCalledTimes(1);
//       expect(Map).toHaveBeenCalledWith(mapElement, mapOptions);
//     });

//     it('should create a marker clusterer for the map markers', function () {
//       var markers = [
//         jest.fn(),
//         jest.fn()
//       ];
//       var Map = stub().returns({ addListener: jest.fn() });
//       google = {
//         maps: {
//           Map: Map,
//           event: {
//             addListener: jest.fn()
//           }
//         }
//       };

//       var MarkerClusterer = jest.fn();
//     //   map.__set__('MarkerClusterer', MarkerClusterer);
//       setupMap({}, {}, markers)
//       MarkerClusterer.calledOnceWith(markers, googleMap, map.__get__('markerClusterOptions'));
//     });

//     it('should draw the markers on the map once the map loads', function () {
//       var addListener = jest.fn();
//       var markers = [
//         jest.fn(),
//         jest.fn()
//       ];
//       var googleMap = {
//         addListener: addListener,
//         getBounds: jest.fn()
//       }
//       var Map = jest.fn(() => { return googleMap });
//       google = {
//         maps: {
//           Map: Map,
//           event: {
//             addListener: jest.fn()
//           }
//         }
//       };

//       var MarkerClusterer = jest.fn();
//     //   map.__set__('MarkerClusterer', MarkerClusterer);
//       setupMap({}, {}, markers)
//       expect(addListener).toHaveBeenCalledTimes(1)
//       expect(addListener).toHaveBeenCalledWith(MarkerClusterer, markers, googleMap.getBounds(), null, null);
//     });

//       describe('#clusterClick()', function () {
//         it('should open the photos for the markers in Fancybox', function () {
//           var fancyBoxOpen = jest.fn(() => {});
//           main.__set__('$', { fancybox: { open: fancyBoxOpen } });
//           var markers = [
//             {
//               photo: {
//                 path: 'foo',
//                 title: 'bar'
//               }
//             },
//             {
//               photo: {
//                 path: 'baz',
//                 title: 'buz'
//               }
//             }
//           ];
    
//           var cluster = {
//             getMarkers: function () {
//               return markers;
//             }
//           };
//           var expectedMarkerContent = [
//             {
//               href: markers[0].photo.path,
//               title: markers[0].photo.title
//             },
//             {
//               href: markers[1].photo.path,
//               title: markers[1].photo.title
//             }
//           ];
    
//           clusterClick(cluster);
//           expect(fancyBoxOpen).toHaveBeenCalledWith(expectedMarkerContent, main.__get__('fancyBoxOptions'));
//         });
//       });
//   });
});
