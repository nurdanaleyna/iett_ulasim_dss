const mysql = require('mysql2/promise');
require('dotenv').config(); // Keeping dotenv for safety, but will use user specified defaults if env missing

// Create connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306, // Added port
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
    database: process.env.DB_NAME || 'iett_ulasim',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test connection
pool.getConnection()
    .then(conn => {
        console.log("MySQL Veritabanına Başarıyla Bağlanıldı!");
        conn.release();
    })
    .catch(err => {
        console.error("Veritabanı Bağlantı Hatası:", err);
    });

module.exports = pool;
