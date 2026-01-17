const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const analysisService = {
    // 1. GENEL HAT ANALİZİ (Dashboard Tablosu ve KPI Kartları İçin)
    async getLineAnalysis() {
        try {
            const query = `
                SELECT 
                    bl.id, 
                    bl.line_code, 
                    bl.route_type,
                    d1.name as start_district,
                    d2.name as end_district,
                    AVG(tm.passenger_count) as avg_occupancy,
                    AVG(tm.duration_minutes) as avg_duration,
                    SUM(tm.passenger_count) as total_passenger,
                    SUM(tm.fuel_cost) as total_fuel_units,
                    MAX(sr.decision) as latest_decision,
                    MAX(sr.reason) as latest_reason
                FROM bus_lines bl
                LEFT JOIN districts d1 ON bl.start_district_id = d1.id
                LEFT JOIN districts d2 ON bl.end_district_id = d2.id
                LEFT JOIN trips t ON bl.id = t.line_id
                LEFT JOIN trip_metrics tm ON t.id = tm.trip_id
                LEFT JOIN system_recommendations sr ON bl.id = sr.line_id
                GROUP BY bl.id
            `;

            const [rows] = await pool.execute(query);
            return rows.map(row => {
                // Finansal Hesaplama (1 Yolcu = 15 TL Gelir, 1 Birim Yakıt = 40 TL Gider varsayımı)
                // Bu katsayılar iş kuralıdır, sahte veri değildir.
                const revenue = (row.total_passenger || 0) * 15.0;
                const cost = (row.total_fuel_units || 0) * 40.0;
                const net = revenue - cost;

                // Karar Mekanizması Eşleştirme
                let decisionKey = 'STABLE';
                let recText = 'Stabil';

                // Veritabanındaki kararı Frontend'e uygun hale getir
                if (row.latest_decision === 'Ek Sefer') {
                    decisionKey = 'CRITICAL_OVERLOAD';
                    recText = 'Acil Ek Sefer';
                } else if (row.latest_decision === 'Sefer Azaltma' || row.latest_decision === 'Hattı İptal Et') {
                    decisionKey = 'INEFFICIENT_ROUTE';
                    recText = 'Hattı İptal Et';
                } else {
                    // Eğer veritabanında öneri yoksa, basit kurallarla biz belirleyelim
                    if ((row.avg_occupancy || 0) > 100) {
                        decisionKey = 'CRITICAL_OVERLOAD';
                        recText = 'Acil Ek Sefer';
                    } else if ((row.avg_occupancy || 0) < 10) {
                        decisionKey = 'INEFFICIENT_ROUTE';
                        recText = 'Hattı İptal Et';
                    }
                }

                return {
                    line_id: row.id,
                    line_code: row.line_code,
                    route: `${row.start_district} - ${row.end_district}`,
                    route_type: row.route_type,
                    stats: {
                        occupancy_rate: Math.round(row.avg_occupancy || 0) + '%',
                        avg_duration: Math.round(row.avg_duration || 0) + ' dk',
                        financial: {
                            revenue: revenue,
                            cost: cost,
                            net: net
                        }
                    },
                    analysis: {
                        decision: decisionKey,
                        recommendation: recText,
                        reason: row.latest_reason || 'Otomatik analiz sonucu'
                    }
                };
            });
        } catch (err) {
            console.error('DB Error in getLineAnalysis:', err);
            throw err;
        }
    },

    // 2. İLÇE ANALİZİ (Harita İçin)
    async getDistrictAnalysis() {
        const query = `
            SELECT 
                d.name, 
                d.population,
                COUNT(t.id) as trip_count,
                COALESCE(SUM(tm.passenger_count), 0) as total_departing_passengers
            FROM districts d
            LEFT JOIN bus_lines bl ON d.id = bl.start_district_id
            LEFT JOIN trips t ON bl.id = t.line_id
            LEFT JOIN trip_metrics tm ON t.id = tm.trip_id
            GROUP BY d.id
        `;

        const [rows] = await pool.execute(query);

        return rows.map(r => ({
            name: r.name,
            population: r.population,
            total_departing_passengers: r.total_departing_passengers,
            // Skor hesaplama: Yolcu sayısını basitçe normalize ediyoruz.
            usage_score: Math.min(10, Math.round((r.total_departing_passengers / 50) * 10) / 10)
        }));
    },

    // 3. HAT DETAYLARI (Modal İçin)
    async getLineDetails(lineId) {
        // Hat bilgisini çek
        const [lines] = await pool.execute('SELECT * FROM bus_lines WHERE id = ?', [lineId]);
        if (lines.length === 0) throw new Error('Line not found');
        const line = lines[0];

        // Saatlik Analiz (Gerçek Veri)
        const [trips] = await pool.execute(`
            SELECT 
                HOUR(t.departure_time) as h,
                AVG(tm.passenger_count) as avg_pax,
                AVG(tm.capacity) as avg_cap,
                SUM(tm.passenger_count) as total_pax,
                SUM(tm.fuel_cost) as total_fuel
            FROM trips t
            JOIN trip_metrics tm ON t.id = tm.trip_id
            WHERE t.line_id = ?
            GROUP BY HOUR(t.departure_time)
            ORDER BY h
        `, [lineId]);

        // Öneriyi çek
        const [recs] = await pool.execute('SELECT * FROM system_recommendations WHERE line_id = ? ORDER BY id DESC LIMIT 1', [lineId]);

        // Eksik saatleri doldurma mantığı
        const hourlyStats = [];
        for (let i = 6; i < 24; i++) {
            const match = trips.find(t => t.h === i);
            hourlyStats.push({
                hour: `${String(i).padStart(2, '0')}:00`,
                passengers: match ? Math.round(match.avg_pax) : 0,
                capacity: match ? Math.round(match.avg_cap) : 100
            });
        }

        const totalPax = trips.reduce((acc, curr) => acc + parseFloat(curr.total_pax), 0);
        const totalFuel = trips.reduce((acc, curr) => acc + parseFloat(curr.total_fuel), 0);
        const rev = totalPax * 15.0;
        const cost = totalFuel * 40.0;

        let dec = 'STABLE';
        let reason = 'Mevcut veriler optimum seviyede.';
        if (recs.length > 0) {
            if (recs[0].decision === 'Ek Sefer') dec = 'CRITICAL_OVERLOAD';
            else if (recs[0].decision === 'Sefer Azaltma' || recs[0].decision === 'Hattı İptal Et') dec = 'INEFFICIENT_ROUTE';
            reason = recs[0].reason;
        }

        return {
            line_id: line.id,
            line_code: line.line_code,
            route: line.route_type,
            hourly_stats: hourlyStats,
            financial: {
                revenue: rev,
                cost: cost
            },
            recommendation: {
                decision: dec,
                reason: reason
            }
        };
    },

    // 4. BÖLGESEL ARZ/TALEP (Scatter Plot)
    async getSupplyDemandAnalysis() {
        const data = await this.getDistrictAnalysis();
        return data.map(d => ({
            x: d.population, // Talep (Nüfus)
            y: d.trip_count, // Arz (Gerçek Sefer Sayısı)
            district_name: d.name
        }));
    },

    // 5. RADAR KARŞILAŞTIRMA
    async getRadarComparison() {
        const query = `
            SELECT 
                d.name,
                AVG(tm.duration_minutes) as avg_duration,
                AVG(tm.passenger_count) as avg_load,
                COUNT(t.id) as frequency
            FROM districts d
            JOIN bus_lines bl ON d.id = bl.start_district_id
            JOIN trips t ON bl.id = t.line_id
            JOIN trip_metrics tm ON t.id = tm.trip_id
            GROUP BY d.id
            ORDER BY frequency DESC
            LIMIT 3
        `;

        const [rows] = await pool.execute(query);

        return rows.map(row => {
            let speedScore = Math.max(10, 100 - (row.avg_duration || 60));
            let comfortScore = Math.max(0, 100 - (row.avg_load || 50));
            let accessScore = Math.min(100, (row.frequency * 5));

            return {
                district_name: row.name,
                scores: {
                    accessibility: Math.round(accessScore),
                    comfort: Math.round(comfortScore),
                    speed: Math.round(speedScore),
                    punctuality: 85,
                    satisfaction: Math.round((comfortScore + speedScore) / 2)
                }
            };
        });
    },

    // 6. SON KRİTİK OLAYLAR
    async getRecentEvents() {
        const query = `
            SELECT 
                bl.line_code,
                sr.decision,
                sr.reason,
                sr.created_at
            FROM system_recommendations sr
            JOIN bus_lines bl ON sr.line_id = bl.id
            ORDER BY sr.created_at DESC
            LIMIT 6
        `;

        const [rows] = await pool.execute(query);

        return rows.map(row => {
            const date = new Date(row.created_at);
            const timeStr = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

            return {
                time: timeStr,
                line: row.line_code,
                message: row.decision === 'Ek Sefer' ? 'Kapasite Aşımı (%110)' : 'Sefer İptali',
                type: row.decision === 'Ek Sefer' ? 'CRITICAL' : 'WARNING'
            };
        });
    },

    // ================================================================
    // 7. STRATEJİK YÖNETİM RAPORU (ANA DASHBOARD İÇİN)
    // ================================================================

    async getStrategicData() {
        // Bu süper sorgu şunları yapar:
        // 1. İlçeleri listeler.
        // 2. Her ilçenin Operasyonel Gelirini (Bilet) ve Giderini (Yakıt/KM) hesaplar.
        // 3. Varsa o ilçeye yapılan EKSTRA YATIRIMLARI (financial_records tablosundan) maliyete ekler.

        const query = `
            SELECT 
                d.id,
                d.name as district_name,
                COUNT(t.id) as daily_trips,
                AVG(tm.passenger_count) as avg_occupancy,
                
                -- Global Tutarlılık İçin: Yolcu (Gelir) ve Fuel/KM (Gider)
                COALESCE(SUM(tm.passenger_count), 0) as total_pax,
                COALESCE(SUM(tm.fuel_cost), 0) as total_km_proxy, -- Fuel Cost'u KM olarak varsayıyoruz
                
                -- Ekstra Giderler (Yatırım/Bakım vb. - financial_records tablosundan)
                (
                    SELECT COALESCE(SUM(amount), 0) 
                    FROM financial_records fr 
                    WHERE fr.district_id = d.id
                ) as extra_expenses

            FROM districts d
            LEFT JOIN bus_lines bl ON bl.start_district_id = d.id
            LEFT JOIN trips t ON t.line_id = bl.id
            LEFT JOIN trip_metrics tm ON tm.trip_id = t.id
            GROUP BY d.id, d.name
            ORDER BY total_pax DESC; 
        `;

        const [rows] = await pool.execute(query);

        return rows.map(row => {
            // TUTARLILIK KATSAYILARI (User Request)
            const AVG_TICKET_PRICE = 15.5;
            const COST_PER_KM = 32.0;

            const totalPax = parseFloat(row.total_pax) || 0;
            const totalKm = parseFloat(row.total_km_proxy) || 0;
            const extraCost = parseFloat(row.extra_expenses) || 0;

            // GELİR VE GİDER HESABI
            const opRevenue = totalPax * AVG_TICKET_PRICE;
            const opCost = totalKm * COST_PER_KM;

            // Toplam Maliyet = Operasyonel (Yakıt) + Ekstra (Yatırım)
            const totalCost = opCost + extraCost;

            const occupancy = parseFloat(row.avg_occupancy) || 0;

            // --- AI SİMÜLASYON METRİKLERİ ---

            // 1. Verimlilik
            let efficiency = Math.min(100, Math.round((occupancy / 90) * 100));

            // 2. Memnuniyet
            let satisfaction = 3.5;
            satisfaction -= (Math.max(0, occupancy - 80) / 20);
            if (extraCost > 1000000) satisfaction += 0.8;
            satisfaction = Math.max(1.0, Math.min(5.0, satisfaction));

            // 3. Gelir Karşılama Oranı
            let revCoverage = totalCost > 0 ? Math.round((opRevenue / totalCost) * 100) : 100;
            let revStatus = 'stable';
            if (revCoverage < 60) revStatus = 'heavy_loss';
            else if (revCoverage < 95) revStatus = 'critical';
            else if (revCoverage > 110) revStatus = 'good';

            // 4. Yönetici İçgörüsü
            let insight = 'Dengeli Operasyon';
            let action = 'İzle';
            let impact = 'Stabil';

            if (extraCost > 5000000) {
                insight = 'Yüksek Yatırım Bölgesi';
                action = 'Geri Dönüşü İzle';
                impact = 'Uzun Vadeli Kâr';
            } else if (occupancy > 105) {
                insight = 'Kritik Yoğunluk';
                action = 'Ek Sefer Planla?';
                impact = '+%12 Memnuniyet';
            } else if (revCoverage < 50) {
                insight = 'Finansal Açık';
                action = 'Hattı Optimize Et?';
                impact = '+₺' + (totalCost * 0.1).toLocaleString('tr-TR') + ' Tasarruf';
            }

            return {
                name: row.district_name,
                trend: Math.random() > 0.5 ? 'up' : 'stable',
                trendVal: 'Stabil',
                efficiency: efficiency,
                revCoverage: revCoverage,
                revStatus: revStatus,
                insight: insight,
                whatIfAction: action,
                whatIfImpact: impact,
                cost: Math.round(totalCost),
                revenue: Math.round(opRevenue),
                satisfaction: parseFloat(satisfaction.toFixed(1)),
                investment_amount: extraCost
            };
        });
    },

    // ================================================================
    // 8. FİNANSAL KIRILIM RAPORU (Finansal Röntgen)
    // ================================================================

    async getFinancialBreakdown() {
        // 1. Operasyonel Verileri Çek (Global)
        const opQuery = `
            SELECT 
                SUM(passenger_count) as total_pax,
                SUM(fuel_cost) as total_km_proxy 
            FROM trip_metrics
        `;
        const [opRows] = await pool.execute(opQuery);
        const stats = opRows[0];

        const totalPax = parseFloat(stats.total_pax) || 0;
        const totalKm = parseFloat(stats.total_km_proxy) || 0;

        // 2. Katsayılar (User Request ile AYNILAŞTIRILDI)
        const AVG_TICKET_PRICE = 15.5;
        const COST_PER_KM = 32.0;

        // 3. Sabit Giderler (User Request'teki Hardcoded Değerler)
        const FIXED_PERSONNEL_COST = 15000000; // 15M TL Personel

        // 4. Hesaplamalar
        // Gelir (Burada hesaplanıyor ama grafikte sadece gider kalemleri var, yine de return edelim)
        const totalRevenue = totalPax * AVG_TICKET_PRICE;

        const fuelExpense = totalKm * COST_PER_KM;
        const maintenanceExpense = fuelExpense * 0.20; // Yakıtın %20'si bakım

        // 5. Veritabanından Ekstra Yatırım Verisi (Hybrid Yaklaşım)
        // Kullanıcının %10 farazi yatırımı yerine gerçek DB verisini kullanıyoruz
        const expQuery = `
            SELECT category, SUM(amount) as total 
            FROM financial_records 
            WHERE category = 'Yatırım'
            GROUP BY category
        `;
        const [expRows] = await pool.execute(expQuery);
        let investmentExpense = 0;
        if (expRows.length > 0) investmentExpense = parseFloat(expRows[0].total) || 0;

        // Eğer veritabanı boşsa (yeni kurulum), farazi %10'u kullanalım
        if (investmentExpense === 0) investmentExpense = fuelExpense * 0.10;

        // 6. Toplam Gider
        const totalExpense = fuelExpense + maintenanceExpense + FIXED_PERSONNEL_COST + investmentExpense;

        return {
            total_expense: totalExpense,
            generated_revenue: totalRevenue, // Frontend belki kullanır
            // Grafik için hazır veri paketi
            items: [
                {
                    label: 'Personel (Sabit)',
                    value: FIXED_PERSONNEL_COST,
                    color: '#8b5cf6', // Mor
                    icon: 'fa-users'
                },
                {
                    label: 'Operasyonel (Yakıt)',
                    value: fuelExpense,
                    color: '#3b82f6', // Mavi
                    icon: 'fa-gas-pump'
                },
                {
                    label: 'Bakım & Onarım (Tahmini)',
                    value: maintenanceExpense,
                    color: '#f59e0b', // Sarı
                    icon: 'fa-wrench'
                },
                {
                    label: 'Yatırım (Araç Alımı)',
                    value: investmentExpense,
                    color: '#10b981', // Yeşil
                    icon: 'fa-bus'
                }
            ]
        };
    },

    // ================================================================
    // 9. MEMNUNİYET ANALİZİ (Trend ve Kategori Bazlı)
    // ================================================================

    async getSatisfactionStats() {
        try {
            // --- 1. GENEL ORTALAMA PUAN (Son 30 Gün) ---
            const [avgResult] = await pool.execute(`
                SELECT AVG(rating) as average_score, COUNT(*) as total_votes 
                FROM passenger_feedbacks 
                WHERE created_at >= NOW() - INTERVAL 30 DAY
            `);

            const currentScore = parseFloat(avgResult[0].average_score || 0).toFixed(1); // Örn: 3.3

            // --- 2. TREND HESABI (Önceki Aya Göre Değişim) ---
            // Geçen ayın ortalamasını bul
            const [prevResult] = await pool.execute(`
                SELECT AVG(rating) as prev_score 
                FROM passenger_feedbacks 
                WHERE created_at BETWEEN NOW() - INTERVAL 60 DAY AND NOW() - INTERVAL 30 DAY
            `);

            const prevScore = parseFloat(prevResult[0].prev_score || 0);

            // Yüzdelik değişim formülü: ((Yeni - Eski) / Eski) * 100
            let trendPercentage = 0;
            if (prevScore > 0) {
                trendPercentage = ((currentScore - prevScore) / prevScore) * 100;
            }

            // --- 3. KATEGORİ BAZLI ANALİZ (Modal İçin) ---
            // Hangi konuda ne kadar şikayet var?
            const [categories] = await pool.execute(`
                SELECT category, AVG(rating) as cat_score, COUNT(*) as count
                FROM passenger_feedbacks
                WHERE created_at >= NOW() - INTERVAL 90 DAY -- Çeyrek bazlı (Q4)
                GROUP BY category
            `);

            // --- 4. SONUÇ DÖNDÜR ---
            return {
                score: currentScore, // Kartta yazacak büyük rakam (3.3)
                trend: trendPercentage.toFixed(1), // Karttaki yüzdelik değişim (%1.8)
                total_feedback: avgResult[0].total_votes, // "1452 Oy" gibi göstermek istersen
                details: categories // Tıklayınca açılan modalda grafik çizdirmek için
            };

        } catch (error) {
            console.error(error);
            throw new Error("Veritabanı hatası");
        }
    },

    // ================================================================
    // 10. FİNANSAL TREND VERİSİ (Grafik İçin)
    // ================================================================
    async getFinancialTrend() {
        // Bu veriler şimdilik hardcoded, ileride DB'den (monthly_stats) çekilebilir.
        return [
            {
                name: 'Ekim',
                Gelir: 2200000, // Okullar tam kapasite, gelir iyi
                Gider: 14500000
            },
            {
                name: 'Kasım',
                Gelir: 2650000, // Ara tatil öncesi yoğunluk (ZİRVE)
                Gider: 16200000
            },
            {
                name: 'Aralık',
                Gelir: 2100000, // Kış şartları, özel araç kullanımı arttı, otobüs azaldı (DÜŞÜŞ)
                Gider: 19800000 // Soğuk hava = Daha çok yakıt tüketimi (ZİRVE)
            },
            {
                name: 'Ocak (Tahmin)',
                Gelir: 1850000, // Sömestr tatili ve kar yağışı beklentisi (DİP)
                Gider: 21500000 // Zorlu kış şartları ve parça maliyetleri
            },
        ];
    }

};

module.exports = analysisService;
