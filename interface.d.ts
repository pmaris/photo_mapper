import { GeotaggedPhoto } from "./src/types";

export interface IElectronAPI {
    getGeotaggedPhotos: (directoryPath: string, fileExtensions: string[], progressCallback: (photosRead: number, totalPhotos: number) => void, resultsCallback: (photos: GeotaggedPhoto[]) => void, abort: boolean) => void,
    getGoogleMapsApiKey: () => string,
    loadConfig: () => Config,
    loadPhotos: () => GeotaggedPhoto[],
    savePhotos: (photos: GeotaggedPhoto[]) => void,
    saveConfig: (newConfig: Config) => void,
    selectDirectory: () => string,
}
  
declare global {
    interface Window {
        electronContext: IElectronAPI
    }
}
