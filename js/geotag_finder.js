var fs = require('fs');
var path = require('path');
var exifParser = require('exif-parser');
var walk = require('walk');

module.exports = {
  getPhotoGeotags: getPhotoGeotags,
  getPhotoPaths: getPhotoPaths,
  getSanitizedExtensions: getSanitizedExtensions,
  getPhotoExif: getPhotoExif
}

/**
 * Retrieves the EXIF metadata of an image file.
 * @param {string} photoPath Absolute path of an image file.
 * @return {object} Contents of the image's EXIF metadata tags. If the file
 *                  cannot be read or does not contain EXIF metadata, null will
 *                  will be returned.
 */
function getPhotoExif (photoPath) {
  console.log(photoPath);
  try {
    var fd = fs.openSync(photoPath, 'r');
    // EXIF metadata will always occur in the first 64KB of an image file, so
    // only that much of the file contents needs to be read
    var buffer = Buffer.alloc(65535);
    fs.readSync(fd, buffer, 0, buffer.length, 0);
    fs.closeSync(fd);
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
 * @param {functional} callback Callback to be called after the geotags have
 *                              been read. This function will be called with a
 *                              single argument, an array of objects containing
 *                              the details of the locations of the provided
 *                              photos. Each object has the following keys and
 *                              values:
 *                                path: Absolute path of the photo.
 *                                latitude: The latitude of the location where
 *                                  the photo was taken.
 *                                longitude: The longitude of the location where
 *                                  the photo was taken.
 *                                create_time: Unix epoch timestamp of when the
 *                                  photo was taken.
 */
function getPhotoGeotags (photoPaths, progressCallback, chunkSize, callback) {
  var index = 0;
  var geotaggedPhotos = [];
  /**
   * @param {string[]} photoPaths Absolute paths of photos to get the geotags of.
   */
  function work (photoPaths) {
    var cnt = chunkSize;
    // TODO: Reimplement a way to cancel the finder
    while (cnt-- && index < photoPaths.length) {
      if (progressCallback) {
        progressCallback(index + 1);
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
function getPhotoPaths (baseDirectory, fileExtensions) {
  var promise = new Promise(function (resolve, reject) {
    if (!fs.lstatSync(baseDirectory).isDirectory()) {
      reject(new Error(baseDirectory + ' is not a directory'));
    }

    var files = [];
    var sanitizedExtensions = getSanitizedExtensions(fileExtensions);

    var walker = walk.walk(baseDirectory);
    walker.on('file', function (root, fileStats, next) {
      var filePath = path.join(root, fileStats.name);
      var extension = path.extname(filePath).toLowerCase().replace('.', '');
      if (sanitizedExtensions.indexOf(extension) !== -1) {
        files.push(filePath);
      }
      next();
    });
    walker.on('errors', function (root, nodeStatsArray, next) {
      for (var nodeStats in nodeStatsArray) {
        var nodePath = path.join(root, nodeStats.name);
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
function getSanitizedExtensions (fileExtensions) {
  var sanitizedExtensions = fileExtensions.map(function (currentValue) {
    return String(currentValue).toLowerCase().replace('.', '');
  });
  return sanitizedExtensions;
}
