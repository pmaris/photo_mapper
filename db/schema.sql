CREATE TABLE IF NOT EXISTS geotags (
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    PRIMARY KEY (file_path, file_name)
)