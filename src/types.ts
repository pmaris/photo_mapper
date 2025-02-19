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
