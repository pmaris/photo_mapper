import { config as mainConfig, configDefaults, configPath, filterDatesChanged, loadConfig, saveConfig, saveMapStartLocation } from "../src/main";
import { Config } from "../src/types";

jest.mock('electron');
jest.mock('google-maps');
jest.mock('jquery');
jest.mock('jquery-ui-bundle');

var parse: jest.Mock;
var stringify: jest.Mock;

beforeAll(() => {
  parse = jest.fn(() => { return {} });
  stringify = jest.fn(() => { return '{}' });;

  JSON.parse = parse;
  JSON.stringify = stringify;
})

afterEach(() => {
  jest.resetAllMocks();
});

var readFileSync: jest.Mock;
var writeFileSync: jest.Mock;

jest.mock("fs", () => {
  readFileSync = jest.fn(() => { return "" });
  writeFileSync = jest.fn();

  return {
    readFileSync,
    writeFileSync
  }
});

var saveConfigMock: jest.Mock;

jest.mock('../src/main', () => {
  saveConfigMock = jest.fn();

  return {
      ...jest.requireActual('../src/main'),
      saveConfigMock
  }
});

var createMarkersFromPhotos: jest.Mock;
var getMap: jest.Mock;
var repaintMarkers: jest.Mock;

jest.mock('../src/map', () => {
  createMarkersFromPhotos = jest.fn();
  getMap = jest.fn(() => { return { getBounds: jest.fn() } });
  repaintMarkers = jest.fn();

  return {
    createMarkersFromPhotos,
    getMap,
    repaintMarkers
  }
});

var photo: jest.Mock;
var findAll: jest.Mock;

jest.mock('../src/model', () => {
  findAll = jest.fn();
  photo = jest.fn(() => { return { findAll }})

  return {
    Photo: photo
  }
});

var filtersAreVisible: jest.Mock;
var getDateFilterEnd: jest.Mock;
var getDateFilterStart: jest.Mock;

jest.mock('../src/ui', () => {
  filtersAreVisible = jest.fn(() => { return false })
  getDateFilterEnd = jest.fn(() => { return Number.MIN_VALUE });
  getDateFilterStart = jest.fn(() => { return Number.MAX_VALUE });

  return {
    filtersAreVisible,
    getDateFilterEnd,
    getDateFilterStart
  }
});

describe('main', function () {
  describe('#filterDatesChanged()', function () {
    it('should repaint the map markers with the start and end date filter if they been set', function () {
      var startDate = 1234;
      var endDate = 5678;

      filtersAreVisible.mockReturnValue(true);

      getDateFilterEnd.mockReturnValue(endDate);
      getDateFilterStart.mockReturnValue(startDate);
      var bounds = 'foo';

      getMap.mockReturnValue({
        getBounds: jest.fn(() => { return bounds })
      });

      filterDatesChanged();

      expect(repaintMarkers).toHaveBeenCalledTimes(1)
      expect(repaintMarkers).toHaveBeenCalledWith(bounds, startDate, endDate);
    });

    it('should repaint the map markers with a default start and end date if the filters have not been set', function () {
      filtersAreVisible.mockReturnValue(true)
      var bounds = 'foo';
      getMap.mockReturnValue({
        getBounds: jest.fn(() => { return bounds })
      });

      filterDatesChanged();

      expect(repaintMarkers).toHaveBeenCalledTimes(1)
      expect(repaintMarkers).toHaveBeenCalledWith(bounds, Number.MIN_VALUE, Number.MAX_VALUE);
    });

    it('should not repaint the map markers if the filters are disabled in the UI', function () {
      filtersAreVisible.mockReturnValue(false)

      filterDatesChanged();

      expect(repaintMarkers).not.toHaveBeenCalledTimes(1);
    });
  });

  // describe('#initialize()', function () {
  //   /*
  //   it('should initialize Fancybox', function () {
  //     stub(main, 'initializeFancybox');
  //     stub(main, 'loadConfig');
  //     stub(main.__get__('model').Photo, 'findAll');
  //     main.__set__('map', {
  //       createMarkersFromPhotos: stub(),
  //       initializeGoogleMapsLoader: stub(),
  //       setupMap: stub()
  //     });
  //     console.log(main.initialize());
  //     return main.initialize().then(function () {
  //       assert(false);
  //     });
  //   });*/

  //   it('should load the application\'s configuration file');

  //   it('should create map markers for all of the photos in the database');

  //   it('should initialize the map');
  // });

  describe('#loadConfig()', function () {
    it('should return the application\'s configuration object', function () {
      var config = {
        map: {
          centerLatitude: 12,
          centerLongitude: -15.5,
          zoom: 3
        }
      };
      parse.mockReturnValue(config)

      expect(loadConfig('foo')).toEqual(config);
    });

    it('should return the default configuration if the configuration file cannot be read', function () {
      readFileSync.mockImplementation(() => { throw new Error() });

      expect(loadConfig('foo')).toEqual(configDefaults);
    });

    it('should update any missing values from the configuration file with default values', function () {
      var jsonConfig = {
        map: {
          zoom: 1234
        }
      };
      parse.mockReturnValue(jsonConfig);

      var expectedConfig = {
        map: {
          centerLatitude: configDefaults.map.centerLatitude,
          centerLongitude: configDefaults.map.centerLongitude,
          zoom: jsonConfig.map.zoom
        }
      };

      expect(loadConfig('foo')).toEqual(expectedConfig);
    });

    it('should replace NaN values for numerical values with the values in the default configuration', function () {
      var jsonConfig = {
        map: {
          centerLatitude: 'foo',
          centerLongitude: [],
          zoom: {}
        }
      };
      parse.mockReturnValue(jsonConfig);

      var config = loadConfig('foo');
      expect(config.map.centerLatitude).toEqual(configDefaults.map.centerLatitude);
      expect(config.map.centerLongitude).toEqual(configDefaults.map.centerLongitude);
      expect(config.map.zoom).toEqual(configDefaults.map.zoom);
    });
  });

  describe('#saveConfig()', function () {
    it('should update the config file', function () {
      var config: Config = { map: {} };
      var stringifyReturn = 'foo bar';
      stringify = jest.fn(() => { return stringifyReturn });
      JSON.stringify = stringify

      saveConfig(config);

      expect(stringify).toHaveBeenCalledWith(config);
      expect(writeFileSync).toHaveBeenCalledWith(configPath, stringifyReturn);
    });
  });

  describe('#saveMapStartLocation()', function () {
    it('should save the current map view as the map start location', function () {
      var latitude = 12;
      var longitude = 25;
      var zoom = 3;
      getMap.mockReturnValue({
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
      var newConfig: Config = {
        map: {
          centerLatitude: latitude,
          centerLongitude: longitude,
          zoom: zoom
        }
      }
        
      saveMapStartLocation();

      expect(mainConfig.map.centerLatitude).toEqual(latitude);
      expect(mainConfig.map.centerLongitude).toEqual(longitude);
      expect(mainConfig.map.zoom).toEqual(zoom);
      expect(saveConfigMock).toHaveBeenCalledTimes(1);
      expect(saveConfigMock).toHaveBeenCalledWith(newConfig);
    });

    it('should not update the config file if the map has not initialized', function () {
      getMap.mockReturnValue(null);
      
      saveMapStartLocation();

      expect(saveConfigMock).not.toHaveBeenCalled();
    });
  });
});
