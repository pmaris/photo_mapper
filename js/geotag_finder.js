var fs = require('fs');
var path = require('path');
var recursive = require('recursive-readdir');
var exifParser = require('exif-parser');

module.exports = {
    getGeotaggedPhotos: getGeotaggedPhotos,
    getNonGeotaggedPhotos: getNonGeotaggedPhotos,
    getSanitizedExtensions: getSanitizedExtensions,
    ignoreFile: ignoreFile
}

/**
 * Recursively searches through a directory tree to find photos that have been geotagged.
 * Specifically, images must contain valid GPSLatitude and GPSLongitude tags in their EXIF metadata
 * to be considered to have been geotagged.
 * @param {string} baseDirectory Absolute path of the base of a directory tree containing photos.
 * @param {string[]} fileExtensions Case-insensitive array of file type extensions to check. Periods
 *                                  are optional.
 * @return {object[]} Details of all photos from within the directory tree that are geotagged, with
 *                    each object containing the following keys:
 *                        filePath: Absolute path of the image file.
 *                        latitude: The latitude of the location where the photo was taken.
 *                        longitude: The longitude of the location where the photo was taken.
 *                        createTime: Unix timestamp representing the time the photo was taken, or 0
 *                            if the photo does not contain the DateTimeOriginal tag.
 */
function getGeotaggedPhotos(baseDirectory, fileExtensions) {
    var geotaggedPhotos = [];
    var sanitizedExtensions = getSanitizedExtensions(fileExtensions);

    console.log('Searching for geotagged photos in %s', baseDirectory);
    recursive(baseDirectory, [function(file, stats) {
        return ignoreFile(file, stats, sanitizedExtensions);
    }], function (err, files) {
        if (err) {
            log.error('An error ocurred reading when the directory: ' + err);
            return;
        }

        var exif;
        for (i = 0; i < files.length; i++) {
            console.log('Checking whether file %s is geotagged', files[i]);
            try {
                exif = getImageExif(files[i]);
            }
            catch (err) {
                console.warn('Could not read EXIF metadata due to error %s', err);
                continue;
            }

            if (exif.tags.GPSLatitude && exif.tags.GPSLongitude) {
                geotaggedPhotos.push({
                    'filePath': files[i],
                    'latitude': exif.tags.GPSLatitude,
                    'longitude': exif.tags.GPSLatitude,
                    'createTime': 'DateTimeOriginal' in exif.tags ? exif.tags.DateTimeOriginal : 0
                });
            }
        }
    });

    return geotaggedPhotos;
}

/**
 * Recursively searches through a directory tree to find photos that are not geotagged.
 * Specifically, images without valid GPSLatitude and GPSLongitude tags are considered to not be
 * geotagged. This includes images that contain no EXIF metadata at all, or where the EXIF could not
 * be read.
 * @param {string} baseDirectory Absolute path of the base of a directory tree containing photos.
 * @param {string[]} fileExtensions Case-insensitive array of file type extensions to check. Periods
 *                                  are optional.
 * @return {string[]} Absolute paths of all photos from within the directory tree that do not have a
 *                    location in their EXIF metadata.
 */
function getNonGeotaggedPhotos(baseDirectory, fileExtensions) {
    var nonGeotaggedPhotos = [];
    var sanitizedExtensions = getSanitizedExtensions(fileExtensions);

    recursive(baseDirectory, [function(file, stats) {
        return ignoreFile(file, stats, sanitizedExtensions);
    }], function (err, files) {
        if (err) {
            log.error('An error ocurred reading when the directory: ' + err);
            return;
        }

        var exif;
        for (i = 0; i < files.length; i++) {
            console.log('Checking whether file %s is geotagged', files[i]);
            try {
                exif = getImageExif(files[i]);
                if (!exif.tags.GPSLatitude || !exif.tags.GPSLongitude) {
                    notGeotaggedPhotos.push(files[i]);
                }
            }
            catch (err) {
                console.warn('Could not read EXIF metadata for due to error', err);
                notGeotaggedPhotos.push(files[i]);
            }
        }
    });
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
