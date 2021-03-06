var assert = require('assert');
var sinon = require('sinon');
var mockRequire = require('mock-require');
var rewire = require('rewire');

mockRequire('google-maps', { load: sinon.stub().yields() });
mockRequire('marker-clusterer-plus');

mockRequire('../js/ui.js', {
  markerOnClick: sinon.stub(),
  openWithFancyBox: sinon.stub(),
  getDateFilterEnd: sinon.stub(),
  getDateFilterStart: sinon.stub(),
  getMapElement: sinon.stub()
});

var map = rewire('../js/map.js');

describe('map', function () {
  describe('#createMarkersFromPhotos()', function () {
    it('should return Google Maps markers for every photo', function () {
      var Marker = sinon.stub();
      var googleMap = {
        maps: {
          Marker: Marker,
          event: {
            addListener: sinon.stub()
          }
        }
      };
      map.__set__('google', googleMap);

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

      return map.createMarkersFromPhotos(photos, function () {}).then(function (markers) {
        assert.strictEqual(markers.length, 2);
        assert(Marker.calledTwice);
        assert(Marker.calledWith({ position: { lat: photos[0].latitude, lng: photos[0].longitude } }));
        assert(Marker.calledWith({ position: { lat: photos[1].latitude, lng: photos[1].longitude } }));
      });
    });

    it('should add the properties of the photo to each marker', function () {
      var Marker = sinon.stub();
      var googleMap = {
        maps: {
          Marker: Marker,
          event: {
            addListener: sinon.stub()
          }
        }
      };
      map.__set__('google', googleMap);

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

      return map.createMarkersFromPhotos(photos, function () {}).then(function (markers) {
        assert.deepStrictEqual(markers[0].photo, {
          path: photos[0].path,
          title: 'bar',
          createTime: photos[0].create_time
        });
        assert.deepStrictEqual(markers[1].photo, {
          path: photos[1].path,
          title: 'buz',
          createTime: photos[1].create_time
        });
      });
    });

    it('should add on click events for every marker', function () {
      var addListener = sinon.stub();
      var onClick = sinon.stub();
      var googleMap = {
        maps: {
          Marker: sinon.stub(),
          event: {
            addListener: addListener
          }
        }
      };
      map.__set__('google', googleMap);

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
      return map.createMarkersFromPhotos(photos, onClick).then(function (markers) {
        assert(addListener.calledTwice);
        assert(addListener.calledWith(markers[0], 'click', onClick));
        assert(addListener.calledWith(markers[1], 'click', onClick));
      });
    });
  });

  describe('#getMap()', function () {
    it('should return the module\'s googleMap object', function () {
      var googleMap = sinon.stub();
      map.__set__('googleMap', googleMap);
      assert.strictEqual(map.getMap(), googleMap);
    })
  });

  describe('#initializeGoogleMapsLoader()', function () {
    it('should set the Google Maps API key to the contents of the google_maps.key file', function () {
      var key = 'foobar';
      var readFile = sinon.stub(map.__get__('fs'), 'readFile');
      readFile.yields(null, key);
      return map.initializeGoogleMapsLoader().then(function () {
        assert.strictEqual(map.__get__('GoogleMapsLoader').KEY, key);
      });
    });

    it('should throw an error if the google_maps.key file cannot be read', function () {
      var readFile = sinon.stub(map.__get__('fs'), 'readFile');
      readFile.yields('Error', null);
      assert.rejects(map.initializeGoogleMapsLoader);
    });

    it('should set the "google" global variable after loading the Google Maps Loader', function () {
      var google = sinon.stub();
      var readFile = sinon.stub(map.__get__('fs'), 'readFile');
      readFile.yields(null, 'foo');
      map.__get__('GoogleMapsLoader').load.yields(google);
      return map.initializeGoogleMapsLoader().then(function () {
        assert.strictEqual(map.__get__('google'), google);
      });
    });
  });

  describe('#repaintMarkers', function () {
    it('should set markers within the map bounds to visible if the default start and end times are used', function () {
      var mapBounds = {
        contains: function () {
          return true;
        }
      };
      var marker = {
        setMap: sinon.spy(),
        setVisible: sinon.spy(),
        photo: {
          createTime: 1234
        },
        getPosition: function () {
          return {
            lat: sinon.spy(),
            lng: sinon.spy()
          }
        }
      };
      map.__set__('markerCluster', {
        repaint: sinon.spy(),
        getMarkers: sinon.stub().returns([marker])
      });

      map.repaintMarkers(mapBounds);

      assert(marker.setVisible.calledOnceWith(true));
    });

    it('should set markers within the map bounds to visible for photos taken between the start and end date filters', function () {
      var startDate = 1234;
      var mapBounds = {
        contains: function () {
          return true;
        }
      };
      var marker = {
        setMap: sinon.spy(),
        setVisible: sinon.spy(),
        photo: {
          createTime: startDate + 1
        },
        getPosition: function () {
          return {
            lat: sinon.spy(),
            lng: sinon.spy()
          }
        }
      };
      map.__set__('markerCluster', {
        repaint: sinon.spy(),
        getMarkers: sinon.stub().returns([marker])
      });

      map.repaintMarkers(mapBounds, startDate, startDate + 2);

      assert(marker.setVisible.calledOnceWith(true));
    });

    it('should set markers outside of the map bounds to not be visible', function () {
      var mapBounds = {
        contains: function () {
          return false;
        }
      };
      var marker = {
        setMap: sinon.spy(),
        setVisible: sinon.spy(),
        photo: {
          createTime: 1234
        },
        getPosition: function () {
          return {
            lat: sinon.spy(),
            lng: sinon.spy()
          }
        }
      };
      map.__set__('markerCluster', {
        repaint: sinon.spy(),
        getMarkers: sinon.stub().returns([marker])
      });

      map.repaintMarkers(mapBounds);

      assert(marker.setVisible.calledOnceWith(false));
    });

    it('should set markers for photos taken before the start date filter to not be visible', function () {
      var startDate = 1234;
      var mapBounds = {
        contains: function () {
          return true;
        }
      };
      var marker = {
        setMap: sinon.spy(),
        setVisible: sinon.spy(),
        photo: {
          createTime: startDate - 1
        },
        getPosition: function () {
          return {
            lat: sinon.spy(),
            lng: sinon.spy()
          }
        }
      };
      map.__set__('markerCluster', {
        repaint: sinon.spy(),
        getMarkers: sinon.stub().returns([marker])
      });

      map.repaintMarkers(mapBounds, startDate, Number.MAX_VALUE);

      assert(marker.setVisible.calledOnceWith(false));
    });

    it('should set markers for photos taken after the end date filter to not be visible', function () {
      var endDate = 1234;
      var mapBounds = {
        contains: function () {
          return true;
        }
      };
      var marker = {
        setMap: sinon.spy(),
        setVisible: sinon.spy(),
        photo: {
          createTime: endDate + 1
        },
        getPosition: function () {
          return {
            lat: sinon.spy(),
            lng: sinon.spy()
          }
        }
      };
      map.__set__('markerCluster', {
        repaint: sinon.spy(),
        getMarkers: sinon.stub().returns([marker])
      });

      map.repaintMarkers(mapBounds, Number.MIN_VALUE, endDate);

      assert(marker.setVisible.calledOnceWith(false));
    });

    it('should repaint the marker cluster', function () {
      var cluster = {
        repaint: sinon.spy(),
        getMarkers: sinon.stub().returns([])
      };
      map.__set__('markerCluster', cluster);
      map.repaintMarkers({});
      assert(cluster.repaint.calledOnce);
    });
  });

  describe('#setupMap()', function () {
    it('should throw an error if the Google Maps Loader has not been initialized', function () {
      map.__set__('google', undefined);
      assert.rejects(map.setupMap({}, {}, [], function () {}));
    });

    it('should create the Map object', function () {
      var googleMap = {
        addListener: sinon.stub()
      };
      var mapElement = {};
      var Map = sinon.stub().returns(googleMap);
      var google = {
        maps: {
          Map: Map,
          event: {
            addListener: sinon.stub()
          }
        }
      };
      map.__set__('google', google);
      map.__set__('MarkerClusterer', sinon.stub());

      var mapOptions = {
        center: {
          lat: 56.7,
          lng: -123.45
        },
        zoom: 12
      }

      return map.setupMap(mapElement, mapOptions, [], function () {}).then(function () {
        assert.strictEqual(map.__get__('googleMap'), googleMap);
        assert(Map.calledOnceWith(mapElement, mapOptions));
      });
    });

    it('should create a marker clusterer for the map markers', function () {
      var markers = [
        sinon.stub(),
        sinon.stub()
      ];
      var Map = sinon.stub().returns({ addListener: sinon.stub() });
      var google = {
        maps: {
          Map: Map,
          event: {
            addListener: sinon.stub()
          }
        }
      };
      map.__set__('google', google);

      var MarkerClusterer = sinon.stub();
      map.__set__('MarkerClusterer', MarkerClusterer);
      return map.setupMap({}, {}, markers, function () {}).then(function () {
        MarkerClusterer.calledOnceWith(markers, map.__get__('googleMap'), map.__get__('markerClusterOptions'));
      });
    });

    it('should draw the markers on the map once the map loads', function () {
      var addListener = sinon.stub();
      var markers = [
        sinon.stub(),
        sinon.stub()
      ];
      var googleMap = {
        addListener: addListener,
        getBounds: sinon.stub()
      }
      var Map = sinon.stub().returns(googleMap);
      var google = {
        maps: {
          Map: Map,
          event: {
            addListener: sinon.stub()
          }
        }
      };
      map.__set__('google', google);

      var MarkerClusterer = sinon.stub();
      map.__set__('MarkerClusterer', MarkerClusterer);
      return map.setupMap({}, {}, markers, function () {}).then(function () {
        addListener.calledOnceWith(MarkerClusterer, markers, googleMap.getBounds(), null, null);
      });
    });
  });
});
