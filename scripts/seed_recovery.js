const mysql = require('mysql2/promise');
require('dotenv').config();

async function seedRecovery() {
    console.log('🚀 Starting Istanbul "Recovery" Packet (Profit & High Pax)...');

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

        // 1. CLEANUP (Only Trips and Metrics)
        console.log('Cleaning Trips & Metrics (Keeping Lines)...');
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        await connection.query('TRUNCATE TABLE system_recommendations');
        await connection.query('TRUNCATE TABLE trip_metrics');
        await connection.query('TRUNCATE TABLE trips');
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        // 2. INSERT FREQUENT TRIPS (14 Trips per line per day)
        console.log('Inserting Frequent Trips (06:00 - 22:00)...');
        // Schema: trips (id, line_id, bus_plate_number, departure_time)
        const tripsSql = `
            INSERT INTO trips (line_id, bus_plate_number, departure_time)
            SELECT 
                bl.id,
                '34 TP REC', -- Placeholder plate
                DATE_ADD(CURDATE(), INTERVAL h.hour_num HOUR)
            FROM bus_lines bl
            CROSS JOIN (
                SELECT 6 as hour_num UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 
                UNION SELECT 10 UNION SELECT 12 UNION SELECT 14 UNION SELECT 16 
                UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20 
                UNION SELECT 21 UNION SELECT 22
            ) h;
        `;
        await connection.query(tripsSql);

        // 3. INSERT PROFITABLE METRICS
        console.log('Inserting Profitable Metrics (High Pax, Optimized Fuel)...');
        // Schema: trip_metrics (trip_id, passenger_count, capacity, duration_minutes, fuel_cost)
        // We join back to trips -> bus_lines to get route_type for duration logic
        const metricsSql = `
            INSERT INTO trip_metrics (trip_id, passenger_count, capacity, duration_minutes, fuel_cost)
            SELECT 
                t.id,
                CASE 
                    WHEN HOUR(t.departure_time) IN (7,8,9,17,18,19) THEN FLOOR(90 + (RAND() * 30))
                    ELSE FLOOR(40 + (RAND() * 30))
                END,
                100, -- Capacity fixed at 100
                CASE WHEN bl.route_type = 'Express' THEN 80 ELSE 45 END, -- Duration based on route type
                15.0 + (RAND() * 5) -- Fuel cost
            FROM trips t
            JOIN bus_lines bl ON t.line_id = bl.id;
        `;
        await connection.query(metricsSql);

        // 4. REGENERATE CRITICAL ALARMS
        console.log('Regenerating Critical Alarms...');
        const recsSql = `
            INSERT INTO system_recommendations (line_id, decision, reason, created_at)
            SELECT DISTINCT
                t.line_id,
                'Ek Sefer',
                CONCAT('AŞIRI YOĞUNLUK: ', DATE_FORMAT(t.departure_time, '%H:00'), ' seferinde kapasite %', ROUND((tm.passenger_count/tm.capacity)*100), ' doldu.'),
                NOW()
            FROM trips t
            JOIN trip_metrics tm ON t.id = tm.trip_id
            WHERE tm.passenger_count > 105
            LIMIT 50; 
        `;
        await connection.query(recsSql);

        console.log('✅ RECOVERY PACKET APPLIED! (Profit Mode ON)');
        connection.release();
    } catch (err) {
        console.error('❌ RECOVERY FAILED:', err);
    } finally {
        await pool.end();
    }
}

seedRecovery();
