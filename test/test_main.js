var assert = require('assert');
var path = require('path');
var sinon = require('sinon');
var mockRequire = require('mock-require');
var rewire = require('rewire');

mockRequire('electron', { remote: { dialog: sinon.stub() } });
mockRequire('jquery', { $: sinon.stub() });
mockRequire('jquery-ui-bundle');
mockRequire(path.join(__dirname, '../node_modules/@fancyapps/fancybox/dist/jquery.fancybox.min.js'));
mockRequire('google-maps');
var map = require('../js/map.js');
var main = rewire('../js/main.js');
var model = require('../js/model.js');
var ui = require('../js/ui.js');

describe('main', function () {
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

      main.clusterClick(cluster);
      assert(fancyBoxOpen.calledWith(expectedMarkerContent, main.__get__('fancyBoxOptions')));
    });
  });

  describe('#filterDatesChanged()', function () {
    it('should repaint the map markers with the start and end date filter if they been set', function () {
      var startDate = 1234;
      var endDate = 5678;

      sinon.stub(ui, 'filtersAreVisible').returns(true);
      sinon.stub(ui, 'getDateFilterEnd').returns(endDate);
      sinon.stub(ui, 'getDateFilterStart').returns(startDate);
      var bounds = 'foo';
      sinon.stub(map, 'getMap').returns({
        getBounds: sinon.stub().returns(bounds)
      });
      var repaintMarkers = sinon.stub(map, 'repaintMarkers');

      main.filterDatesChanged();

      assert(repaintMarkers.calledOnceWith(bounds, startDate, endDate));
    });

    it('should repaint the map markers with a default start and end date if the filters have not been set', function () {
      sinon.stub(ui, 'filtersAreVisible').returns(true);
      sinon.stub(ui, 'getDateFilterEnd').returns(null);
      sinon.stub(ui, 'getDateFilterStart').returns(null);
      var bounds = 'foo';
      sinon.stub(map, 'getMap').returns({
        getBounds: sinon.stub().returns(bounds)
      });
      var repaintMarkers = sinon.stub(map, 'repaintMarkers');

      main.filterDatesChanged();

      assert(repaintMarkers.calledOnceWith(bounds, Number.MIN_VALUE, Number.MAX_VALUE));
    });

    it('should not repaint the map markers if the filters are disabled in the UI', function () {
      sinon.stub(ui, 'filtersAreVisible').returns(false);

      var repaintMarkers = sinon.stub(map, 'repaintMarkers');

      main.filterDatesChanged();

      assert.strictEqual(repaintMarkers.called, false);
    });
  });

  describe('#initialize()', function () {
    /*
    it('should initialize Fancybox', function () {
      sinon.stub(main, 'initializeFancybox');
      sinon.stub(main, 'loadConfig');
      sinon.stub(main.__get__('model').Photo, 'findAll');
      main.__set__('map', {
        createMarkersFromPhotos: sinon.stub(),
        initializeGoogleMapsLoader: sinon.stub(),
        setupMap: sinon.stub()
      });
      console.log(main.initialize());
      return main.initialize().then(function () {
        assert(false);
      });
    });*/

    it('should load the application\'s configuration file');

    it('should create map markers for all of the photos in the database');

    it('should initialize the map');
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

      main.__get__('saveConfig')();

      sinon.assert.calledWith(stringify, config);
      sinon.assert.calledWith(writeFile, main.__get__('configPath'), stringifyReturn);
    });
  });

  describe('#saveMapStartLocation()', function () {
    it('should save the current map view as the map start location', function () {
      var latitude = 12;
      var longitude = 25;
      var zoom = 3;
      sinon.stub(map, 'getMap').returns({
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
      });
      var saveConfig = sinon.stub();
      main.__with__('saveConfig', saveConfig)(function () {
        main.saveMapStartLocation();

        assert.strictEqual(main.__get__('config').map.centerLatitude, latitude);
        assert.strictEqual(main.__get__('config').map.centerLongitude, longitude);
        assert.strictEqual(main.__get__('config').map.zoom, zoom);
        assert(saveConfig.calledOnce);
      });
    });

    it('should not update the config file if the map has not initialized', function () {
      var saveConfig = sinon.spy(main.__get__('saveConfig'));

      main.__set__('googleMap', null);
      main.saveMapStartLocation();

      assert.strictEqual(saveConfig.called, false);
    });
  });

  describe('#saveSelectedDatabase', function () {
    it('should save the path of the selected database to the configuration file', function () {
      var databasePath = '/foo/bar'
      var saveConfig = sinon.stub();
      main.__set__('config', main.__get__('configDefaults'));
      sinon.stub(map, 'createMarkersFromPhotos');
      sinon.stub(map, 'repaintMarkers');
      var Photo = sinon.stub(model, 'Photo');
      Photo.findAll = sinon.stub();
      sinon.stub(map, 'getMap').returns({
        getBounds: sinon.stub()
      });
      sinon.stub(ui, 'getDateFilterStart');
      sinon.stub(ui, 'getDateFilterEnd');

      main.__with__('saveConfig', saveConfig)(function () {
        return main.saveSelectedDatabase(databasePath).then(function () {
          assert.deepStrictEqual(main.__get__('config').database.path, databasePath);
          assert(saveConfig.called);
        });
      });
    });

    it('should draw markers on the map for the photos in the selected database', function () {
      var createMarkers = sinon.stub(map, 'createMarkersFromPhotos');
      var repaintMarkers = sinon.stub(map, 'repaintMarkers');
      var Photo = sinon.stub(model, 'Photo');
      Photo.findAll = sinon.stub().resolves(['foo'])
      sinon.stub(map, 'getMap').returns({
        getBounds: sinon.stub()
      });
      sinon.stub(ui, 'getDateFilterStart');
      sinon.stub(ui, 'getDateFilterEnd');

      main.__with__('saveConfig', sinon.stub())(function () {
        return main.saveSelectedDatabase('foo').then(function () {
          assert(createMarkers.calledOnce);
          assert(repaintMarkers.calledOnce);
        });
      });
    });
  });
});
