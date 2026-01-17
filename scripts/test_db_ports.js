const mysql = require('mysql2/promise');

async function testConnection(port) {
    try {
        const connection = await mysql.createConnection({
            host: '127.0.0.1',
            port: port,
            user: 'root',
            password: 'root', // Try default MAMP/root password
            connectTimeout: 2000
        });
        console.log(`SUCCESS: Connected on port ${port}`);
        await connection.end();
        return true;
    } catch (error) {
        console.log(`FAILED: Could not connect on port ${port} - ${error.code}`);
        return false;
    }
}

async function main() {
    console.log('Testing Port 8889 (MAMP default)...');
    const mamp = await testConnection(8889);

    console.log('Testing Port 3306 (Standard MySQL)...');
    const standard = await testConnection(3306);
}

main();
