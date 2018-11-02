Electron desktop application for displaying the locations of geottaged photos on a Google map.

Features
========
- Photo locations are displayed using Google Maps
- Photo locations are saved to a database for fast reading - the photos only need to be read once to get their location
- Clustering of map markers for improved performance when displaying the locations of large numbers of photos
- Lightbox with a gallery for viewing the mapped photos
- Filtering of photos on the map by the date they were taken

Getting started
===============
1. Install `nodejs` version `10.0` or higher
2. Install `npm`
3. Install dependencies using using the command `npm install <repository_location>`
4. Run the application using the command `/<repository_location>/node_modules/.bin/electron <repository_location>`
5. Searh for geotagged photos using the search icon in the top left corner of the window

Currently, the map works without a Google Maps API key. If this ever changes in the future, you will have to sign up for a Google Maps API key and then create the file `google_maps.key` in the repository's root directory, and then add your key to the file.

Screenshots
===========
![Map view, showing clustering of photos](https://raw.githubusercontent.com/pmaris/photo_mapper/master/screenshots/overview.png "Map view, showing clustering of photos")
Map view, showing clustering of photos

![Zoomed in view](https://raw.githubusercontent.com/pmaris/photo_mapper/master/screenshots/zoomed%20in%20view.png "Zoomed in view")
Zoomed in view

![Lightbox view](https://raw.githubusercontent.com/pmaris/photo_mapper/master/screenshots/lightbox.png "Lightbox view")
Lightbox view

![Modal to search for geotagged photos](https://raw.githubusercontent.com/pmaris/photo_mapper/master/screenshots/find%20modal.png "Modal to search for geotagged photos")
Modal to search for geotagged photos
