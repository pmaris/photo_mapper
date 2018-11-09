var assert = require('assert');
var path = require('path');
var sinon = require('sinon');
var mockRequire = require('mock-require');
var rewire = require('rewire');

mockRequire('electron', { remote: { dialog: sinon.stub() } });
mockRequire('jquery', { $: sinon.stub() });
mockRequire('jquery-ui-bundle');
mockRequire(path.join(__dirname, '../node_modules/fancybox/dist/js/jquery.fancybox.pack.js'));
mockRequire(path.join(__dirname, '../node_modules/fancybox/dist/helpers/js/jquery.fancybox-thumbs.js'));
mockRequire('../js/map.js');
var main = rewire('../js/main.js');

describe('photo_mapper', function () {
  describe('#clusterClick()', function () {
    it('should open the photos for the markers in Fancybox', function () {
      var fancyBoxOpen = sinon.stub();
      main.__set__('$', { fancybox: { open: fancyBoxOpen } });
      var markers = [
        {
          photo: {
            path: 'foo',
            title: 'bar'
          }
        },
        {
          photo: {
            path: 'baz',
            title: 'buz'
          }
        }
      ];

      var cluster = {
        getMarkers: function () {
          return markers;
        }
      };
      var expectedMarkerContent = [
        {
          href: markers[0].photo.path,
          title: markers[0].photo.title
        },
        {
          href: markers[1].photo.path,
          title: markers[1].photo.title
        }
      ];

      main.__get__('clusterClick')(cluster);
      assert(fancyBoxOpen.calledWith(expectedMarkerContent, main.__get__('fancyBoxOptions')));
    });
  });

  describe('#filterDatesChanged()', function () {
    it('should repaint the map markers with the start and end date filter if they been set', function () {
      var startDate = 1234;
      var endDate = 5678;

      main.__set__('filtersAreVisible', sinon.stub().returns(true));
      main.__set__('getDateFilterEnd', sinon.stub().returns(endDate));
      main.__set__('getDateFilterStart', sinon.stub().returns(startDate));
      var bounds = 'foo';
      main.__set__('map', {
        googleMap: {
          getBounds: sinon.stub().returns(bounds)
        }
      });
      var repaintMarkers = sinon.stub();
      main.__get__('map').repaintMarkers = repaintMarkers;

      main.filterDatesChanged();

      assert(repaintMarkers.calledOnceWith(bounds, startDate, endDate));
    });

    it('should repaint the map markers with a default start and end date if the filters have not been set', function () {
      main.__set__('filtersAreVisible', sinon.stub().returns(true));
      main.__set__('getDateFilterEnd', sinon.stub().returns(null));
      main.__set__('getDateFilterStart', sinon.stub().returns(null));
      var bounds = 'foo';
      main.__set__('map', {
        googleMap: {
          getBounds: sinon.stub().returns(bounds)
        }
      });
      var repaintMarkers = sinon.stub();
      main.__get__('map').repaintMarkers = repaintMarkers;

      main.filterDatesChanged();

      assert(repaintMarkers.calledOnceWith(bounds, Number.MIN_VALUE, Number.MAX_VALUE));
    });

    it('should not repaint the map markers if the filters are disabled in the UI', function () {
      main.__set__('filtersAreVisible', sinon.stub().returns(false));

      var repaintMarkers = sinon.stub();
      main.__get__('map').repaintMarkers = repaintMarkers;

      main.filterDatesChanged();

      assert.strictEqual(repaintMarkers.called, false);
    });
  });

  describe('#loadConfig()', function () {
    it('should return the application\'s configuration object', function () {
      var config = {
        map: {
          centerLatitude: 12,
          centerLongitude: -15.5,
          zoom: 3
        },
        database: {
          path: 'foo.db'
        }
      };
      sinon.stub(main.__get__('JSON'), 'parse').returns(config);
      sinon.stub(main.__get__('fs'), 'readFileSync');
      assert.deepStrictEqual(main.loadConfig('foo'), config);
    });

    it('should return the default configuration if the configuration file cannot be read', function () {
      sinon.stub(main.__get__('fs'), 'readFileSync').throws(new Error());
      assert.deepStrictEqual(main.loadConfig('foo'), main.__get__('configDefaults'));
    });

    it('should update any missing values from the configuration file with default values', function () {
      console.log(main.__get__('configDefaults'));
      var jsonConfig = {
        map: {
          zoom: 1234
        }
      };
      sinon.stub(main.__get__('JSON'), 'parse').returns(jsonConfig);
      sinon.stub(main.__get__('fs'), 'readFileSync');

      var expectedConfig = {
        database: main.__get__('configDefaults').database,
        map: {
          centerLatitude: main.__get__('configDefaults').map.centerLatitude,
          centerLongitude: main.__get__('configDefaults').map.centerLongitude,
          zoom: jsonConfig.map.zoom
        }
      };

      assert.deepStrictEqual(main.loadConfig('foo'), expectedConfig);
    });

    it('should replace NaN values for numerical values with the values in the default configuration', function () {
      var jsonConfig = {
        map: {
          centerLatitude: 'foo',
          centerLongitude: [],
          zoom: {}
        }
      };
      sinon.stub(main.__get__('JSON'), 'parse').returns(jsonConfig);
      sinon.stub(main.__get__('fs'), 'readFileSync');

      var config = main.loadConfig('foo');
      assert.strictEqual(config.map.centerLatitude, main.__get__('configDefaults').map.centerLatitude);
      assert.strictEqual(config.map.centerLongitude, main.__get__('configDefaults').map.centerLongitude);
      assert.strictEqual(config.map.zoom, main.__get__('configDefaults').map.zoom);
    });
  });

  describe('#saveConfig()', function () {
    it('should update the config file', function () {
      var config = { foo: 'bar' };
      var stringify = sinon.stub();
      var writeFile = sinon.stub();
      var stringifyReturn = 'foo bar';
      stringify.returns(stringifyReturn);

      main.__get__('JSON').stringify = stringify;
      main.__get__('fs').writeFileSync = writeFile;
      main.__set__('config', config);

      main.saveConfig();

      sinon.assert.calledWith(stringify, config);
      sinon.assert.calledWith(writeFile, main.__get__('configPath'), stringifyReturn);
    });
  });

  describe('#saveMapStartLocation()', function () {
    it('should save the current map view as the map start location', function () {
      var latitude = 12;
      var longitude = 25;
      var zoom = 3;
      main.__get__('map').googleMap = {
        getZoom: function () {
          return zoom;
        },
        getCenter: function () {
          return {
            lat: function () {
              return latitude;
            },
            lng: function () {
              return longitude;
            }
          }
        }
      };
      var stub = sinon.stub()
      main.__set__('saveConfig', stub);

      main.saveMapStartLocation();

      assert.strictEqual(main.__get__('config').map.centerLatitude, latitude);
      assert.strictEqual(main.__get__('config').map.centerLongitude, longitude);
      assert.strictEqual(main.__get__('config').map.zoom, zoom);
      assert(stub.calledOnce);
    });

    it('should not update the config file if the map has not initialized', function () {
      main.saveConfig = sinon.spy()

      main.__set__('googleMap', null);
      main.saveMapStartLocation();

      assert.strictEqual(main.saveConfig.called, false);
    });
  });
});
