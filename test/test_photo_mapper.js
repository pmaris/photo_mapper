var assert = require('assert');
var sinon = require('sinon');
var proxyquire = require('proxyquire').noCallThru();
var photoMapper = require('../js/photo_mapper.js');

var jQuery = proxyquire('../js/photo_mapper', {jquery: {}, ui: {}});

var jqueryStub = sinon.stub(photoMapper, 'jQuery');
var uiStub = sinon.stub(photoMapper, 'ui');

describe('photo_mapper', function() {
    describe('#dateWithinRange()', function() {
        it('should return true if startDate and endDate are both null', function() {
            assert.equal(true, photoMapper.dateWithinRange(1, null, null));
            assert.equal(true, photoMapper.dateWithinRange(1234567, null, null));
        });

        it('should return true if createDate is after startDate and endDate is null', function() {
            assert.equal(true, photoMapper.dateWithinRange(12345, 12344, null));
            assert.equal(true, photoMapper.dateWithinRange(12345, 12345, null));
        });

        it('should return true if createDate is before endDate and startDate is null', function() {
            assert.equal(true, photoMapper.dateWithinRange(12345, null, 12346));
            assert.equal(true, photoMapper.dateWithinRange(12345, null, 12345));
        });

        it('should return true if createDate is between startDate and endDate', function() {
            assert.equal(true, photoMapper.dateWithinRange(12345, 12344, 12346));
            assert.equal(true, photoMapper.dateWithinRange(12345, 12345, 12346));
            assert.equal(true, photoMapper.dateWithinRange(12345, 12344, 12347));
        });

        it('should return false if createDate is before startDate', function() {
            assert.equal(true, photoMapper.dateWithinRange(12345, 12346, null));
            assert.equal(true, photoMapper.dateWithinRange(12345, 12346, 12347));
        });

        it('should return false if createDate is after endDate', function() {
            assert.equal(true, photoMapper.dateWithinRange(12345, null, 12344));
            assert.equal(true, photoMapper.dateWithinRange(12345, 12343, 12344));
        });
    });
});
