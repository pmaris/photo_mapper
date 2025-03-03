import { contextBridge, ipcRenderer } from "electron";

import { createDatabase, savePhotos, loadPhotos } from "./db";
import { Config, GeotaggedPhoto } from "../types";
import { getPhotoGeotags, getPhotoPaths } from "./geotag_finder";
import { getGoogleMapsApiKey, loadConfig, saveConfig } from "./config";

contextBridge.exposeInMainWorld('electronContext', {
  getGeotaggedPhotos: (directoryPath: string, fileExtensions: string[], progressCallback: (photosRead: number, totalPhotos: number) => void, resultsCallback: (photos: GeotaggedPhoto[]) => void, abort: boolean) => {
    getPhotoPaths(directoryPath, fileExtensions).then(photoPaths => {
      getPhotoGeotags(photoPaths, progressCallback, resultsCallback, abort);
    });
  },
  getGoogleMapsApiKey: () => {
    return getGoogleMapsApiKey();
  },
  loadConfig: () => {
    return loadConfig();
  },
  loadPhotos: () => {
    return loadPhotos();
  },
  savePhotos: (photos: GeotaggedPhoto[]) => {
    savePhotos(photos)
  },
  saveConfig: (newConfig: Config) => {
    saveConfig(newConfig);
  },
  selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
})

createDatabase()
