const mysql = require('mysql2/promise');
require('dotenv').config();

async function updatePopulation() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('Updating district populations...');

        // Map user request to likely DB names (Turkish)
        const updates = [
            { name: 'Kadıköy', pop: 480000 },
            { name: 'Beşiktaş', pop: 180000 },
            { name: 'Üsküdar', pop: 530000 },
            { name: 'Ümraniye', pop: 390000 },
            { name: 'Şile', pop: 40000 },
            // Random/Others
            { name: 'Beykoz', pop: 245000 },
            { name: 'Şişli', pop: 275000 },
            { name: 'Maltepe', pop: 515000 },
            { name: 'Kartal', pop: 485000 },
            { name: 'Fatih', pop: 395000 },
            { name: 'Pendik', pop: 725000 },
            { name: 'Sarıyer', pop: 345000 }
        ];

        for (const u of updates) {
            // Using LIKE to match partially if needed, but precise name is better. 
            // We use the names we seeded.
            const [res] = await connection.execute(
                'UPDATE districts SET population = ? WHERE name = ?',
                [u.pop, u.name]
            );
            console.log(`Updated ${u.name}: ${res.info}`);
        }

        // Just in case names were inserted as ASCII in a previous step (unlikely but user prompt implies it)
        await connection.execute("UPDATE districts SET population = 480000 WHERE name LIKE '%Kadikoy%'");
        await connection.execute("UPDATE districts SET population = 180000 WHERE name LIKE '%Besiktas%'");
        await connection.execute("UPDATE districts SET population = 530000 WHERE name LIKE '%Uskudar%'");
        await connection.execute("UPDATE districts SET population = 390000 WHERE name LIKE '%Umraniye%'");
        await connection.execute("UPDATE districts SET population = 40000 WHERE name LIKE '%Sile%'");

        console.log('Population update completed.');

    } catch (err) {
        console.error('Update failed:', err);
    } finally {
        if (connection) await connection.end();
    }
}

updatePopulation();
