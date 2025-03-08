export type Config = {
    mapCenterLatitude?: number,
    mapCenterLongitude?: number,
    mapZoom?: number
}

export type GeotaggedPhoto = {
    path: string,
    latitude: number,
    longitude: number,
    create_time: number
}

interface PhotoMarkerOptions extends google.maps.Marker {
    photoPath: string,
    createTime: number
}

// google namespace will be undefined until the map is loaded, so put PhotoMarker class definition
//  in a function that can be called after the map is loaded
export function photoMarkerLoader() {
    return class PhotoMarker extends google.maps.Marker implements PhotoMarkerOptions {
        photoPath: string;
        createTime: number;

        constructor(photoPath: string, createTime: number, options?: any) {
            super(options);

            this.photoPath = photoPath;
            this.createTime = createTime;
        }
    }
}