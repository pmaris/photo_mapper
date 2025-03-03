import { closeSync, lstatSync, openSync, readSync } from "fs"
import { extname, join } from "path"
import { walk, type WalkStats } from "walk"

import type { GeotaggedPhoto } from "../types";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const exifParser = require('exif-parser');

const CHUNK_SIZE = 100;

/**
 * Retrieves the EXIF metadata of an image file.
 * @param {string} photoPath Absolute path of an image file.
 * @return {object} Contents of the image's EXIF metadata tags. If the file
 *                  cannot be read or does not contain EXIF metadata, null will
 *                  will be returned.
 */
export function getPhotoExif (photoPath: string) {
  // console.log(photoPath);
  try {
    const fd = openSync(photoPath, 'r');
    // EXIF metadata will always occur in the first 64KB of an image file, so
    // only that much of the file contents needs to be read
    const buffer = Buffer.alloc(65535);
    readSync(fd, buffer, 0, buffer.length, 0);
    closeSync(fd);
    return exifParser.create(buffer).parse();
  } catch (err) {
    console.error('Could not open file due to error', err);
    return null;
  }
}

/**
 * Get the locations of geotagged photos from a given array of absolute paths of
 * photos, while passing the progress to a callback function.
 * @param {string[]} photoPaths Absolute paths of photos to get the geotags of.
 * @param {function} progressCallback Callback to be called with each iteration
 *                                    over the array of photo paths. This
 *                                    function will be called with two
 *                                    arguments, the number of photos that have
 *                                    been checked so far, and the total number
 *                                    of photos that have been found.
 * @param {function} callback Callback to be called after the geotags have
 *                            been read. This function will be called with a
 *                            single argument, an array of objects containing
 *                            the details of the locations of the provided
 *                            photos. Each object has the following keys and
 *                            values:
 *                              path: Absolute path of the photo.
 *                              latitude: The latitude of the location where
 *                                the photo was taken.
 *                              longitude: The longitude of the location where
 *                                the photo was taken.
 *                              create_time: Unix epoch timestamp of when the
 *                                photo was taken.
 * @param {boolean} abort
 */
export function getPhotoGeotags (photoPaths: string[], progressCallback: (photosRead: number, totalPhotos: number) => void, callback: (photos: GeotaggedPhoto[]) => void, abort: boolean) {
  let index = 0;
  const geotaggedPhotos: GeotaggedPhoto[] = [];
  /**
   * @param {string[]} photoPaths Absolute paths of photos to get the geotags of.
   */
  function work (photoPaths: string[]) {
    let cnt = CHUNK_SIZE;

    while (cnt-- && index < photoPaths.length && !abort) {
      if (progressCallback) {
        progressCallback(index + 1, photoPaths.length);
      }

      let exif;
      try {
        exif = getPhotoExif(photoPaths[index]);
      } catch (err) {
        console.error('Error occurred while reading EXIF for photo ' + photoPaths[index] + ' ' + err);
      }

      if (exif && exif.tags.GPSLatitude && exif.tags.GPSLongitude) {
        geotaggedPhotos.push({
          path: photoPaths[index],
          latitude: exif.tags.GPSLatitude,
          longitude: exif.tags.GPSLongitude,
          create_time: 'DateTimeOriginal' in exif.tags ? exif.tags.DateTimeOriginal : 0
        })
      }

      ++index;
    }
    if (abort) {
      console.log('Aborting execution')
      return
    }
    if (index < photoPaths.length) {
      setTimeout(function () { work(photoPaths) }, 1);
    }
    if (index >= photoPaths.length) {
      callback(geotaggedPhotos);
    }
  }
  // Update progress with the total number of photos that were found
  progressCallback(0, photoPaths.length);
  work(photoPaths);
}

/**
 * Get the absolute paths of all photos in a directory tree with specified file
 * extensions.
 * @param {string} baseDirectory The base directory in a directory tree to
 *                               search for photos.
 * @param {string[]} fileExtensions Case-insensitive file extensions of the
 *                                  files to search for.
 * @return {Promise} Resolves with an array of unsorted absolute paths of the
 *                   photos that were found, or rejects if the provided
 *                   baseDirectory cannot be read.
 */
export function getPhotoPaths (baseDirectory: string, fileExtensions: string[]): Promise<string[]> {
  const promise: Promise<string[]> = new Promise(function (resolve, reject) {
    let directoryStat;
    try {
      directoryStat = lstatSync(baseDirectory)
    }
    catch {
      reject(new Error(baseDirectory + ' does not exist'));
    }

    if (!directoryStat.isDirectory()) {
      reject(new Error(baseDirectory + ' is not a directory'));
    }

    const files: string[] = [];
    const sanitizedExtensions = getSanitizedExtensions(fileExtensions);

    const walker = walk(baseDirectory);
    walker.on('file', function (root: string, fileStats: WalkStats, next: () => void) {
      const filePath = join(root, fileStats.name);
      const extension = extname(filePath).toLowerCase().replace('.', '');
      if (sanitizedExtensions.indexOf(extension) !== -1) {
        files.push(filePath);
      }
      next();
    });
    walker.on('errors', function (root: string, nodeStatsArray: WalkStats[], next: () => void) {
      let nodePath: string;
      for (const nodeStats of nodeStatsArray) {
        nodePath = join(root, nodeStats.name);
        console.error('Error occurred while reading  ' + nodePath + ': ' + nodeStats.error);
      }
      next();
    });
    walker.on('end', function () {
      resolve(files);
    });
  });
  return promise;
}

/**
 * Sanitizes an array of file extensions by converting all of them to lowercase
 * and removing periods.
 * @param {string[]} fileExtensions The file extensions to sanitize.
 * @return {string[]} Sanitized array of file extensions.
 */
export function getSanitizedExtensions (fileExtensions: string[]): string[] {
  const sanitizedExtensions = fileExtensions.map(function (currentValue) {
    return String(currentValue).toLowerCase().replace('.', '');
  });
  return sanitizedExtensions;
}
