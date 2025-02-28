import { GeotaggedPhoto } from "./src/types";

export interface IElectronAPI {
    getGoogleMapsApiKey: () => string,
    loadConfig: () => Config,
    loadPhotos: () => GeotaggedPhoto[],
    saveConfig: (newConfig: string) => void
}
  
declare global {
    interface Window {
        electronContext: IElectronAPI
    }
}
