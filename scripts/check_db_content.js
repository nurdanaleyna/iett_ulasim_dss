const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkExistance() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const [lines] = await connection.execute('SELECT COUNT(*) as count FROM bus_lines');
        console.log('Bus Lines Count:', lines[0].count);

        const [trips] = await connection.execute('SELECT COUNT(*) as count FROM trips');
        console.log('Trips Count:', trips[0].count);

        const [districts] = await connection.execute('SELECT COUNT(*) as count FROM districts');
        console.log('Districts Count:', districts[0].count);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

checkExistance();
