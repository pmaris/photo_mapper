var fs = require('fs');
var path = require('path');
var recursive = require('recursive-readdir');
var exifParser = require('exif-parser');

module.exports = {
  getPhotoGeotags: getPhotoGeotags,
  getPhotoPaths: getPhotoPaths,
  getSanitizedExtensions: getSanitizedExtensions,
  getPhotoExif: getPhotoExif,
  ignoreFile: ignoreFile
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
 *                                    function will be called with the number of
 *                                    photos that have been checked so far.
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

  function work () {
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
          filePath: photoPaths[index],
          latitude: exif.tags.GPSLatitude,
          longitude: exif.tags.GPSLongitude,
          createTime: 'DateTimeOriginal' in exif.tags ? exif.tags.DateTimeOriginal : 0
        })
      }

      ++index;
    }
    if (index < photoPaths.length) {
      setTimeout(work, 1);
    }
    if (index >= photoPaths.length) {
      callback(geotaggedPhotos);
    }
  }
  work();
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
    var sanitizedExtensions = getSanitizedExtensions(fileExtensions);
    return recursive(baseDirectory, [function (file, stats) {
      return ignoreFile(file, stats, sanitizedExtensions);
    }], function (err, files) {
      if (err) {
        console.error('An error ocurred when reading the directory: ' + err);
        reject(err);
      } else {
        resolve(files);
      }
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

/** Determines if a file should be excluded from an array of files returned by
 * the recursize-readdir package.
 * @param {string} file Absolute path of a file.
 * @param {object} stats Stats object returned from fs.lstat()
 * @param {string[]} sanitizedExtensions File extensions to be ignored,
                                         sanitized to be entirely lowercase and
 *                                       not include periods.
 * @return {boolean} Indicates whether the file should be ignored, true if the
 *                   file should be ignored.
 */
function ignoreFile (file, stats, sanitizedExtensions) {
  var extension = path.extname(file).toLowerCase().replace('.', '');
  return !stats.isDirectory() && sanitizedExtensions.indexOf(extension) === -1;
}
