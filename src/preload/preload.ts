import { contextBridge, dialog as electronDialog } from "electron";

import { createDatabase, insertPhotos, loadPhotos } from "./db";
import { Config, GeotaggedPhoto } from "../types";
import { getPhotoGeotags, getPhotoPaths } from "./geotag_finder";
import { getGoogleMapsApiKey, loadConfig, saveConfig } from "./config";

contextBridge.exposeInMainWorld('electronContext', {
  getGeotaggedPhotos: (directoryPath: string, fileExtensions: string[], progressCallback: (photosRead: number, totalPhotos: number) => void, abort: boolean) => {
    getPhotoPaths(directoryPath, fileExtensions).then(photoPaths => {
      getPhotoGeotags(photoPaths, progressCallback, (photos: any) => { return }, abort);
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
  insertPhotos: (photos: GeotaggedPhoto[]) => {
    insertPhotos(photos)
  },
  saveConfig: (newConfig: Config) => {
    saveConfig(newConfig);
  },
  selectDirectory: () => {
    console.log('dialog')
    console.log(electronDialog)
    console.log(window)
    console.log(electronDialog.showOpenDialog({ properties: ['openFile', 'multiSelections'] }))
    electronDialog.showOpenDialog({
      properties: ['openDirectory']
  }, function (files) {
      if (files) console.log('selected-file', files[0]);
  });
  }
})

createDatabase()
