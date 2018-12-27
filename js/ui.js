global.jQuery = require('jquery');
var $ = global.jQuery;
const dialog = require('electron').remote.dialog;
var path = require('path');
var geotagFinder = require(path.join(__dirname, 'geotag_finder.js'));
var map = require(path.join(__dirname, 'map.js'));
var model = require(path.join(__dirname, 'model.js'));

module.exports = {
  confirmSaveMapStartLocation: confirmSaveMapStartLocation,
  filtersAreVisible: filtersAreVisible,
  getDateFilterEnd: getDateFilterEnd,
  getDateFilterStart: getDateFilterStart,
  getMapElement: getMapElement,
  openFindPhotosModal: openFindPhotosModal,
  initializeFancybox: initializeFancybox,
  initializeFinder: initializeFinder,
  markerOnClick: markerOnClick,
  selectFolder: selectFolder,
  updateProgressBar: updateProgressBar
}

var cancelFinder;
var selectedFolder;

function confirmCancelFinder () {
  var modal = $('#confirm-cancel-finder');
  modal.dialog({
    autoOpen: true,
    modal: true,
    resizable: false,
    draggable: false,
    closeOnEscape: false,
    open: function (event, ui) { $('.ui-dialog-titlebar-close').hide(); },
    buttons: [
      {
        text: 'Cancel search',
        'class': 'button-red',
        click: function () {
          cancelFinder = true;
          modal.dialog('close');
          $('#finder-progress-modal').dialog('destroy');
        }
      },
      {
        text: 'Continue search',
        'class': 'button-blue',
        click: function () {
          modal.dialog('close');
        }
      }
    ]
  });
}

/**
 * Open the modal for confirming saving the starting view of the map.
 * @param {function} saveFunction Function to call to save the map start
 *                                location when the user clicks the OK button.
 */
function confirmSaveMapStartLocation (saveFunction) {
  var modal = $('#confirm-save-map');
  modal.dialog({
    autoOpen: true,
    modal: true,
    resizable: false,
    draggable: false,
    closeOnEscape: false,
    open: function (event, ui) { $('.ui-dialog-titlebar-close').hide(); },
    buttons: [
      {
        text: 'OK',
        click: function () {
          saveFunction();
          modal.dialog('close');
        }
      },
      {
        text: 'Cancel',
        click: function () {
          modal.dialog('close');
        }
      }
    ]
  });
}

function filtersAreVisible () {
  return $('#date-filter').is(':visible');
};

/**
 * Update the UI and save the geotagged photos to the database once the geotag
 * finder has finished running.
 * @param {object[]} geotaggedPhotos Array of objects containing the details of
 *                                   the locations of geotagged photos that have
 *                                   been found. Each object has the following
 *                                   keys and values:
 *                                     path: Absolute path of the photo.
 *                                     latitude: The latitude of the location
 *                                       where the photo was taken.
 *                                     longitude: The longitude of the location
 *                                       where the photo was taken.
 *                                     create_time: Unix epoch timestamp of when
 *                                       the photo was taken.
 */
function finishPhotoFinder (geotaggedPhotos) {
  $('#progress-bar-label').text('Adding photos to database');
  saveGeotaggedPhotos(geotaggedPhotos);
  $('#finder-result').show();
  var resultString = 'Found ' + geotaggedPhotos.length + ' geotagged photos';
  $('#finder-result').html(resultString);
  $('#progress-bar-label').text('Finished');
  $('#close-finder-modal-button').show();
  $('#cancel-finder-button').hide();
}

/**
 * Get the value of the date input in the UI with the ending date for the filter
 * to only show photos on the map taken in a specific date range.
 * @return {number} Unix epoch timestamp of the ending day of the date filter
 *                  range, or null if the filter has not been set.
 */
function getDateFilterEnd () {
  var endDate = $('#filter-end-date')[0].value;
  if (endDate) {
    var end = new Date(endDate);
    return (end.getTime() / 1000) + (end.getTimezoneOffset() * 60) + (60 * 60 * 24) - 1;
  } else {
    return null;
  }
};

/**
 * Get the value of the date input in the UI with the starting date for the
 * filter to only show photos on the map taken in a specific date range.
 * @return {number} Unix epoch timestamp of the starting day of the date filter
 *                  range, or null if the filter has not been set.
 */
function getDateFilterStart () {
  var startDate = $('#filter-begin-date')[0].value;
  if (startDate) {
    var start = new Date(startDate);
    return (start.getTime() / 1000) + (start.getTimezoneOffset() * 60);
  } else {
    return null;
  }
};

/**
 * Retrieve the HTML element containing the Google Map.
 * @return {Element} The HTML element containing the Google Map.
 */
function getMapElement () {
  return document.getElementById('map');
};

function initializeFancybox () {
  $('.fancybox').fancybox({
    thumbs: {
      autoStart: true,
      axis: 'x'
    }
  });
};

function initializeFinder () {
  $('#progress-bar-label').text('Counting photos');
  $('#finder-progress-bar').progressbar({
    value: false
  });
  $('#finder-result').hide();
  $('#finder-result').text('');
  $('#close-finder-modal-button').hide()
}

function markerOnClick () {
  $.fancybox.open({ src: this.photo.path, opts: { caption: this.photo.title } });
}

/*
 * Open the modal for searching for geotagged photos.
 */
function openFindPhotosModal () {
  selectedFolder = null;
  $('#no-folder-selected').hide();

  $('#find-photos-modal').dialog({
    autoOpen: true,
    modal: true,
    dialogClass: 'no-close',
    resizable: false,
    draggable: false,
    closeOnEscape: false,
    open: function (event, ui) { $('.ui-dialog-titlebar-close').hide(); },
    buttons: [
      {
        text: 'Cancel',
        'class': 'button-red',
        click: function () {
          $('#find-photos-modal').dialog('destroy');
        }
      },
      {
        text: 'Start',
        'class': 'button-blue',
        click: function () {
          if (selectedFolder) {
            startPhotoFinder(selectedFolder, $('#file-extensions')[0].value.split(' '));
          } else {
            $('#no-folder-selected').show();
          }
        }
      }
    ]
  });
}

/*
 * Open the folder selector to select a folder to search for geotagged photos.
 */
function selectFolder () {
  var options = {
    title: 'Select photos folder',
    properties: ['openDirectory']
  }
  selectedFolder = dialog.showOpenDialog(options)[0];
  console.log('Selected directory: ' + selectedFolder);
  $('#folder-path').val(selectedFolder);
  $('#no-folder-selected').hide();
}

/**
 * Setter for the current value and maximum value for the progress bar shown in
 * the UI when adding geotagged photos to the application's database.
 * @param {number} value The value to set for the progress bar.
 * @param {number} maxValue The maximum value to set for the progress bar.
 */
function updateProgressBar (value, maxValue) {
  if (typeof value === 'number') {
    $('#finder-progress-bar').progressbar('option', 'value', value);
    $('#progress-bar-label').text(value + ' / ' + $('#finder-progress-bar').progressbar('option', 'max') + ' photos checked');
  }

  if (typeof maxValue === 'number') {
    $('#finder-progress-bar').progressbar('option', 'max', maxValue);
    $('#finder-progress-bar').progressbar('option', 'value', 0);
  }
}

/*
 * Run the geotagged photo finder.
 */
function startPhotoFinder (folderPath, fileExtensions, updatePhotos) {
  $('#find-photos-modal').dialog('destroy');
  var modal = $('#finder-progress-modal');
  modal.dialog({
    autoOpen: true,
    modal: true,
    resizable: false,
    draggable: false,
    title: 'Searching for geotagged photos',
    closeOnEscape: false,
    open: function (event, ui) { $('.ui-dialog-titlebar-close').hide(); },
    buttons: [
      {
        text: 'Cancel',
        'class': 'button-red',
        id: 'cancel-finder-button',
        click: function () {
          confirmCancelFinder();
        }
      },
      {
        text: 'Close',
        'class': 'button-blue',
        id: 'close-finder-modal-button',
        click: function () {
          modal.dialog('destroy');
        }
      }
    ]
  });

  initializeFinder();

  cancelFinder = false;
  geotagFinder.getPhotoPaths(folderPath, fileExtensions).then(photoPaths => {
    geotagFinder.getPhotoGeotags(photoPaths, updateProgressBar, 100, finishPhotoFinder);
  });
}

/**
 * Save geotagged photos to the database, and repaint the map markers using the
 * newly saved photos.
 * @param {object[]} geotaggedPhotos Array of objects containing the details of
 *                                   the locations of geotagged photos that have
 *                                   been found. Each object has the following
 *                                   keys and values:
 *                                     path: Absolute path of the photo.
 *                                     latitude: The latitude of the location
 *                                       where the photo was taken.
 *                                     longitude: The longitude of the location
 *                                       where the photo was taken.
 *                                     create_time: Unix epoch timestamp of when
 *                                       the photo was taken.
 */
function saveGeotaggedPhotos (geotaggedPhotos) {
  model.Photo.bulkCreate(geotaggedPhotos, { ignoreDuplicates: true });
  map.createMarkersFromPhotos(geotaggedPhotos, markerOnClick).then(markers => {
    map.createMarkerClusters(markers);
  });
}
