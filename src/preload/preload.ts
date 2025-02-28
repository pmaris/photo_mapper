import { contextBridge } from "electron";

import { createDatabase, insertPhotos, loadPhotos } from "./db";
import { Config, GeotaggedPhoto } from "../types";
import { getGoogleMapsApiKey, loadConfig, saveConfig } from "./config";

contextBridge.exposeInMainWorld('electronContext', {
  getGoogleMapsApiKey: () => {
    return getGoogleMapsApiKey();
  },
  loadConfig: () => {
    return loadConfig();
  },
  loadPhotos: () => {
    return loadPhotos();
  },
  insertPhotos: (photos: GeotaggedPhoto[]) => {
    insertPhotos(photos)
  },
  saveConfig: (newConfig: Config) => {
    saveConfig(newConfig);
  }
})

createDatabase()
