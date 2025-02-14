import { resolve } from "path"
import { GeotaggedPhoto } from "../src/types";
import { getPhotoExif, getPhotoGeotags, getPhotoPaths, getSanitizedExtensions } from "../src/geotag_finder";

describe('geotag_finder', function () {
  describe('#getPhotoExif()', function () {
    it('should return null if the file cannot be read', function () {
      expect(getPhotoExif('abcd')).toBeNull();
    });

    it('should return null if the file path is a directory', function () {
      expect(getPhotoExif(__dirname)).toBeNull;
    });

    it('should return null if the file does not contain EXIF metadata', function () {
      expect(getPhotoExif(resolve(__dirname, 'data', 'file_without_exif'))).toBeNull();
    });

    it('should return the EXIF metadata for an image', function () {
      var exif = getPhotoExif(resolve(__dirname, 'data', 'image_with_exif.jpg'));
      expect(exif).not.toBeNull();

      // Test a subset of the fields in the returned EXIF data, specifically the
      // fields that are used by the application
      expect(exif.tags.DateTimeOriginal).toEqual(1503423638);
      expect(exif.tags.GPSLatitude).toEqual(46.585755679985255);
      expect(exif.tags.GPSLongitude).toEqual(-112.01842411999628);
    });
  });

  describe('#getPhotoGeotags()', function () {
    it('should return the location details of geotagged photos', function (done) {
      var photoPaths = [
        resolve(__dirname, 'data', 'photos', 'a', 'c', 'c.jpg'),
        resolve(__dirname, 'data', 'photos', 'b', 'b.jpg')
      ];
      var expectedResponse = [
        {
          create_time: 1503423638,
          latitude: 46.585755679985255,
          longitude: -112.01842411999628,
          path: resolve(__dirname, 'data', 'photos', 'a', 'c', 'c.jpg')
        },
        {
          create_time: 1503247734,
          latitude: 43.6177317599992,
          longitude: -116.19964063006155,
          path: resolve(__dirname, 'data', 'photos', 'b', 'b.jpg')
        }
      ]

      getPhotoGeotags(photoPaths, function () {}, 100, function (photos: GeotaggedPhoto[]) {
        expect(photos.sort()).toEqual(expectedResponse.sort());
        done();
      });
    });

    it('should not include non-geotagged photos in the returned array', function (done) {
      getPhotoGeotags([resolve(__dirname, 'data', 'image_without_geotags.jpg')], function () {}, 100, (photos: GeotaggedPhoto[]) => {
        expect(photos).toEqual([]);
        done();
      });
    });

    it('should not include photos with EXIF data that cannot be read in the returned array', function (done) {
      getPhotoGeotags([resolve(__dirname, 'data', 'image_without_exif.jpg')], function () {}, 100, (photos: GeotaggedPhoto[]) => {
        expect(photos).toEqual([]);
        done();
      });
    });

    it('should update the progress callback function with the number of photos that have been read', function (done) {
      var progressCallback = jest.fn(() => {});
      var photoPaths = [
        resolve(__dirname, 'data', 'image_with_exif.jpg'),
        resolve(__dirname, 'data', 'image_without_exif.jpg'),
        resolve(__dirname, 'data', 'image_without_geotags.jpg')
      ];

      getPhotoGeotags(photoPaths, progressCallback, 1, (_: GeotaggedPhoto[]) => {
        expect(progressCallback.mock.calls).toHaveLength(4);
        expect(progressCallback.mock.calls).toEqual([[0, 3], [1, 3], [2, 3], [3, 3]]);
        done();
      });
    });
  });

  describe('#getPhotoPaths()', function () {
    const testPhotosDir = resolve(__dirname, '..', 'test', 'data', 'photos');

    it('should return a resolved promise with the paths to all photos in the directory that have the specified extensions', function () {
      getPhotoPaths(testPhotosDir, ['jpg']).then((files: string[]) => {
        expect(files.sort()).toEqual([resolve(testPhotosDir, 'a', 'c', 'c.jpg'), resolve(testPhotosDir, 'b', 'b.jpg')]);
      });
    })

    it('should return a resolved promise with an empty array if no files in the directory have the specified extensions', function () {
      return getPhotoPaths(testPhotosDir, ['tiff']).then((files: string[]) => {
        expect(files).toEqual([]);
      });
    });

    it('should return a rejected promise if given a path to directory that does not exist', function () {
      return expect(getPhotoPaths('/foo/bar', ['jpg'])).rejects.toEqual(new Error('/foo/bar does not exist'));
    });

    it('should return a rejected promise if given a path to a file', function () {
      return expect(getPhotoPaths(__filename, ['jpg'])).rejects.toEqual(new Error(__filename + ' is not a directory'));
    })
  });

  describe('#getSanitizedExtensions()', function () {
    it('should return an array of extensions converted to lowercase', function () {
      expect(getSanitizedExtensions(['JPG', 'CR2'])).toEqual(['jpg', 'cr2']);
    });

    it('should remove periods from extensions', function () {
      expect(getSanitizedExtensions(['.jpg', '.CR2'])).toEqual(['jpg', 'cr2']);
    });

    it('should return an empty array if given an empty array', function () {
      expect(getSanitizedExtensions([])).toEqual([]);
    });
  });
});
