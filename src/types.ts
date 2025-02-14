export type Config = {
    map?: MapConfig
}

type MapConfig = {
    centerLatitude?: number,
    centerLongitude?: number,
    zoom?: number
}

export type GeotaggedPhoto = {
    path: string,
    latitude: number,
    longitude: number,
    create_time: number
}