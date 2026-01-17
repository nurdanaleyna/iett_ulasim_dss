const mysql = require('mysql2/promise');
require('dotenv').config();

async function patchChaos() {
    console.log('🚨 Applying CHAOS MODE Patch (Critical Overload for first 80 lines)...');

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

        // 1. UPDATE METRICS (Make them ALWAYS FULL)
        console.log('🔥 Overloading lines 1-80 with 110-130% capacity...');
        const updateSql = `
            UPDATE trip_metrics tm
            JOIN trips t ON tm.trip_id = t.id
            SET 
                tm.passenger_count = FLOOR(110 + (RAND() * 20)), 
                tm.fuel_cost = 45.0
            WHERE 
                t.line_id <= 80;
        `;
        const [updateRes] = await connection.query(updateSql);
        console.log(`   Updated ${updateRes.affectedRows} trip metrics.`);

        // 2. UPDATE RECOMMENDATIONS
        console.log('📣 Injecting "Critical" alerts for these lines...');

        // Clear old
        await connection.query('DELETE FROM system_recommendations WHERE line_id <= 80');

        // Insert new
        const insertSql = `
            INSERT INTO system_recommendations (line_id, decision, reason, created_at)
            SELECT DISTINCT
                id,
                'Ek Sefer',
                'KRİTİK: Hat gün boyu kapasite üzerindedir. Acil planlama şart.',
                NOW()
            FROM bus_lines
            WHERE id <= 80;
        `;
        const [insRes] = await connection.query(insertSql);
        console.log(`   Added ${insRes.affectedRows} critical recommendations.`);

        console.log('✅ CHAOS PATCH APPLIED!');
        connection.release();
    } catch (err) {
        console.error('❌ PATCH FAILED:', err);
    } finally {
        await pool.end();
    }
}

patchChaos();
