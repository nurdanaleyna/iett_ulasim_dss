const mysql = require('mysql2/promise');
require('dotenv').config();

async function seedMassive() {
    console.log('⚡ Starting Istanbul "Massive" 650 Lines Seeding...');

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

        // 3. MASSIVE LINES
        console.log('Inserting 650 Bus Lines via SQL...');
        const linesSql = `
            INSERT INTO bus_lines (line_code, route_type, start_district_id, end_district_id)
            SELECT 
                CONCAT(d1.id, '-', d2.id, CASE WHEN (d1.id+d2.id)%2=0 THEN 'T' ELSE 'B' END),
                CASE WHEN ABS(d1.id - d2.id) > 5 THEN 'Express' ELSE 'Normal' END,
                d1.id,
                d2.id
            FROM districts d1
            JOIN districts d2 ON d1.id != d2.id
            WHERE 
                (d1.id IN (1, 2, 4, 12, 13, 32) OR d2.id IN (1, 2, 4, 12, 13, 32))
            LIMIT 650;
        `;
        await connection.query(linesSql);

        // 4. TRIPS FOR THESE LINES (1 Trip per Line to be fast)
        console.log('Inserting Trips for 650 lines...');
        const tripsSql = `
            INSERT INTO trips (line_id, bus_plate_number, departure_time)
            SELECT 
                id, 
                CONCAT('34 TP ', 1000 + id), 
                NOW() 
            FROM bus_lines;
        `;
        await connection.query(tripsSql);

        // 5. METRICS (Randomized Logic in SQL for Speed)
        console.log('Inserting Metrics for 650 trips...');
        // Logic: 
        // 20% Critical (Pass > 100)
        // 20% Inefficient (Pass < 20)
        // 60% Normal
        const metricsSql = `
            INSERT INTO trip_metrics (trip_id, passenger_count, fuel_cost, duration_minutes, capacity)
            SELECT 
                id,
                CASE 
                   WHEN id % 5 = 0 THEN 110 -- Critical
                   WHEN id % 5 = 1 THEN 10  -- Inefficient
                   ELSE 50 + (id % 40)      -- Normal
                END,
                50.0,
                60,
                100
            FROM trips;
        `;
        await connection.query(metricsSql);

        // 6. RECOMMENDATIONS FOR CRITICAL/INEFFICIENT
        console.log('Generating Auto-Recommendations...');
        const recsSql = `
             INSERT INTO system_recommendations (line_id, decision, reason, created_at)
             SELECT 
                 t.line_id,
                 CASE 
                    WHEN tm.passenger_count > 100 THEN 'Ek Sefer'
                    WHEN tm.passenger_count < 20 THEN 'Hattı İptal Et'
                 END,
                 CASE 
                    WHEN tm.passenger_count > 100 THEN 'Kapasite %110 aşıldı.'
                    WHEN tm.passenger_count < 20 THEN 'Verimsiz hat.'
                 END,
                 NOW()
             FROM trips t
             JOIN trip_metrics tm ON t.id = tm.trip_id
             WHERE tm.passenger_count > 100 OR tm.passenger_count < 20;
         `;
        await connection.query(recsSql);


        console.log('✅ MASSIVE 650 LINES SEEDING COMPLETE!');
        connection.release();
    } catch (err) {
        console.error('❌ SEEDING FAILED:', err);
    } finally {
        await pool.end();
    }
}

seedMassive();
