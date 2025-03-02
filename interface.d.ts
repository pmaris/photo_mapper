import { GeotaggedPhoto } from "./src/types";

export interface IElectronAPI {
    getGeotaggedPhotos: (directoryPath: string, fileExtensions: string[], progressCallback: (photosRead: number, totalPhotos: number) => void, abort: boolean) => void,
    getGoogleMapsApiKey: () => string,
    loadConfig: () => Config,
    loadPhotos: () => GeotaggedPhoto[],
    saveConfig: (newConfig: Config) => void,
    selectDirectory: () => void,
}
  
declare global {
    interface Window {
        electronContext: IElectronAPI
    }
}
