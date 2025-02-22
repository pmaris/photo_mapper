import Database from 'better-sqlite3';

import { GeotaggedPhoto } from '../types';

const DATABASE_PATH = 'photos.db'

const db = new Database(DATABASE_PATH);
db.pragma('journal_mode = WAL');

export function createDatabase() {
    db.prepare('CREATE TABLE IF NOT EXISTS photos (path STRING PRIMARY KEY UNIQUE NOT NULL, latitude DOUBLE PRECISION NOT NULL, longitude DOUBLE PRECISION NOT NULL, create_time INTEGER NOT NULL)').run()
}

export function loadPhotos() {
    return db.prepare('SELECT * FROM photos').all() as GeotaggedPhoto[]
}

export function insertPhotos(photos: GeotaggedPhoto[]) {
    const insert = db.prepare('INSERT INTO photos (path, latitude, longitude, create_time) VALUES (@path, @latitude, @longitude, @create_time) ON CONFLICT (path) DO NOTHING');

    const insertMany = db.transaction((photos) => {
        for (const photo of photos) insert.run(photo);
    });

    insertMany(photos);
}
