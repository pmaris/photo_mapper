export interface IElectronAPI {
    readFile: (filePath: string) => string,
    writeFile: (content: string, filePath: string) => void;
}
  
declare global {
    interface Window {
        electronContext: IElectronAPI
    }
}
