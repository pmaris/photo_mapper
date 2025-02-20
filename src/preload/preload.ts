import { contextBridge } from "electron";
import { readFileSync, writeFileSync } from "fs";
import { createDatabase, loadPhotos } from "./db";

contextBridge.exposeInMainWorld('electronContext', {
  readFile: (filePath: string) => {
    return readFileSync(filePath, 'utf-8');
  },

  writeFile: (content: string, filePath: string) => {
    writeFileSync(filePath, content)
  },
  loadPhotos: () => {
    return loadPhotos()
  }
})

createDatabase()
