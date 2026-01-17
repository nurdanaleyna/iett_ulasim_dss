const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

const dataDir = path.join(__dirname, 'istanbul_districts_data');

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const ROUTE_TYPES = ['Normal', 'Express', 'Ring'];

async function enrichAndSeed() {
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

        // 1. Get existing districts map
        const [rows] = await connection.execute('SELECT id, name FROM districts');
        const districtMap = {}; // name -> id
        rows.forEach(r => districtMap[r.name] = r.id);

        const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
        console.log(`Found ${files.length} district files.`);

        for (const file of files) {
            const filePath = path.join(dataDir, file);
            let districtData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const dName = districtData.district_name;

            console.log(`Processing ${dName}...`);

            // 2. Ensure District in DB
            let districtId = districtMap[dName];
            if (!districtId) {
                // Insert without 'region'
                const [res] = await connection.execute(
                    'INSERT INTO districts (name, population) VALUES (?, ?)',
                    [dName, districtData.population]
                );
                districtId = res.insertId;
                districtMap[dName] = districtId;
                console.log(`  -> Inserted district ${dName} (ID: ${districtId})`);
            } else {
                await connection.execute('UPDATE districts SET population = ? WHERE id = ?', [districtData.population, districtId]);
            }

            // 3. Generate Synthetic Lines (If not already present in JSON, OR if we want to overwrite/augment)
            // To fix "Busy places are yellow" issue: Big districts need MORE lines.
            // Let's check existing lines count. If low, add more.
            const currentLineCount = districtData.lines ? districtData.lines.length : 0;
            const targetLineCount = Math.max(3, Math.floor(districtData.population / 40000));

            if (currentLineCount < targetLineCount) {
                if (!districtData.lines) districtData.lines = [];
                const linesNeeded = targetLineCount - currentLineCount;
                console.log(`  -> Generating ${linesNeeded} more lines for ${dName} (Total Target: ${targetLineCount})`);

                for (let i = 0; i < linesNeeded; i++) {
                    const targetDistricts = Object.keys(districtMap);
                    // Filter out itself
                    const others = targetDistricts.filter(t => t !== dName);
                    const randomTarget = others[getRandomInt(0, others.length - 1)] || others[0];
                    if (!randomTarget) continue;

                    // Code e.g. "15K"
                    const code = `${getRandomInt(10, 99)}${dName.charAt(0).toUpperCase()}`;

                    districtData.lines.push({
                        line_code: code,
                        route_type: ROUTE_TYPES[getRandomInt(0, ROUTE_TYPES.length - 1)],
                        destination: randomTarget
                    });
                }
            }

            // 4. Insert Lines & Trips into DB
            for (const line of districtData.lines) {
                // Check if line exists
                const [lineRows] = await connection.execute('SELECT id FROM bus_lines WHERE line_code = ?', [line.line_code]);
                let lineId;
                const destId = districtMap[line.destination] || districtId; // Fallback

                if (lineRows.length === 0) {
                    const [lRes] = await connection.execute(
                        'INSERT INTO bus_lines (line_code, start_district_id, end_district_id, route_type) VALUES (?, ?, ?, ?)',
                        [line.line_code, districtId, destId, line.route_type]
                    );
                    lineId = lRes.insertId;
                } else {
                    lineId = lineRows[0].id;
                }

                // Generate Trip Data
                const scenario = getRandomInt(0, 10);
                let passengers, capacity = 100, duration = getRandomInt(30, 90);

                if (scenario <= 1) passengers = getRandomInt(95, 120); // Overload
                else if (scenario === 2) passengers = getRandomInt(5, 20); // Inefficient
                else passengers = getRandomInt(40, 85); // Stable

                // Financials (Simplified)
                const fuelCost = duration * 0.8 * 15; // liters * price approx

                // Insert Trip (Schema: bus_plate_number, departure_time)
                const [tRes] = await connection.execute(
                    'INSERT INTO trips (line_id, bus_plate_number, departure_time) VALUES (?, ?, NOW())',
                    [lineId, `34TN${getRandomInt(1000, 9999)}`]
                );
                const tripId = tRes.insertId;

                // Insert Metrics (Schema: passenger_count, capacity, duration_minutes, fuel_cost)
                await connection.execute(
                    'INSERT INTO trip_metrics (trip_id, passenger_count, capacity, duration_minutes, fuel_cost) VALUES (?, ?, ?, ?, ?)',
                    [tripId, passengers, capacity, duration, fuelCost]
                );

                // Insert Recommendation (Schema: decision, reason)
                let dec = 'STABLE';
                let reason = 'Hattın performansı normal seviyelerde.';

                if (passengers > capacity) {
                    dec = 'CRITICAL_OVERLOAD';
                    reason = 'Kapasite aşımı tespit edildi. Ek sefer önerilir.';
                } else if (passengers < 25) {
                    dec = 'INEFFICIENT_ROUTE';
                    reason = 'Yolcu sayısı düşük. Sefer iptali veya optimizasyon gerekebilir.';
                }

                // Limit recommendations per line to avoid clutter? Or just insert new ones.
                // We'll insert a fresh one for "today".
                await connection.execute(
                    'INSERT INTO system_recommendations (line_id, decision, reason) VALUES (?, ?, ?)',
                    [lineId, dec, reason]
                );
            }

            // Update JSON file
            fs.writeFileSync(filePath, JSON.stringify(districtData, null, 2));
        }

        console.log('Enrichment and Seeding Completed Successfully! 🚀');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        if (connection) await connection.end();
    }
}

enrichAndSeed();
