const mysql = require('mysql2/promise');
require('dotenv').config();

async function seedLight() {
    console.log('⚡ Starting Istanbul "Light" Packet Seeding...');

    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        multipleStatements: true
    });

    try {
        const connection = await pool.getConnection();

        // 1. CLEANUP
        console.log('Cleaning tables...');
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        await connection.query('TRUNCATE TABLE system_recommendations');
        await connection.query('TRUNCATE TABLE trip_metrics');
        await connection.query('TRUNCATE TABLE trips');
        await connection.query('TRUNCATE TABLE bus_lines');
        await connection.query('TRUNCATE TABLE districts');
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        // 2. DISTRICTS
        console.log('Inserting Districts...');
        const districtsSql = `INSERT INTO districts (id, name, population) VALUES
            (1, 'Kadıköy', 485000), (2, 'Beşiktaş', 175000), (3, 'Üsküdar', 525000), (4, 'Esenyurt', 977000),
            (5, 'Şile', 41000), (6, 'Başakşehir', 503000), (7, 'Beykoz', 248000), (8, 'Ümraniye', 726000),
            (9, 'Fatih', 368000), (10, 'Sarıyer', 349000), (11, 'Pendik', 741000), (12, 'Şişli', 264000),
            (13, 'Avcılar', 452000), (14, 'Bağcılar', 744000), (15, 'Bakırköy', 228000), (16, 'Adalar', 16000),
            (17, 'Arnavutköy', 312000), (18, 'Ataşehir', 423000), (19, 'Bahçelievler', 605000), (20, 'Bayrampaşa', 272000),
            (21, 'Beylikdüzü', 398000), (22, 'Beyoğlu', 225000), (23, 'Büyükçekmece', 269000), (24, 'Çatalca', 76000),
            (25, 'Çekmeköy', 288000), (26, 'Esenler', 445000), (27, 'Eyüpsultan', 422000), (28, 'Gaziosmanpaşa', 493000),
            (29, 'Güngören', 282000), (30, 'Kağıthane', 455000), (31, 'Kartal', 480000), (32, 'Küçükçekmece', 805000),
            (33, 'Maltepe', 525000), (34, 'Sancaktepe', 474000), (35, 'Silivri', 209000), (36, 'Sultanbeyli', 358000),
            (37, 'Sultangazi', 542000), (38, 'Tuzla', 288000), (39, 'Zeytinburnu', 292000);`;
        await connection.query(districtsSql);

        // 3. LINES
        console.log('Inserting Bus Lines...');
        const linesSql = `INSERT INTO bus_lines (id, line_code, route_type, start_district_id, end_district_id) VALUES
            (1, '500T', 'Express', 38, 39),
            (2, 'E-58', 'Express', 4, 12),
            (3, '15F', 'Normal', 7, 1),
            (4, '19S', 'Normal', 10, 1),
            (5, '139A', 'Normal', 3, 5),
            (6, '14ES', 'Ring', 8, 1),
            (7, '8A', 'Normal', 1, 9),
            (8, '76D', 'Express', 6, 9),
            (9, '34BZ', 'Express', 21, 2),
            (10, '11Ü', 'Normal', 3, 8),
            (11, 'KM11', 'Ring', 31, 11),
            (12, '16D', 'Normal', 11, 1),
            (13, '132V', 'Normal', 36, 11),
            (14, '146T', 'Express', 6, 39),
            (15, '79T', 'Normal', 28, 9),
            (16, '99Y', 'Normal', 27, 2),
            (17, '48A', 'Normal', 29, 2),
            (18, 'MR50', 'Ring', 32, 15),
            (19, '97GE', 'Express', 14, 2),
            (20, '89C', 'Normal', 6, 13);`;
        await connection.query(linesSql);

        // 4. TRIPS (Modified to match schema: added plate, removed duration/capacity from this table)
        console.log('Inserting Trips...');
        // Note: ID, LineID, Plate, Time. Duration/Capacity moved effectively to Metrics table by schema design logic or ignored here if not in table.
        // We use a dummy plate for all.
        const tripsSql = `INSERT INTO trips (id, line_id, bus_plate_number, departure_time) VALUES
            (1, 1, '34 TP 1001', DATE_ADD(NOW(), INTERVAL -1 HOUR)),
            (2, 1, '34 TP 1002', DATE_ADD(NOW(), INTERVAL -2 HOUR)),
            (3, 1, '34 TP 1003', DATE_ADD(NOW(), INTERVAL -3 HOUR)),
            (4, 2, '34 TP 2001', DATE_ADD(NOW(), INTERVAL -30 MINUTE)),
            (5, 2, '34 TP 2002', DATE_ADD(NOW(), INTERVAL -90 MINUTE)),
            (6, 3, '34 TP 3001', DATE_ADD(NOW(), INTERVAL -10 MINUTE)),
            (7, 3, '34 TP 3002', DATE_ADD(NOW(), INTERVAL -40 MINUTE)),
            (8, 5, '34 TP 5001', DATE_ADD(NOW(), INTERVAL -4 HOUR)),
            (9, 6, '34 TP 6001', NOW()), (10, 7, '34 TP 7001', NOW()), (11, 8, '34 TP 8001', NOW()),
            (12, 9, '34 TP 9001', NOW()), (13, 10, '34 TP 1010', NOW()), (14, 11, '34 TP 1101', NOW()),
            (15, 12, '34 TP 1201', NOW()), (16, 13, '34 TP 1301', NOW()), (17, 14, '34 TP 1401', NOW()),
            (18, 15, '34 TP 1501', NOW()), (19, 16, '34 TP 1601', NOW()), (20, 17, '34 TP 1701', NOW());`;
        await connection.query(tripsSql);

        // 5. METRICS
        console.log('Inserting Trip Metrics...');
        const metricsSql = `INSERT INTO trip_metrics (trip_id, passenger_count, fuel_cost, duration_minutes, capacity) VALUES
            (1, 115, 50.0, 90, 100),
            (2, 105, 52.0, 95, 100),
            (3, 90, 48.0, 85, 100),
            (4, 120, 30.0, 60, 100),
            (5, 80, 28.0, 65, 100),
            (6, 45, 20.0, 45, 100),
            (7, 50, 22.0, 45, 100),
            (8, 5, 80.0, 120, 100),
            (9, 60, 25.0, 50, 100), (10, 70, 25.0, 50, 100), (11, 85, 25.0, 50, 100),
            (12, 110, 35.0, 50, 100),
            (13, 20, 25.0, 50, 100), (14, 30, 25.0, 50, 100), (15, 95, 30.0, 50, 100),
            (16, 15, 25.0, 50, 100), (17, 40, 25.0, 50, 100), (18, 55, 25.0, 50, 100),
            (19, 102, 30.0, 50, 100),
            (20, 65, 25.0, 50, 100);`;
        await connection.query(metricsSql);

        // 6. RECOMMENDATIONS
        console.log('Inserting Recommendations...');
        const recsSql = `INSERT INTO system_recommendations (line_id, decision, reason, created_at) VALUES
            (1, 'Ek Sefer', 'KRİTİK: 500T hattında kapasite %115 aşıldı. Acil takviye gerekiyor.', NOW()),
            (2, 'Ek Sefer', 'KRİTİK: E-58 hattı sabah seferlerinde yetersiz kalıyor.', NOW()),
            (5, 'Sefer Azaltma', 'VERİMSİZ: Şile hattında sefer başına sadece 5 yolcu var.', NOW()),
            (9, 'Rota Optimizasyonu', 'UYARI: 34BZ hattında yoğunluk artışı gözlemlendi.', NOW());`;
        // NOTE: Changed 'Hattı İptal Et' to 'Sefer Azaltma' or similar if Enum requires it, OR kept it if schema allows TEXT.
        // Schema has `decision TEXT`, so 'Hattı İptal Et' is fine, but backend JS maps 'Sefer Azaltma' -> 'INEFFICIENT_ROUTE'.
        // I will use 'Sefer Azaltma' to ensure backend mapping works (row.latest_decision === 'Sefer Azaltma').
        await connection.query(recsSql);

        console.log('✅ LIGHT PACKET SEEDING COMPLETE!');
        connection.release();
    } catch (err) {
        console.error('❌ SEEDING FAILED:', err);
    } finally {
        await pool.end();
    }
}

seedLight();
