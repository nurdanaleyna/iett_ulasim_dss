const mysql = require('mysql2/promise');
require('dotenv').config();

async function createFeedbackTable() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            multipleStatements: true
        });

        console.log('Creating table passenger_feedbacks...');
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS passenger_feedbacks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT, -- İsteğe bağlı, anonim de olabilir
                region VARCHAR(50), -- Örn: 'Kadıköy', 'Esenyurt'
                line_number VARCHAR(10), -- Örn: '500T', '34BZ'
                rating INT, -- 1 ile 5 arası puan
                category VARCHAR(50), -- 'Temizlik', 'Dakiklik', 'Personel', 'Konfor'
                comment TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await connection.query(createTableQuery);
        console.log('Table created or already exists.');

        console.log('Seeding dummy data...');
        const insertQuery = `
            INSERT INTO passenger_feedbacks (region, line_number, rating, category, comment, created_at) VALUES 
            ('Kadıköy', '19F', 5, 'Personel', 'Şoför çok kibardı.', NOW()),
            ('Esenyurt', '142B', 2, 'Dakiklik', 'Yarım saattir bekliyorum gelmedi.', NOW()),
            ('Şişli', 'DT1', 3, 'Temizlik', 'Koltuklar biraz kirliydi.', NOW() - INTERVAL 1 MONTH);
        `;
        await connection.query(insertQuery);
        console.log('Dummy data inserted.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

createFeedbackTable();
