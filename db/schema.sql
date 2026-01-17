CREATE DATABASE IF NOT EXISTS iett_ulasim;
USE iett_ulasim;

-- Districts (İlçeler)
CREATE TABLE IF NOT EXISTS districts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    population INT NOT NULL, -- Nüfus, kullanım oranı analizi için
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bus Lines (Hatlar)
CREATE TABLE IF NOT EXISTS bus_lines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    line_code VARCHAR(20) NOT NULL, -- Örn: 19F
    start_district_id INT,
    end_district_id INT,
    route_type ENUM('Express', 'Ring', 'Normal') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (start_district_id) REFERENCES districts(id) ON DELETE SET NULL,
    FOREIGN KEY (end_district_id) REFERENCES districts(id) ON DELETE SET NULL
);

-- Trips (Seferler)
CREATE TABLE IF NOT EXISTS trips (
    id INT AUTO_INCREMENT PRIMARY KEY,
    line_id INT NOT NULL,
    bus_plate_number VARCHAR(20) NOT NULL, -- Hangi otobüsle?
    departure_time DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (line_id) REFERENCES bus_lines(id) ON DELETE CASCADE
);

-- Trip Metrics (Verimlilik Verisi)
CREATE TABLE IF NOT EXISTS trip_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    trip_id INT NOT NULL,
    passenger_count INT NOT NULL,
    capacity INT NOT NULL, -- Araç kapasitesi
    duration_minutes INT NOT NULL, -- Sefer süresi
    fuel_cost DECIMAL(10, 2) NOT NULL, -- Maliyet
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

-- System Recommendations (Karar Destek)
CREATE TABLE IF NOT EXISTS system_recommendations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    line_id INT NOT NULL,
    decision TEXT NOT NULL, -- Sistemin ürettiği karar
    reason TEXT NOT NULL, -- Kararın nedeni
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (line_id) REFERENCES bus_lines(id) ON DELETE CASCADE
);
