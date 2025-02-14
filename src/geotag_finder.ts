import { closeSync, lstatSync, openSync, readSync} from "fs"
import { extname, join } from "path"
import { walk, type WalkStats } from "walk"

import type { GeotaggedPhoto } from "./types";

var exifParser = require('exif-parser');

/**
 * Retrieves the EXIF metadata of an image file.
 * @param {string} photoPath Absolute path of an image file.
 * @return {object} Contents of the image's EXIF metadata tags. If the file
 *                  cannot be read or does not contain EXIF metadata, null will
 *                  will be returned.
 */
export function getPhotoExif (photoPath: string) {
  console.log(photoPath);
  try {
    var fd = openSync(photoPath, 'r');
    // EXIF metadata will always occur in the first 64KB of an image file, so
    // only that much of the file contents needs to be read
    var buffer = Buffer.alloc(65535);
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
 * @param {number} chunkSize Number of photos to read in each iteration over the
 *                           array of photo paths, between calls to the
 *                           progressCallback function.
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
 */
export function getPhotoGeotags (photoPaths: string[], progressCallback: (photosRead: number, totalPhotos: number) => void, chunkSize: number, callback: (photos: GeotaggedPhoto[]) => void) {
  var index = 0;
  var geotaggedPhotos: GeotaggedPhoto[] = [];
  /**
   * @param {string[]} photoPaths Absolute paths of photos to get the geotags of.
   */
  function work (photoPaths: string[]) {
    var cnt = chunkSize;
    // TODO: Reimplement a way to cancel the finder
    while (cnt-- && index < photoPaths.length) {
      if (progressCallback) {
        progressCallback(index + 1, photoPaths.length);
      }

      try {
        var exif = getPhotoExif(photoPaths[index]);
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
  console.log("Base directory: " + baseDirectory)
  var promise: Promise<string[]> = new Promise(function (resolve, reject) {
    console.log('before')
    try {
      var directoryStat = lstatSync(baseDirectory)
    }
    catch {
      reject(new Error(baseDirectory + ' does not exist'));
    }

    if (!directoryStat.isDirectory()) {
      reject(new Error(baseDirectory + ' is not a directory'));
    }

    var files: string[] = [];
    var sanitizedExtensions = getSanitizedExtensions(fileExtensions);

    var walker = walk(baseDirectory);
    walker.on('file', function (root, fileStats, next) {
      var filePath = join(root, fileStats.name);
      var extension = extname(filePath).toLowerCase().replace('.', '');
      if (sanitizedExtensions.indexOf(extension) !== -1) {
        files.push(filePath);
      }
      next();
    });
    walker.on('errors', function (root: string, nodeStatsArray: WalkStats[], next) {
      for (var nodeStats of nodeStatsArray) {
        var nodePath = join(root, nodeStats.name);
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
  var sanitizedExtensions = fileExtensions.map(function (currentValue) {
    return String(currentValue).toLowerCase().replace('.', '');
  });
  return sanitizedExtensions;
}
