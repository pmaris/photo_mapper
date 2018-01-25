var fs = require('fs');
var path = require('path');
var recursive = require('recursive-readdir');
var exifParser = require('exif-parser');

module.exports = {
    getGeotaggedPhotos: getGeotaggedPhotos,
    getNonGeotaggedPhotos: getNonGeotaggedPhotos,
    getPhotosMatchingFilters: getPhotosMatchingFilters,
    getSanitizedExtensions: getSanitizedExtensions,
    ignoreFile: ignoreFile,
    getImageExif: getImageExif
}

/**
 * Get the details of photos in a given array of file paths that are geotagged. Specifically, photos
 * that contain valid GPSLatitude and GPSLongitude tags in their EXIF metadata are considered to be
 * geotagged.
 * @param (string[]) photoPaths Absolute paths of photos to search through for geotagged photos.
 * @return {object[]} Details of all photos from within the directory tree that are geotagged, with
 *                    each object containing the following keys:
 *                        filePath: Absolute path of the image file.
 *                        latitude: The latitude of the location where the photo was taken.
 *                        longitude: The longitude of the location where the photo was taken.
 *                        createTime: Unix timestamp representing the time the photo was taken, or 0
 *                            if the photo does not contain the DateTimeOriginal tag.
 */
function getGeotaggedPhotos(photoPaths) {
        try {
            exif = getImageExif(photoPaths[i]);
        }
        catch (err) {
            return null;
        }

        if (exif.tags.GPSLatitude && exif.tags.GPSLongitude) {
            metadata = {
                'filePath': photoPaths[i],
                'latitude': exif.tags.GPSLatitude,
                'longitude': exif.tags.GPSLongitude,
                'createTime': 'DateTimeOriginal' in exif.tags ? exif.tags.DateTimeOriginal : 0
            }
        }

    return metadata;
}

/**
 * Get the paths of photos in a given array of file paths that are not geotagged. Specfically,
 * photos without valid GPSLatitude and GPSLongitude tags in their EXIF metadata are considered to
 * not be geotagged. This includes images that contain no EXIF metadata at all, or where the EXIF
 * could not be read.
 * @param (string[]) photoPaths Absolute paths of photos to search through for geotagged photos.
 * @param (function) counterHandler
 * @return {string[]} Absolute paths of all photos from within the directory tree that do not have a
 *                    location in their EXIF metadata.
 */
function getNonGeotaggedPhotos(photoPaths, counterHandler) {
    var nonGeotaggedPhotos = [];
    var exif;

    for (i = 0; i < photoPaths.length; i++) {
        console.log('Checking whether file %s is geotagged', photoPaths[i]);
        try {
            exif = getImageExif(photoPaths[i]);
            if (!exif.tags.GPSLatitude || !exif.tags.GPSLongitude) {
                notGeotaggedPhotos.push(photoPaths[i]);
            }
        }
        catch (err) {
            console.warn('Could not read EXIF metadata for due to error', err);
            notGeotaggedPhotos.push(photoPaths[i]);
        }
    }
    return nonGeotaggedPhotos;
}

/**
 * Retrieves the EXIF metadata of an image file.
 * @param {string} imagePath Absolute path of an image file.
 * @return {object} Contents of the image's EXIF metadata tags.
 */
function getImageExif(imagePath) {
    console.log(imagePath);
    // EXIF metadata will always occur in the first 64KB of an image file, so only that much of the
    // file contents needs to be read
    var fd = fs.openSync(imagePath, 'r');
    var buffer = new Buffer(65535);
    fs.readSync(fd, buffer, 0, buffer.length, 0);
    fs.closeSync(fd);
    return exifParser.create(buffer).parse();
}

function getPhotosMatchingFilters(baseDirectory, fileExtensions, callback) {
    var sanitizedExtensions = getSanitizedExtensions(fileExtensions);
    recursive(baseDirectory, [function(file, stats) {
        return ignoreFile(file, stats, sanitizedExtensions);
    }], function (err, files) {
        if (err) {
            log.error('An error ocurred reading when the directory: ' + err);
            return;
        }
        callback(files);
    });

}

/**
 * Sanitizes an array of file extensions by converting all of them to lowercase and removing
 * periods.
 * @param {string[]} fileExtensions The file extensions to santize.
 * @return {string[]} Sanitized array of file extensions.
 */
function getSanitizedExtensions(fileExtensions) {
     var sanitizedExtensions = fileExtensions.map(function(currentValue) {
        return currentValue.toLowerCase().replace('.', '');
    });
    return sanitizedExtensions;
}

/** Determines if a file should be excluded from an array of files returned by the recursize-readdir
 * package.
 * @param {string} file Absolute path of a file.
 * @param {object} stats Stats object returned from fs.lstat()
 * @param {string[]} sanitizedExtensions File extensions to be ignored, sanitized to be entirely
 *                                       lowercase and not include periods.
 * @return {boolean} Indicates if the boolean should be ignore; true if the file should be ignored.
 */
function ignoreFile(file, stats, sanitizedExtensions) {
    var extension = path.extname(file).toLowerCase().replace('.', '');
    // Test whether the file is a directory and whether the file extension is in the list of allowed
    // extensions
    return !stats.isDirectory() && sanitizedExtensions.indexOf(extension) == -1;
}
