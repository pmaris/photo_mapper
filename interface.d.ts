import { GeotaggedPhoto } from "./src/types";

export interface IElectronAPI {
    readFile: (filePath: string) => string,
    writeFile: (content: string, filePath: string) => void;
    loadPhotos: () => GeotaggedPhoto[]
}
  
declare global {
    interface Window {
        electronContext: IElectronAPI
    }
}
