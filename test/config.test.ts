import { Config } from "../src/types";
import { configDefaults, loadConfig, saveConfig } from "../src/preload/config";

let parse: jest.Mock;
let stringify: jest.Mock;

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


beforeAll(() => {
  parse = jest.fn(() => { return {} });
  stringify = jest.fn(() => { return '{}' });

  JSON.parse = parse;
  JSON.stringify = stringify;
})

afterEach(() => {
  jest.resetAllMocks();
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
        readFileSync.mockImplementation(() => { throw new Error() });

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
        expect(writeFileSync).toHaveBeenCalledWith('config.json', stringifyReturn);
    });
  });
});