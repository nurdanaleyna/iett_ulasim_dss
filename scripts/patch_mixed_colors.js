const mysql = require('mysql2/promise');
require('dotenv').config();

async function patchMixedColors() {
    console.log('🟡 Applying Mixed Colors Patch (Yellow & Red Warnings)...');

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

        // 1. DELETE TOP 3 RED
        console.log('🗑️ Removing top 3 Critical (Red) alerts to make space...');
        const delSql = `
            DELETE FROM system_recommendations 
            WHERE decision = 'Ek Sefer' 
            ORDER BY created_at DESC 
            LIMIT 3;
        `;
        const [delRes] = await connection.query(delSql);
        console.log(`   Deleted ${delRes.affectedRows} rows.`);

        // 2. INSERT 3 YELLOW ALERTS (Use fresh timestamp for one, slightly older for others)
        console.log('⚠️ Injecting 3 Warning (Yellow) alerts for rural lines...');

        // Şile (NOW)
        await connection.query(`
            INSERT INTO system_recommendations (line_id, decision, reason, created_at)
            SELECT id, 'Hattı İptal Et', 'DÜŞÜK YOĞUNLUK: Sefer başına ortalama 3 yolcu.', NOW()
            FROM bus_lines WHERE start_district_id = 5 LIMIT 1;
        `);

        // Silivri (-2 min)
        await connection.query(`
            INSERT INTO system_recommendations (line_id, decision, reason, created_at)
            SELECT id, 'Hattı İptal Et', 'VERİMSİZ ROTA: Yakıt maliyeti geliri aştı.', DATE_SUB(NOW(), INTERVAL 2 MINUTE)
            FROM bus_lines WHERE start_district_id = 35 LIMIT 1;
        `);

        // Çatalca (-4 min)
        await connection.query(`
            INSERT INTO system_recommendations (line_id, decision, reason, created_at)
            SELECT id, 'Hattı İptal Et', 'TALEPSİZLİK: Bölgesel yolcu azlığı nedeniyle iptal öneriliyor.', DATE_SUB(NOW(), INTERVAL 4 MINUTE)
            FROM bus_lines WHERE start_district_id = 24 LIMIT 1;
        `);
        console.log('   Added 3 yellow warnings.');


        // 3. SHUFFLE TIMES for remaining Reds
        console.log('⏳ Shuffling timestamps for recent critical alerts...');
        const updateSql = `
            UPDATE system_recommendations 
            SET created_at = DATE_SUB(NOW(), INTERVAL FLOOR(1 + (RAND() * 10)) MINUTE)
            WHERE decision = 'Ek Sefer'
            ORDER BY created_at DESC 
            LIMIT 5;
        `;
        const [updRes] = await connection.query(updateSql);
        console.log(`   Updated timestamps for ${updRes.affectedRows} critical alerts.`);

        console.log('✅ MIXED COLORS PATCH APPLIED!');
        connection.release();
    } catch (err) {
        console.error('❌ PATCH FAILED:', err);
    } finally {
        await pool.end();
    }
}

patchMixedColors();
