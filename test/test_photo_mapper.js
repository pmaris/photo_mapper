var assert = require('assert');
var sinon = require('sinon');
var mockRequire = require('mock-require');
var rewire = require('rewire');

mockRequire('../js/ui.js');
var photoMapper = rewire('../js/photo_mapper.js');

describe('photo_mapper', function () {
  describe('#filterDatesChanged()', function () {
    it('should repaint the map markers with the start and end date filter if they been set', function () {
      var startDate = 1234;
      var endDate = 5678;
      photoMapper.__set__('ui', {
        filtersAreVisible: sinon.stub().returns(true),
        getDateFilterEnd: sinon.stub().returns(endDate),
        getDateFilterStart: sinon.stub().returns(startDate)
      });
      var bounds = 'foo';
      photoMapper.__set__('map', {
        googleMap: {
          getBounds: sinon.stub().returns(bounds)
        }
      });
      var repaintMarkers = sinon.stub();
      photoMapper.__get__('map').repaintMarkers = repaintMarkers;

      photoMapper.filterDatesChanged();

      assert(repaintMarkers.calledOnceWith(bounds, startDate, endDate));
    });

    it('should repaint the map markers with a default start and end date if the filters have not been set', function () {
      photoMapper.__set__('ui', {
        filtersAreVisible: sinon.stub().returns(true),
        getDateFilterEnd: sinon.stub().returns(null),
        getDateFilterStart: sinon.stub().returns(null)
      });
      var bounds = 'foo';
      photoMapper.__set__('map', {
        googleMap: {
          getBounds: sinon.stub().returns(bounds)
        }
      });
      var repaintMarkers = sinon.stub();
      photoMapper.__get__('map').repaintMarkers = repaintMarkers;

      photoMapper.filterDatesChanged();

      assert(repaintMarkers.calledOnceWith(bounds, Number.MIN_VALUE, Number.MAX_VALUE));
    });

    it('should not repaint the map markers if the filters are disabled in the UI', function () {
      photoMapper.__set__('ui', {
        filtersAreVisible: sinon.stub().returns(false)
      });

      var repaintMarkers = sinon.stub();
      photoMapper.__get__('map').repaintMarkers = repaintMarkers;

      photoMapper.filterDatesChanged();

      assert.strictEqual(repaintMarkers.called, false);
    });
  });

  describe('#initialize()', function () {
    it('should initialize Fancybox');

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
      sinon.stub(photoMapper.__get__('JSON'), 'parse').returns(config);
      sinon.stub(photoMapper.__get__('fs'), 'readFileSync');
      assert.deepStrictEqual(photoMapper.loadConfig('foo'), config);
    });

    it('should return the default configuration if the configuration file cannot be read', function () {
      sinon.stub(photoMapper.__get__('fs'), 'readFileSync').throws(new Error());
      assert.deepStrictEqual(photoMapper.loadConfig('foo'), photoMapper.__get__('configDefaults'));
    });

    it('should update any missing values from the configuration file with default values', function () {
      console.log(photoMapper.__get__('configDefaults'));
      var jsonConfig = {
        map: {
          zoom: 1234
        }
      };
      sinon.stub(photoMapper.__get__('JSON'), 'parse').returns(jsonConfig);
      sinon.stub(photoMapper.__get__('fs'), 'readFileSync');

      var expectedConfig = {
        database: photoMapper.__get__('configDefaults').database,
        map: {
          centerLatitude: photoMapper.__get__('configDefaults').map.centerLatitude,
          centerLongitude: photoMapper.__get__('configDefaults').map.centerLongitude,
          zoom: jsonConfig.map.zoom
        }
      };

      assert.deepStrictEqual(photoMapper.loadConfig('foo'), expectedConfig);
    });

    it('should replace NaN values for numerical values with the values in the default configuration', function () {
      var jsonConfig = {
        map: {
          centerLatitude: 'foo',
          centerLongitude: [],
          zoom: {}
        }
      };
      sinon.stub(photoMapper.__get__('JSON'), 'parse').returns(jsonConfig);
      sinon.stub(photoMapper.__get__('fs'), 'readFileSync');

      var config = photoMapper.loadConfig('foo');
      assert.strictEqual(config.map.centerLatitude, photoMapper.__get__('configDefaults').map.centerLatitude);
      assert.strictEqual(config.map.centerLongitude, photoMapper.__get__('configDefaults').map.centerLongitude);
      assert.strictEqual(config.map.zoom, photoMapper.__get__('configDefaults').map.zoom);
    });
  });

  describe('#saveConfig()', function () {
    it('should update the config file', function () {
      var config = { foo: 'bar' };
      var stringify = sinon.stub();
      var writeFile = sinon.stub();
      var stringifyReturn = 'foo bar';
      stringify.returns(stringifyReturn);

      photoMapper.__get__('JSON').stringify = stringify;
      photoMapper.__get__('fs').writeFileSync = writeFile;
      photoMapper.__set__('config', config);

      photoMapper.saveConfig();

      sinon.assert.calledWith(stringify, config);
      sinon.assert.calledWith(writeFile, photoMapper.__get__('configPath'), stringifyReturn);
    });
  });

  describe('#saveMapStartLocation()', function () {
    it('should save the current map view as the map start location', function () {
      var latitude = 12;
      var longitude = 25;
      var zoom = 3;
      photoMapper.__get__('map').googleMap = {
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
      photoMapper.__set__('saveConfig', stub);

      photoMapper.saveMapStartLocation();

      assert.strictEqual(photoMapper.__get__('config').map.centerLatitude, latitude);
      assert.strictEqual(photoMapper.__get__('config').map.centerLongitude, longitude);
      assert.strictEqual(photoMapper.__get__('config').map.zoom, zoom);
      assert(stub.calledOnce);
    });

    it('should not update the config file if the map has not initialized', function () {
      photoMapper.saveConfig = sinon.spy()

      photoMapper.__set__('googleMap', null);
      photoMapper.saveMapStartLocation();

      assert.strictEqual(photoMapper.saveConfig.called, false);
    });
  });
});
