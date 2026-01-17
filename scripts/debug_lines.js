const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkData() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const [rows] = await connection.execute(`
            SELECT bl.line_code, bl.start_district_id, bl.end_district_id, 
                   ds.name as start_name, de.name as end_name
            FROM bus_lines bl
            LEFT JOIN districts ds ON bl.start_district_id = ds.id
            LEFT JOIN districts de ON bl.end_district_id = de.id
            LIMIT 5
        `);
        console.log('Sample Lines Data:', rows);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

checkData();
