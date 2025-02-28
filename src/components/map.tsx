import React from 'react'
import { GoogleMap, useJsApiLoader, Marker, MarkerClusterer } from '@react-google-maps/api'
import { Config, GeotaggedPhoto } from '../types'
import { Cluster } from '@react-google-maps/marker-clusterer'

let config: Config;
let mapBounds: google.maps.LatLngBounds;

const containerStyle = {
  width: '1000px',
  height: '1000px',
}

const markerClusterOptions = {
  zoomOnClick: false,
  ignoreHidden: true,
  gridSize: 70
};

function clustererOnClick(cluster: Cluster) {
  console.log('cluster clicked')
  console.log(cluster.getMarkers())
}

function markerOnClick(marker: Marker) {
  console.log('marker clicked')
}

function Map() {
  const apiKey = window.electronContext.getGoogleMapsApiKey();
  config = window.electronContext.loadConfig();

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
  })

  const [map, setMap] = React.useState(null)
  const [photos, setPhotos] = React.useState([])
  const [visiblePhotos, setVisiblePhotos] = React.useState([])

  const onLoad = React.useCallback(function callback(m: google.maps.Map) {
    setMap(m)

    const loadedPhotos = window.electronContext.loadPhotos()
    setPhotos(loadedPhotos)
    setVisiblePhotos(loadedPhotos)
  }, [])

  const onUnmount = React.useCallback(function callback(_: google.maps.Map) {
    setMap(null)
  }, [])

  const onBoundsChanged = React.useCallback(function callback()  {
    console.log('repaint bounds')
    mapBounds = map.getBounds();

    console.log('visible photo length after repaint: ' + visiblePhotos.length)
  }, [map])

  return isLoaded ? (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={{ lat: config.mapCenterLatitude, lng: config.mapCenterLongitude }}
      zoom={config.mapZoom}
      onLoad={onLoad}
      onUnmount={onUnmount}
      onBoundsChanged={onBoundsChanged}
    >
      <MarkerClusterer options={markerClusterOptions} onClick={ clustererOnClick }>
      {(clusterer) =>
          visiblePhotos.map((photo, idx) => (
            <Marker
              key={idx}
              position={{ lat: photo.latitude, lng: photo.longitude }}
              clusterer={clusterer}
              onClick={ markerOnClick }
            />
          ))
        }
      </MarkerClusterer>

    </GoogleMap>
  ) : (
    <></>
  )
}

export default React.memo(Map)