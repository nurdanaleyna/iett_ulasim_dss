const mysql = require('mysql2/promise');
require('dotenv').config();

async function seed() {
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

        console.log('Clearing existing data...');
        // Disable FK checks to clear tables cleanly
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        await connection.query('TRUNCATE TABLE trip_metrics');
        await connection.query('TRUNCATE TABLE trips');
        await connection.query('TRUNCATE TABLE system_recommendations');
        await connection.query('TRUNCATE TABLE bus_lines');
        await connection.query('TRUNCATE TABLE districts');
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('Seeding Districts...');
        const districtsData = [
            { name: 'Kadıköy', pop: 485000 }, // ID 1
            { name: 'Üsküdar', pop: 520000 }, // ID 2
            { name: 'Beşiktaş', pop: 180000 }, // ID 3
            { name: 'Beykoz', pop: 240000 },  // ID 4
            { name: 'Şile', pop: 38000 },     // ID 5
            { name: 'Ümraniye', pop: 720000 },// ID 6
            { name: 'Şişli', pop: 260000 },   // ID 7
            { name: 'Maltepe', pop: 500000 }, // ID 8
            { name: 'Kartal', pop: 470000 },  // ID 9
            { name: 'Fatih', pop: 380000 },   // ID 10
            { name: 'Pendik', pop: 710000 },  // ID 11
            { name: 'Sarıyer', pop: 340000 }  // ID 12
        ];

        // Dictionary to hold name -> id mapping
        const districtIds = {};

        for (const d of districtsData) {
            const [result] = await connection.execute(
                'INSERT INTO districts (name, population) VALUES (?, ?)',
                [d.name, d.pop]
            );
            districtIds[d.name] = result.insertId;
        }

        console.log('Seeding Bus Lines...');
        const linesData = [];

        // 1. Busy Lines (Kadıköy - Üsküdar axis, etc.)
        linesData.push({ code: '15F', start: 'Kadıköy', end: 'Üsküdar', type: 'Normal', busy: true });
        linesData.push({ code: '14R', start: 'Kadıköy', end: 'Üsküdar', type: 'Ring', busy: true });
        linesData.push({ code: '12A', start: 'Kadıköy', end: 'Üsküdar', type: 'Normal', busy: true });
        linesData.push({ code: 'Beşiktaş-1', start: 'Beşiktaş', end: 'Şişli', type: 'Normal', busy: true });
        linesData.push({ code: 'Metro-Exp', start: 'Kadıköy', end: 'Maltepe', type: 'Express', busy: true });

        // 2. Inefficient Lines (Şile, Beykoz remote routes)
        linesData.push({ code: '139A', start: 'Şile', end: 'Ümraniye', type: 'Normal', inefficient: true });
        linesData.push({ code: '139T', start: 'Şile', end: 'Üsküdar', type: 'Normal', inefficient: true });
        linesData.push({ code: '137', start: 'Beykoz', end: 'Şile', type: 'Normal', inefficient: true });
        linesData.push({ code: '138', start: 'Beykoz', end: 'Ümraniye', type: 'Normal', inefficient: true });

        // 3. Regular Lines to fill up to 15
        linesData.push({ code: '16D', start: 'Kadıköy', end: 'Pendik', type: 'Normal' });
        linesData.push({ code: '25S', start: 'Sarıyer', end: 'Şişli', type: 'Normal' });
        linesData.push({ code: '19F', start: 'Kadıköy', end: 'Fatih', type: 'Normal' });
        linesData.push({ code: '500T', start: 'Pendik', end: 'Şişli', type: 'Express' });
        linesData.push({ code: '17', start: 'Pendik', end: 'Kadıköy', type: 'Normal' });
        linesData.push({ code: '133T', start: 'Kartal', end: 'Maltepe', type: 'Ring' });

        const lineIds = []; // Array of { id, data }

        for (const l of linesData) {
            const startId = districtIds[l.start];
            const endId = districtIds[l.end];
            const [res] = await connection.execute(
                'INSERT INTO bus_lines (line_code, start_district_id, end_district_id, route_type) VALUES (?, ?, ?, ?)',
                [l.code, startId, endId, l.type]
            );
            lineIds.push({ id: res.insertId, ...l });
        }

        console.log('Seeding Trips & Metrics...');

        const today = new Date();
        const baseDate = today.toISOString().split('T')[0]; // YYYY-MM-DD

        for (const line of lineIds) {
            // Determine how many trips to generate for this line
            // Busy lines get more trips
            const tripsCount = line.busy ? 12 : (line.inefficient ? 4 : 8);

            for (let i = 0; i < tripsCount; i++) {
                // Trip Time Logic
                let hour;
                if (line.busy && i < 4) {
                    // Morning peak for some trips
                    hour = 7 + Math.floor(Math.random() * 2); // 7 or 8 
                } else if (line.inefficient) {
                    // Mid-day
                    hour = 11 + Math.floor(Math.random() * 4); // 11-14
                } else {
                    // Random spread 06:00 to 22:00
                    hour = 6 + Math.floor(Math.random() * 16);
                }
                const minute = Math.floor(Math.random() * 60);
                const departureTime = `${baseDate} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;

                const plateNumber = `34 TP ${1000 + Math.floor(Math.random() * 9000)}`;

                const [tripRes] = await connection.execute(
                    'INSERT INTO trips (line_id, bus_plate_number, departure_time) VALUES (?, ?, ?)',
                    [line.id, plateNumber, departureTime]
                );

                const tripId = tripRes.insertId;

                // Metrics Logic
                const capacity = 100;
                let passengers;
                let duration;
                let fuelCost;

                if (line.busy && (hour >= 7 && hour <= 9)) {
                    // Scenario A: Overcrowded
                    passengers = 95 + Math.floor(Math.random() * 10); // 95-104 (potentially over capacity)
                    if (passengers > capacity + 5) passengers = capacity + 5;
                    duration = 30 + Math.floor(Math.random() * 15); // Short trips, but maybe traffic
                    fuelCost = duration * 0.8; // Efficiency ok per pax, but stop-start traffic
                } else if (line.inefficient) {
                    // Scenario B: Loss-making
                    passengers = Math.floor(Math.random() * 8) + 2; // 2-10 passengers
                    duration = 90 + Math.floor(Math.random() * 40); // Long duration
                    fuelCost = duration * 1.5; // High fuel consumption
                } else {
                    // Normal
                    passengers = Math.floor(Math.random() * 80) + 10;
                    duration = 45 + Math.floor(Math.random() * 30);
                    fuelCost = duration * 1.0;
                }

                await connection.execute(
                    'INSERT INTO trip_metrics (trip_id, passenger_count, capacity, duration_minutes, fuel_cost) VALUES (?, ?, ?, ?, ?)',
                    [tripId, passengers, capacity, duration, fuelCost.toFixed(2)]
                );
            }
        }

        console.log('Seeding System Recommendations...');
        // Add a few dummy recommendations based on the seeds
        const inefficientLine = lineIds.find(l => l.inefficient);
        const busyLine = lineIds.find(l => l.busy);

        if (inefficientLine) {
            await connection.execute(
                'INSERT INTO system_recommendations (line_id, decision, reason) VALUES (?, ?, ?)',
                [inefficientLine.id, 'Sefer Azaltma', 'Hat karlılık oranı %20 altında. Yakıt maliyeti yolcu geliri karşılamıyor.']
            );
        }
        if (busyLine) {
            await connection.execute(
                'INSERT INTO system_recommendations (line_id, decision, reason) VALUES (?, ?, ?)',
                [busyLine.id, 'Ek Sefer', 'Sabah 07:00-09:00 arası doluluk oranı %95 üzerinde. Ek araç tahsi edilmeli.']
            );
        }

        console.log('Database seeded successfully via MAMP!');

    } catch (err) {
        console.error('Seeding failed:', err);
    } finally {
        if (connection) await connection.end();
    }
}

seed();
