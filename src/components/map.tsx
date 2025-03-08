import React from 'react'
import { Cluster, MarkerClusterer } from "@googlemaps/markerclusterer";
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api'
import { Config, GeotaggedPhoto, photoMarkerLoader } from '../types'
import { Fancybox } from '@fancyapps/ui';

import "@fancyapps/ui/dist/fancybox/fancybox.css";

let mapBounds: google.maps.LatLngBounds;

const containerStyle = {
  width: '1000px',
  height: '1000px',
}

function openFancybox(photoPaths: string[]) {
  new Fancybox(
    photoPaths.map((path: string) =>
      {
        return {
          src: path,
          thumb: path
        }
      })
  );
}

function Map({ map, setMap, config }: { map: google.maps.Map, setMap: (map: google.maps.Map) => void, config: Config}) {
  const apiKey = window.electronContext.getGoogleMapsApiKey();

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
  })

  const [photos, setPhotos] = React.useState([]);
  const [visiblePhotos, setVisiblePhotos] = React.useState([]);

  function createMarkers(p: GeotaggedPhoto[], m: google.maps.Map) {
    const PhotoMarker = photoMarkerLoader();

    const markers = p.map((photo: GeotaggedPhoto) => {
      const marker = new PhotoMarker(
        photo.path,
        photo.create_time,
        {
          position: {
            lat: photo.latitude,
            lng: photo.longitude,
          },
          map: m,
        }
      )
      marker.addListener('click', () => openFancybox([photo.path]))
      return marker
    })
    new MarkerClusterer({ map: m, markers, onClusterClick: clusterOnClick });
  }
  

  function clusterOnClick(event: google.maps.MapMouseEvent, cluster: Cluster) {
    const PhotoMarker = photoMarkerLoader();

    //sort by create time
    const paths = cluster.markers.map((marker: typeof PhotoMarker) => marker.photoPath);
    openFancybox(paths);
  }

  const onLoad = React.useCallback(function callback(m: google.maps.Map) {
    setMap(m)

    const loadedPhotos = window.electronContext.loadPhotos().slice(0, 1000)
    setPhotos(loadedPhotos);
    setVisiblePhotos(loadedPhotos);
    createMarkers(loadedPhotos, m);
    
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
    <div>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={{ lat: config.mapCenterLatitude, lng: config.mapCenterLongitude }}
        zoom={config.mapZoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onBoundsChanged={onBoundsChanged}
      />
    </div>
    ) : (
      <></>
    )
}

export default React.memo(Map)
