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
  console.log(cluster.getMarkers().map((marker) => marker.key))
}

function markerOnClick(marker: Marker) {
  console.log('marker clicked')
}

function Map({ map, setMap, config }: { map: google.maps.Map, setMap: (map: google.maps.Map) => void, config: Config}) {
  const apiKey = window.electronContext.getGoogleMapsApiKey();

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
  })

  const [photos, setPhotos] = React.useState([])
  const [visiblePhotos, setVisiblePhotos] = React.useState([])

  const onLoad = React.useCallback(function callback(m: google.maps.Map) {
    setMap(m)

    const loadedPhotos = window.electronContext.loadPhotos().slice(0, 1000)
    setPhotos(loadedPhotos);
    setVisiblePhotos(loadedPhotos);
    
    // const mapBounds = m.getBounds();
    // console.log('bounds')
    // console.log(mapBounds)
    // setVisiblePhotos(loadedPhotos.filter((photo: GeotaggedPhoto) => {
    //   mapBounds.contains({ lat: photo.latitude, lng: photo.longitude })
    // }))
  }, [])

  const onUnmount = React.useCallback(function callback(_: google.maps.Map) {
    setMap(null)
  }, [])

  const onBoundsChanged = React.useCallback(function callback()  {
    console.log('repaint bounds')
    mapBounds = map.getBounds();
 
    // const photo = photos[0];
    // console.log(photo)
    // console.log(mapBounds.contains({ lat: photo.latitude, lng: photo.longitude }))

    // !!! CAUSES RE-RENDER
    // setVisiblePhotos(photos.filter((photo: GeotaggedPhoto) => {
    //   mapBounds.contains({ lat: photo.latitude, lng: photo.longitude })
    // }))

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
          visiblePhotos.map((photo) => (
            <Marker
              key={photo.path}
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