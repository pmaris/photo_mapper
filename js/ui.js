global.jQuery = require('jquery');
require('jquery-ui-bundle');
require('./node_modules/fancybox/dist/js/jquery.fancybox.pack.js');
require('./node_modules/fancybox/dist/helpers/js/jquery.fancybox-thumbs.js');

const dialog = require('electron').remote.dialog;
var $ = jQuery;

const fancyBoxOptions = {
  padding: 5,
  helpers: {
    thumbs: {
      height: 50,
      width: 50
    }
  }
};

module.exports = {
  filtersAreVisible: filtersAreVisible,
  getDateFilterEnd: getDateFilterEnd,
  getDateFilterStart: getDateFilterStart,
  getMapElement: getMapElement,
  initializeFancybox: initializeFancybox,
  markerOnClick: markerOnClick,
  openWithFancyBox: openWithFancyBox
};

/*
 * Open the modal for confirming saving the starting view of the map.
 */
function confirmSaveMapStartLocation() {
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
          saveMapStartLocation();
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

function initFinderUi () {
  $('#progress-bar-label').text('Counting photos');
  $('#finder-progress-bar').progressbar({
    value: false
  });
  $('#finder-result').hide();
  $('#finder-result').text('');
  $('#close-finder-modal-button').hide()
}

function filtersAreVisible () {
  return $('#date-filter').is(':visible');
};

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

function getMapElement () {
  document.getElementById('map');
};

function initializeFancybox () {
  $('.fancybox').fancybox();
};

function markerOnClick () {
  $.fancybox.open({ href: this.photo.path, title: this.photo.title, padding: 5 });
};

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
            startPhotoFinder(selectedFolder,
              $('#file-extensions')[0].value.split(' '),
              $('#update-photos-checkbox')[0].checked);
          } else {
            $('#no-folder-selected').show();
          }
        }
      }
    ]
  });
}

function openWithFancyBox (markers) {
  $.fancybox.open(markers, fancyBoxOptions);
};

/*
 * Open file dialog to choose the database file containing geotags.
 */
function selectDatabase () {
  var options = {
    title: 'Select geotags database',
    defaultPath: 'geotags.db',
    filters: [
      { name: 'Databases', extensions: ['db', 'sqlite', 'sqlite3'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  };
  var files = dialog.showOpenDialog(options);

  if (files) {
    config.database.path = files[0];
    saveIni();

    model.Photo.findAll().then(photos => {
      createMarkersFromPhotos(photos);
    });
    repaintMarkers(map.getBounds(), filterStartTimestamp, filterEndTimestamp);
  }
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

/*
 * Setter for the max value for the progress bar shown in the UI when adding geotagged photos to the
 * application database and for finding photos without geotags.
 * @param {number} maxValue The maximum value to set for the progress bar.
 */
function setProgressBarMax (maxValue) {
  $('#finder-progress-bar').progressbar('option', 'max', maxValue);
  $('#finder-progress-bar').progressbar('option', 'value', 0);
}

/*
 * Setter for the current value for the progress bar shown in the UI when adding geotagged photos to
 * the application database and for finding photos without geotags.
 * @param {number} value The value to set for the progress bar.
 */
function setProgressBarValue (value) {
  $('#finder-progress-bar').progressbar('option', 'value', value);
  $('#progress-bar-label').text(value + ' / ' + $('#finder-progress-bar').progressbar('option', 'max') + ' photos checked');
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

  initFinderUi();

  cancelFinder = false;

  geotagFinder.getPhotoPaths(folderPath, fileExtensions).then(function (photos) {
    setProgressBarMax(photos.length);
    getPhotoGeotags(photos, setProgressBarValue, 100, function (geotaggedPhotos) {
      $('#progress-bar-label').text('Adding photos to database');
      console.log('DONE');
      model.Photo.bulkCreate(geotaggedPhotos, { updateOnDuplicate: ['latitude', 'longitude'] });
      repaintMarkers(map.getBounds(), filterStartTimestamp, filterEndTimestamp);

      $('#finder-result').show();
      var resultString = 'Number of photos added: ' + geotaggedPhotos.length;
      if (updatePhotos) {
        resultString += '<br>Number of photos updated: ' + updatePhotos.length;
      }
      $('#finder-result').html(resultString);
      $('#progress-bar-label').text('Finished');

      $('#close-finder-modal-button').show();
      $('#cancel-finder-button').hide();
      console.log($('#close-finder-modal-button'));
    });
  });
}
