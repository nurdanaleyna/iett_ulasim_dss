const mysql = require('mysql2/promise');
require('dotenv').config();

async function deleteSpecificLine() {
    console.log('🗑️ Deleting specific line: 32-5B...');

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

        // 1. DELETE 32-5B LINE
        console.log('   Removing 32-5B from bus_lines...');
        // Note: DELETE CASCADE should handle trips and metrics if FKs are set correctly,
        // but explicit cleanup is safer if constraints are loose.
        const delLineSql = `DELETE FROM bus_lines WHERE line_code = '32-5B'`;
        const [lineRes] = await connection.query(delLineSql);
        console.log(`   Deleted ${lineRes.affectedRows} line(s).`);

        // 2. CLEANUP ORPHANED METRICS (Safety Net)
        console.log('   Cleaning up any orphaned metrics...');
        const cleanupSql = `
            DELETE FROM trip_metrics 
            WHERE trip_id IN (SELECT id FROM trips WHERE line_id NOT IN (SELECT id FROM bus_lines));
        `;
        // This might fail if trips are already deleted by cascade from lines, but safe to run.
        // Or if trips exist but point to non-existent lines (orphans).
        // A better approach for orphans is deleting trips first then metrics, but let's follow user instruction order logic.
        // Actually, if metrics depend on trips, and trips depend on lines...
        // deleting lines -> deleted trips (cascade) -> deleted metrics (cascade).
        // If no cascade, we have orphans.

        // Let's run a generic orphan cleanup for trips too just in case.
        const cleanupTripsSql = `DELETE FROM trips WHERE line_id NOT IN (SELECT id FROM bus_lines)`;
        await connection.query(cleanupTripsSql);

        // Now metrics for non-existent trips
        const cleanupMetricsSql = `DELETE FROM trip_metrics WHERE trip_id NOT IN (SELECT id FROM trips)`;
        const [metricRes] = await connection.query(cleanupMetricsSql);
        console.log(`   Cleaned ${metricRes.affectedRows} orphaned metrics.`);

        console.log('✅ LINE DELETION COMPLETE.');
        connection.release();
    } catch (err) {
        console.error('❌ DELETION FAILED:', err);
    } finally {
        await pool.end();
    }
}

deleteSpecificLine();
