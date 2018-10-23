var fs = require('fs');
var path = require('path');
var recursive = require('recursive-readdir');
var exifParser = require('exif-parser');

module.exports = {
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
 * Get the absolute paths of all photos in a directory tree with specified file
 * extensions.
 * @param {string} baseDirectory The base directory in a directory tree to
 *                               search for photos.
 * @param {string[]} fileExtensions Case-insensitive file extensions of the
 *                                  files to search for.
 * @param {function} callback Function to call with the paths of photos that
 *                            were found. This function will be passed a single
 *                            argument, an array of unsorted absolute paths of
 *                            the photos that were found.
 */
function getPhotoPaths (baseDirectory, fileExtensions, callback) {
  var sanitizedExtensions = getSanitizedExtensions(fileExtensions);
  return recursive(baseDirectory, [function (file, stats) {
    return ignoreFile(file, stats, sanitizedExtensions);
  }], function (err, files) {
    if (err) {
      console.error('An error ocurred when reading the directory: ' + err);
      callback([]);
    } else {
      callback(files);
    }
  });
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
