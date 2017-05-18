var assert = require('assert');
var geotagFinder = require('../js/geotag_finder.js');

describe('geotag_finder', function() {

    describe('#getSanitizedExtensions()', function() {
        it('should return an array of extensions converted to lowercase', function() {
            assert.deepEqual(['jpg', 'cr2'], geotagFinder.getSanitizedExtensions(['JPG', 'CR2']));
        });

        it('should remove periods from extensions', function() {
            assert.deepEqual(['jpg', 'cr2'], geotagFinder.getSanitizedExtensions(['.jpg', '.cr2']));
        });
    });

    describe('#ignoreFile()', function() {
        it('should return false when the file path is a directory', function() {
            assert.equal(false, geotagFinder.ignoreFile('abcd.jpg', {isDirectory: function(){return true}}, ['jpg']));
        });

        it('should return false when the file path is not a directory and the file extension is in the array of sanitized extensions', function() {
            assert.equal(false, geotagFinder.ignoreFile('abcd.jpg', {isDirectory: function(){return false}}, ['jpg']));
        });

        it('should return true when the file path is not a directory and the file extension is not in the array of sanitized extensions', function() {
            assert.equal(true, geotagFinder.ignoreFile('abcd.cr2', {isDirectory: function(){return false}}, ['jpg']));
        });
    });
});
