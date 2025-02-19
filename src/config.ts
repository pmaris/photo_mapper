import { Config } from "./types";

const configPath = 'config.json';

export const configDefaults = {
    mapCenterLatitude: 37.75,
    mapCenterLongitude: -122.44,
    mapZoom: 10
  }

export function loadConfig() {
    let config: Config;

    try {
        const loadedConfig = JSON.parse(window.electronContext.readFile(configPath));
        console.log('Loaded configuration from JSON file: ' + JSON.stringify(loadedConfig));
        
        // Update any missing fields in the configuration object with default values
        config = Object.assign({}, configDefaults, loadedConfig)
        // for (const key of Object.keys(configDefaults)) {
        //     config[key] = Object.assign({}, configDefaults, loadedConfig);
        // }
    } catch (err) {
        console.error('Could not read configuration from config file, setting defaults');
        console.error(err);
        config = configDefaults;
    }
    
    // If any numerical value is not a number, use the default value for that field
    config.mapCenterLatitude = typeof config.mapCenterLatitude === 'number' ? config.mapCenterLatitude : configDefaults.mapCenterLatitude;
    config.mapCenterLongitude = typeof config.mapCenterLongitude === 'number' ? config.mapCenterLongitude : configDefaults.mapCenterLongitude;
    config.mapZoom = typeof config.mapZoom === 'number' ? config.mapZoom : configDefaults.mapZoom;

    console.log('Configuration: ' + JSON.stringify(config));

    return config;
}

export function saveConfig (newConfig: Config) {
    console.log('Updating configuration file');
    window.electronContext.writeFile(configPath, JSON.stringify(newConfig));
  }
  