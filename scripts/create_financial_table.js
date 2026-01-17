const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
};

async function createAndSeedFinancial() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('🔌 Veritabanına bağlanıldı.');

        // 1. Tabloyu Temizden Oluştur
        await connection.execute('DROP TABLE IF EXISTS financial_records');
        console.log('🗑️ Eski tablo silindi.');

        const createTableQuery = `
            CREATE TABLE financial_records (
                id INT AUTO_INCREMENT PRIMARY KEY,
                district_id INT,
                category VARCHAR(50), -- 'Yatırım', 'Bakım', 'Sübvansiyon', 'Personel'
                amount DECIMAL(15, 2),
                description VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE SET NULL
            );
        `;
        await connection.execute(createTableQuery);
        console.log('✅ financial_records tablosu oluşturuldu (veya zaten vardı).');

        // 2. Mevcut verileri temizle (Seed)
        await connection.execute('TRUNCATE TABLE financial_records');

        // 3. Bölge ID'lerini çek
        const [districts] = await connection.execute('SELECT id, name FROM districts');

        if (districts.length === 0) {
            console.log('⚠️ Hiç ilçe bulunamadı, tablo boş geçiliyor.');
            return;
        }

        // 4. Rastgele Finansal Veri Ekle
        const categories = ['Yatırım', 'Bakım', 'Sübvansiyon', 'Personel'];
        const records = [];

        // Her ilçe için 1-2 kayıt atalım
        for (const dist of districts) {
            // Şans faktörü: Her ilçeye yatırım yapılmaz
            if (Math.random() > 0.3) {
                const cat = categories[Math.floor(Math.random() * categories.length)];
                let amount = 0;

                if (cat === 'Yatırım') amount = Math.floor(Math.random() * 10000000) + 1000000; // 1M - 10M
                else if (cat === 'Bakım') amount = Math.floor(Math.random() * 500000) + 50000; // 50K - 500K
                else amount = Math.floor(Math.random() * 2000000) + 100000; // Diğerleri

                records.push(`(${dist.id}, '${cat}', ${amount}, '${dist.name} bölgesi için ${cat} harcaması')`);
            }
        }

        // Genel Merkez Harcamaları (District ID NULL olabilir veya rastgele birine atanabilir, biz NULL desteklemediysek 1'e atalım ya da rastgele)
        // Schema'da foreign key district_id nullable yapmışız, o yüzden district_id sini verelim.
        // Hepsini districtlere dağıtalım şimdilik.

        if (records.length > 0) {
            const insertQuery = `
                INSERT INTO financial_records (district_id, category, amount, description) 
                VALUES ${records.join(', ')}
            `;
            await connection.execute(insertQuery);
            console.log(`🚀 ${records.length} adet finansal kayıt eklendi.`);
        }

    } catch (error) {
        console.error('❌ Hata:', error);
    } finally {
        if (connection) await connection.end();
    }
}

createAndSeedFinancial();
