const mysql = require('mysql2/promise');
require('dotenv').config();

async function deleteSelectedLines() {
    console.log('🗑️ Deleting selected lines: 1-35T, 32-5B, 35-4B...');

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

        // 1. DELETE LINES
        console.log('   Removing lines...');
        const delLinesSql = `
            DELETE FROM bus_lines 
            WHERE line_code IN ('1-35T', '32-5B', '35-4B');
        `;
        const [lineRes] = await connection.query(delLinesSql);
        console.log(`   Deleted ${lineRes.affectedRows} line(s).`);

        // 2. CLEANUP ORPHANS
        console.log('   Cleaning up orphaned data...');

        // Clean metrics first (child of trips)
        const cleanMetricsSql = `
            DELETE FROM trip_metrics 
            WHERE trip_id IN (SELECT id FROM trips WHERE line_id NOT IN (SELECT id FROM bus_lines));
        `;
        const [metricRes] = await connection.query(cleanMetricsSql);
        console.log(`   Cleaned ${metricRes.affectedRows} orphaned metrics.`);

        // Clean trips (child of lines)
        const cleanTripsSql = `
            DELETE FROM trips 
            WHERE line_id NOT IN (SELECT id FROM bus_lines);
        `;
        const [tripRes] = await connection.query(cleanTripsSql);
        console.log(`   Cleaned ${tripRes.affectedRows} orphaned trips.`);

        // Also clean recommendations
        const cleanRecsSql = `DELETE FROM system_recommendations WHERE line_id NOT IN (SELECT id FROM bus_lines)`;
        await connection.query(cleanRecsSql);

        console.log('✅ BATCH DELETION COMPLETE.');
        connection.release();
    } catch (err) {
        console.error('❌ DELETION FAILED:', err);
    } finally {
        await pool.end();
    }
}

deleteSelectedLines();
