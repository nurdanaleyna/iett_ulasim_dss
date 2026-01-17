const mysql = require('mysql2/promise');
require('dotenv').config();

async function adjustRural() {
    console.log('🚜 Applying Rural Area Adjustments (Şile, Çatalca, Silivri)...');

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

        // 1. UPDATE METRICS
        console.log('📉 Lowering passenger counts & increasing fuel cost for rural lines...');
        const updateSql = `
            UPDATE trip_metrics tm
            JOIN trips t ON tm.trip_id = t.id
            JOIN bus_lines bl ON t.line_id = bl.id
            SET 
                tm.passenger_count = FLOOR(3 + (RAND() * 12)), 
                tm.fuel_cost = 90.0 
            WHERE 
                bl.start_district_id IN (5, 24, 35) 
                OR 
                bl.end_district_id IN (5, 24, 35);
        `;
        const [updateRes] = await connection.query(updateSql);
        console.log(`   Updated rows: ${updateRes.affectedRows}`);

        // 2. DELETE OLD ALERTS
        console.log('🗑️ Removing old critical alarms for rural lines...');
        const deleteSql = `
            DELETE FROM system_recommendations 
            WHERE line_id IN (
                SELECT id FROM bus_lines 
                WHERE start_district_id IN (5, 24, 35) OR end_district_id IN (5, 24, 35)
            );
        `;
        const [delRes] = await connection.query(deleteSql);
        console.log(`   Deleted ${delRes.affectedRows} old recommendations.`);

        // 3. ADD NEW WARNINGS
        console.log('⚠️ Adding "Inefficient Line" warnings...');
        const insertSql = `
            INSERT INTO system_recommendations (line_id, decision, reason, created_at)
            SELECT DISTINCT
                bl.id,
                'Hattı İptal Et',
                'BÖLGESEL DÜŞÜK TALEP: Sefer maliyeti geliri karşılamıyor (Kırsal Bölge).',
                NOW()
            FROM bus_lines bl
            JOIN trips t ON bl.id = t.line_id
            WHERE 
                (bl.start_district_id IN (5, 24, 35) OR bl.end_district_id IN (5, 24, 35))
            LIMIT 5;
        `;
        const [insRes] = await connection.query(insertSql);
        console.log(`   Added ${insRes.affectedRows} new warnings.`);

        console.log('✅ RURAL ADJUSTMENTS COMPLETE!');
        connection.release();
    } catch (err) {
        console.error('❌ ADJUSTMENT FAILED:', err);
    } finally {
        await pool.end();
    }
}

adjustRural();
