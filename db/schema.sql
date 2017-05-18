CREATE TABLE IF NOT EXISTS geotags (
    file_path TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    create_time REAL NOT NULL,
    PRIMARY KEY (file_path)
)