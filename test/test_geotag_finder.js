var assert = require('assert');
var path = require('path');
var sinon = require('sinon');
var geotagFinder = require('../js/geotag_finder.js');

describe('geotag_finder', function () {
  describe('#getPhotoExif()', function () {
    it('should return null if the file cannot be read', function () {
      assert.strictEqual(geotagFinder.getPhotoExif('abcd'), null);
    });

    it('should return null if the file path is a directory', function () {
      assert.strictEqual(geotagFinder.getPhotoExif(__dirname), null);
    });

    it('should return null if the file does not contain EXIF metadata', function () {
      assert.strictEqual(geotagFinder.getPhotoExif(path.resolve(__dirname, 'data', 'file_without_exif')), null);
    });

    it('should return the EXIF metadata for an image', function () {
      var exif = geotagFinder.getPhotoExif(path.resolve(__dirname, 'data', 'image_with_exif.jpg'));
      assert.notStrictEqual(exif, null);

      // Test a subset of the fields in the returned EXIF data, specifically the
      // fields that are used by the application
      assert.strictEqual(exif.tags.DateTimeOriginal, 1503423638);
      assert.strictEqual(exif.tags.GPSLatitude, 46.585755679985255);
      assert.strictEqual(exif.tags.GPSLongitude, -112.01842411999628);
    });
  });

  describe('#getPhotoGeotags()', function () {
    it('should return the location details of geotagged photos', function (done) {
      var photoPaths = [
        path.resolve(__dirname, 'data', 'photos', 'a', 'c', 'c.jpg'),
        path.resolve(__dirname, 'data', 'photos', 'b', 'b.jpg')
      ];
      var expectedResponse = [
        {
          create_time: 1503423638,
          latitude: 46.585755679985255,
          longitude: -112.01842411999628,
          path: path.resolve(__dirname, 'data', 'photos', 'a', 'c', 'c.jpg')
        },
        {
          create_time: 1503247734,
          latitude: 43.6177317599992,
          longitude: -116.19964063006155,
          path: path.resolve(__dirname, 'data', 'photos', 'b', 'b.jpg')
        }
      ]

      geotagFinder.getPhotoGeotags(photoPaths, function () {}, 100, function (photos) {
        assert.deepStrictEqual(photos.sort(), expectedResponse.sort());
        done();
      });
    });

    it('should not include non-geotagged photos in the returned array', function (done) {
      geotagFinder.getPhotoGeotags([path.resolve(__dirname, 'data', 'image_without_geotags.jpg')], function () {}, 100, function (photos) {
        assert.deepStrictEqual(photos, []);
        done();
      });
    });

    it('should not include photos with EXIF data that cannot be read in the returned array', function (done) {
      geotagFinder.getPhotoGeotags([path.resolve(__dirname, 'data', 'image_without_exif.jpg')], function () {}, 100, function (photos) {
        assert.deepStrictEqual(photos, []);
        done();
      });
    });

    it('should update the progress callback function with the number of photos that have been read', function (done) {
      var progressCallback = sinon.fake();
      var photoPaths = [
        path.resolve(__dirname, 'data', 'image_with_exif.jpg'),
        path.resolve(__dirname, 'data', 'image_without_exif.jpg'),
        path.resolve(__dirname, 'data', 'image_without_geotags.jpg')
      ];

      geotagFinder.getPhotoGeotags(photoPaths, progressCallback, 1, function (photos) {
        assert.strictEqual(progressCallback.callCount, 4);
        assert.deepStrictEqual(progressCallback.args, [[0, 3], [1], [2], [3]]);
        done();
      });
    });
  });

  describe('#getPhotoPaths()', function () {
    it('should return a resolved promise with the paths to all photos in the directory that have the specified extensions', function () {
      const photosDir = path.resolve(__dirname, 'data', 'photos');
      return geotagFinder.getPhotoPaths(photosDir, ['jpg'], function (files) {
        assert.deepStrictEqual(files.sort(), [path.resolve(photosDir, 'a', 'c', 'c.jpg'), path.resolve(photosDir, 'b', 'b.jpg')]);
      });
    })

    it('should return a resolved promise with an empty array if no files in the directory have the specified extensions', function () {
      return geotagFinder.getPhotoPaths(path.resolve(__dirname, 'data', 'photos'), ['tiff'], function (files) {
        assert.deepStrictEqual(files, []);
      });
    });

    it('should return a rejected promise if given a path to directory that doesnt exist', function () {
      assert.rejects(geotagFinder.getPhotoPaths('/foo/bar', ['jpg']));
    });

    it('should return a rejected promise if given a path to a file', function () {
      assert.rejects(geotagFinder.getPhotoPaths(__filename, ['jpg']));
    })
  });

  describe('#getSanitizedExtensions()', function () {
    it('should return an array of extensions converted to lowercase', function () {
      assert.deepStrictEqual(geotagFinder.getSanitizedExtensions(['JPG', 'CR2']), ['jpg', 'cr2']);
    });

    it('should remove periods from extensions', function () {
      assert.deepStrictEqual(geotagFinder.getSanitizedExtensions(['.jpg', '.CR2']), ['jpg', 'cr2']);
    });

    it('should return an empty array if given an empty array', function () {
      assert.deepStrictEqual(geotagFinder.getSanitizedExtensions([]), []);
    });

    it('should convert all values in the array to strings', function () {
      assert.deepStrictEqual(geotagFinder.getSanitizedExtensions([123, true, null]), ['123', 'true', 'null']);
    });
  });
});
