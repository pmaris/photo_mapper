import { Config } from "../src/types";
import { configDefaults, loadConfig, saveConfig } from "../src/config";

let windowSpy: jest.SpyInstance;
let readFile: jest.Mock;
let writeFile: jest.Mock;

let parse: jest.Mock;
let stringify: jest.Mock;

beforeAll(() => {
  parse = jest.fn(() => { return {} });
  stringify = jest.fn(() => { return '{}' });
  windowSpy = jest.spyOn(window, "window", "get");


  JSON.parse = parse;
  JSON.stringify = stringify;
})

afterEach(() => {
  jest.resetAllMocks();
});

beforeEach(() => {
    readFile = jest.fn();
    writeFile = jest.fn();
    windowSpy.mockImplementation(() => ({
        electronContext: {
          readFile: readFile,
          writeFile: writeFile
        }
      }));
});

describe('config', function () {
  describe('#loadConfig()', function () {
    it('should return the application\'s configuration object', function () {
        const config = {
            mapCenterLatitude: 12,
            mapCenterLongitude: -15.5,
            mapZoom: 3
        };
        parse.mockReturnValue(config)

        expect(loadConfig()).toEqual(config);
    });

    it('should return the default configuration if the configuration file cannot be read', function () {
        readFile.mockImplementation(() => { throw new Error() });

        expect(loadConfig()).toEqual(configDefaults);
    });

    it('should update any missing values from the configuration file with default values', function () {
        const jsonConfig = {
            mapZoom: 1234
        };
        parse.mockReturnValue(jsonConfig);

        const expectedConfig = {
            mapCenterLatitude: configDefaults.mapCenterLatitude,
            mapCenterLongitude: configDefaults.mapCenterLongitude,
            mapZoom: jsonConfig.mapZoom
        };

        expect(loadConfig()).toEqual(expectedConfig);
    });

    it('should replace NaN values for numerical values with the values in the default configuration', function () {
        const jsonConfig = {
            mapCenterLatitude: 'foo',
            mapCenterLongitude: false,
            mapZoom: {}
        };
        parse.mockReturnValue(jsonConfig);

        const config = loadConfig();
        expect(config.mapCenterLatitude).toEqual(configDefaults.mapCenterLatitude);
        expect(config.mapCenterLongitude).toEqual(configDefaults.mapCenterLongitude);
        expect(config.mapZoom).toEqual(configDefaults.mapZoom);
    });
  });
  
  describe('#saveConfig()', function () {
    it('should update the config file', function () {
        const config: Config = {};
        const stringifyReturn = 'foo bar';
        stringify = jest.fn(() => { return stringifyReturn });
        JSON.stringify = stringify

        saveConfig(config);

        expect(stringify).toHaveBeenCalledWith(config);
        expect(writeFile).toHaveBeenCalledWith('config.json', stringifyReturn);
    });
  });
});