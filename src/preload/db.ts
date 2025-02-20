import Database from 'better-sqlite3';

import { GeotaggedPhoto } from '../types';

const DATABASE_PATH = 'photos.db'
const TABLE_NAME = 'photos'

const db = new Database(DATABASE_PATH);
db.pragma('journal_mode = WAL');

export function createDatabase() {
    db.prepare(`CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (path STRING PRIMARY KEY NOT NULL, latitude DOUBLE PRECISION NOT NULL, longitude DOUBLE PRECISION NOT NULL, create_time INTEGER NOT NULL)`).run()
}

export function loadPhotos() {
    return db.prepare(`SELECT * FROM ${TABLE_NAME}`).all() as GeotaggedPhoto[]
}
