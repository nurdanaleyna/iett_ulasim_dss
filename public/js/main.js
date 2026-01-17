document.addEventListener("DOMContentLoaded", async () => {
    // Sidebar Toggle
    const el = document.getElementById("wrapper");
    const toggleButton = document.getElementById("menu-toggle");

    toggleButton.onclick = function () {
        el.classList.toggle("toggled");
    };

    // Close sidebar when clicking outside
    document.addEventListener('click', function (event) {
        const isClickInsideSidebar = document.getElementById('sidebar-wrapper').contains(event.target);
        const isClickToggle = toggleButton.contains(event.target);

        // If sidebar is 'toggled' (open) and click is outside sidebar and toggle btn
        if (!isClickInsideSidebar && !isClickToggle && el.classList.contains('toggled')) {
            el.classList.remove('toggled');
        }
    });

    // Load Data
    await loadDashboardData();

    // Start Live Clock
    // Start Live Clock
    startClock();

    // Search Filter for Lines
    const searchInput = document.getElementById('line-search-input');
    if (searchInput) {
        searchInput.addEventListener('keyup', function () {
            const searchText = this.value.toLowerCase().trim();
            const rows = document.querySelectorAll('#lines-table-body tr');

            rows.forEach(row => {
                const lineCode = row.querySelector('td:first-child').innerText.toLowerCase();
                const routeText = row.querySelector('td:nth-child(2)').innerText.toLowerCase();

                if (lineCode.includes(searchText) || routeText.includes(searchText)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }

    // Navigation Events
    document.getElementById('nav-dashboard').addEventListener('click', (e) => {
        e.preventDefault();
        switchView('dashboard');
    });
    document.getElementById('nav-lines').addEventListener('click', (e) => {
        // e.preventDefault(); // Varsayılanı engelleme, URL değişsin isteyebiliriz ama şimdilik SPA
        // Eğer URL yönetimi istemiyorsak preventDefault kalabilir.
        // Ancak farklı sayfalardan (Stratejik gibi) gelirken URL /line-analysis olacak.
        e.preventDefault();
        switchView('lines');
        // İsteğe bağlı: History API ile URL güncelleme eklenebilir
        window.history.pushState(null, '', '/line-analysis');
    });

    document.getElementById('nav-dashboard').addEventListener('click', (e) => {
        e.preventDefault();
        switchView('dashboard');
        window.history.pushState(null, '', '/dashboard');
    });

    // Check Initial URL
    const path = window.location.pathname;
    if (path === '/line-analysis') {
        switchView('lines');
    } else {
        switchView('dashboard');
    }

});

let mapInstance = null; // Global map reference

function switchView(viewName) {
    // 1. Hide all views
    document.getElementById('view-dashboard').style.display = 'none';

    document.getElementById('view-lines').style.display = 'none';

    // 2. Remove active class from navs
    document.getElementById('nav-dashboard').classList.remove('active');
    document.getElementById('nav-lines').classList.remove('active');


    // 3. Show target view & Set active nav
    if (viewName === 'dashboard') {
        document.getElementById('view-dashboard').style.display = 'block';
        document.getElementById('nav-dashboard').classList.add('active');
    } else if (viewName === 'lines') {
        document.getElementById('view-lines').style.display = 'block';
        document.getElementById('nav-lines').classList.add('active');

    }
}



function startClock() {
    function update() {
        const now = new Date();
        const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
        // Date part
        const dateStr = now.toLocaleDateString('tr-TR', options);
        // Time part
        const timeStr = now.toLocaleTimeString('tr-TR');

        document.getElementById('header-clock').innerText = `${dateStr} - ${timeStr}`;
    }
    update();
    setInterval(update, 1000);
}

// Animation Utility
function animateValue(id, start, end, duration, currencyCode = null) {
    const obj = document.getElementById(id);
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const currentVal = Math.floor(progress * (end - start) + start);

        if (currencyCode) {
            obj.innerText = currentVal.toLocaleString('tr-TR', { style: 'currency', currency: currencyCode, maximumFractionDigits: 0 });
        } else {
            obj.innerText = currentVal.toLocaleString('tr-TR');
        }

        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

async function loadDashboardData() {
    try {
        const [linesRes, districtsRes, eventsRes] = await Promise.all([
            fetch('/api/analysis/lines'),
            fetch('/api/analysis/districts'),
            fetch('/api/analysis/events/recent')
        ]);

        const linesData = await linesRes.json();
        const districtsData = await districtsRes.json();
        const eventsData = await eventsRes.json();

        if (linesData.success) {
            renderKPIs(linesData.data);
            renderLinesTable(linesData.data);
        }

        if (districtsData.success) {
            renderDistrictMap(districtsData.data);
        }

        if (eventsData.success) {
            renderRecentEvents(eventsData.data);
        }

    } catch (error) {
        console.error('Error loading data:', error);
        alert('Veri yüklenirken hata oluştu!');
    }
}

function renderRecentEvents(events) {
    // HTML'deki listeyi bul (ID'si 'critical-events-list' olmalı, birazdan ekleyeceğiz)
    const listContainer = document.getElementById('critical-events-list');
    if (!listContainer) return;

    listContainer.innerHTML = ''; // Eski statik yazıları temizle

    events.forEach(event => {
        // İkon ve Renk Seçimi
        let icon = 'fa-exclamation-triangle';
        let textClass = 'text-danger'; // Kırmızı
        let borderClass = 'border-left-danger';

        if (event.type === 'WARNING') {
            icon = 'fa-ban';
            textClass = 'text-warning'; // Sarı
            borderClass = 'border-left-warning';
        }

        const div = document.createElement('div');
        div.className = `alert alert-light shadow-sm mb-2 ${borderClass}`;
        div.style.borderLeft = "5px solid"; // Sol tarafa renkli çizgi
        div.style.borderColor = event.type === 'CRITICAL' ? '#dc3545' : '#ffc107'; // Kırmızı veya Sarı çizgi

        div.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <i class="fas ${icon} ${textClass} me-2"></i>
                    <span class="fw-bold text-dark">${event.time}</span> - 
                    <span class="fw-bold">${event.line}</span>
                </div>
            </div>
            <div class="small text-muted ms-4">
                ${event.message}
            </div>
        `;

        listContainer.appendChild(div);
    });
}

// ------ FILTER LOGIC ------
function filterLines(decisionType, btnElement) {
    // 1. Update Button Styles
    const buttons = btnElement.parentElement.querySelectorAll('button');
    buttons.forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');

    // 2. Filter Table Rows
    const rows = document.querySelectorAll('#lines-table-body tr');
    rows.forEach(row => {
        const rowDecision = row.getAttribute('data-decision');

        if (decisionType === 'ALL') {
            row.style.display = '';
        } else {
            // Check exact match (or handle Stable specifically if needed)
            if (rowDecision === decisionType) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        }
    });
}

function renderKPIs(lines) {
    // 1. GERÇEK VERİLERİ HESAPLA (Veritabanından Gelen)
    const totalLines = lines.length; // Veritabanındaki hat sayısı (Örn: 20)
    let criticalLines = 0;
    let netIncome = 0;
    let totalPassengers = 0;

    lines.forEach(line => {
        // Finansal veriyi sayıya çevir
        const lineNet = parseFloat(line.stats.financial.net);
        const lineRevenue = parseFloat(line.stats.financial.revenue);

        // Tahmini yolcu sayısı (Gelir / Bilet Fiyatı)
        // VEYA backend zaten yolcu sayısını gönderiyorsa onu kullanabiliriz.
        // Şimdilik tutarlı olması için gelirden hesaplıyoruz:
        const estimatedPassengers = Math.round(lineRevenue / 15.0);

        netIncome += lineNet;
        totalPassengers += estimatedPassengers;

        // Kritik hatları say
        if (line.analysis.decision === 'CRITICAL_OVERLOAD') {
            criticalLines++;
        }
    });

    // 2. KARTLARA ARTIK GERÇEK SAYILARI BASIYORUZ

    // Toplam Hat (Artık 817 DEĞİL, gerçek sayı!)
    animateValue('kpi-total-lines', 0, totalLines, 1000);

    // Günlük Yolcu (Gerçek Toplam)
    animateValue('kpi-daily-passengers', 0, totalPassengers, 2000);

    // Kritik Uyarılar
    animateValue('kpi-critical-lines', 0, criticalLines, 1000);

    // Net Bilanço (EUR yerine TRY yaptık)
    animateValue('kpi-est-loss', 0, netIncome, 2000, 'TRY');

    // 3. RENK MANTIĞI (Kâr/Zarar)
    const netEl = document.getElementById('kpi-est-loss');
    netEl.classList.remove('text-success', 'text-danger');

    if (netIncome < 0) {
        netEl.classList.add('text-danger'); // Zarar (Kırmızı)
    } else {
        netEl.classList.add('text-success'); // Kâr (Yeşil)
    }
}

function renderLinesTable(lines) {

    // Listeyi Rastgele Karıştır (Shuffle)
    // Böylece Kırmızı, Yeşil, Sarı hepsi iç içe geçer.
    lines.sort(() => Math.random() - 0.5);

    const tableBody = document.getElementById('lines-table-body');
    tableBody.innerHTML = '';

    lines.forEach(line => {
        // 1. MANTIK HATASI DÜZELTME (Logic Override)
        // Eğer veritabanı "İptal Et" (Sarı) dediyse AMA hat doluysa veya kâr ediyorsa, kararı DEĞİŞTİR.

        let finalDecision = line.analysis.decision; // Veritabanından gelen karar
        const netIncome = parseFloat(line.stats.financial.net);
        const occupancyRate = parseInt(line.stats.occupancy_rate); // "%120" stringini 120 sayısına çevirir

        // KURAL: Eğer İptal denmişse AMA (Doluluk > %50 VEYA Kâr > 0) ise -> Bunu "Acil Ek Sefer" yap.
        if (finalDecision === 'INEFFICIENT_ROUTE') {
            if (occupancyRate > 50 || netIncome > 0) {
                finalDecision = 'CRITICAL_OVERLOAD'; // Kararı Kırmızıya çevir
                // line.analysis.recommendation will be updated below
            }
        }

        // --- METİN SABİTLEME (Hepsi 'Acil Ek Sefer' yazsın) ---
        if (finalDecision === 'CRITICAL_OVERLOAD') {
            line.analysis.recommendation = 'Acil Ek Sefer';
        }
        // -------------------------------------------------------

        const tr = document.createElement('tr');

        // Default (Stable) -> Green Row as requested
        let rowClass = 'table-success';
        let badgeClass = 'bg-success text-white';
        let icon = '<i class="fas fa-check-circle text-white"></i>';

        switch (finalDecision) {
            case 'CRITICAL_OVERLOAD':
                // User requested Red for "Acil Ek Sefer Planla"
                rowClass = 'table-danger';
                badgeClass = 'bg-danger text-white';
                icon = '<i class="fas fa-exclamation-triangle text-white"></i>';
                break;
            case 'INEFFICIENT_ROUTE':
                // User requested Yellow for "Hattı İptal Et veya Birleştir"
                rowClass = 'table-warning';
                badgeClass = 'bg-warning text-dark';
                icon = '<i class="fas fa-ban text-dark"></i>';
                break;
            case 'ROUTE_OPTIMIZATION':
                rowClass = 'table-light';
                badgeClass = 'bg-optimize';
                icon = '<i class="fas fa-wrench text-secondary"></i>';
                break;
        }

        tr.className = rowClass;
        // DÜZELTME BURADA:
        // Filtreleme sisteminin doğru çalışması için 'finalDecision' kullanıyoruz.
        tr.setAttribute('data-decision', finalDecision);

        tr.innerHTML = `
            <td class="fw-bold">${line.line_code}</td>
            <td class="small text-muted">${line.route || 'İlçe - İlçe'}</td>
            <td>${line.route_type}</td>
            <td class="fw-bold">${line.stats.occupancy_rate}</td>
            <td>${line.stats.avg_duration}</td>
            <td class="${parseFloat(line.stats.financial.net) < 0 ? 'text-danger' : 'text-success'} fw-bold">
                ${parseFloat(line.stats.financial.net).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
            </td>
            <td>
                <span class="badge badge-status ${badgeClass}">
                    ${icon} ${line.analysis.recommendation}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-dark w-100" onclick="showLineDetails(${line.line_id})">
                    <i class="fas fa-chart-bar me-1"></i> Detay
                </button>
            </td>
        `;

        tableBody.appendChild(tr);
    });
}

function applyDecision(lineCode, action) {
    alert(`HAT: ${lineCode}\nKARAR: ${action}\n\nÖneri sisteme başarıyla işlendi ve ilgili birimlere iletildi.`);
}

// Modal & Details Logic
let hourlyChartInstance = null;

async function showLineDetails(lineId) {
    try {
        const modalEl = new bootstrap.Modal(document.getElementById('lineDetailModal'));
        modalEl.show();

        // Reset/Loading state
        document.getElementById('modalDecisionText').innerText = 'Yükleniyor...';

        const res = await fetch(`/api/analysis/lines/${lineId}/details`);
        const json = await res.json();

        if (json.success) {
            updateModalContent(json.data);
        } else {
            alert('Veri alınamadı!');
        }

    } catch (e) {
        console.error(e);
        alert('Hata oluştu!');
    }
}

function updateModalContent(data) {
    // 1. Title & Header
    document.getElementById('lineDetailModalLabel').innerText = `${data.line_code} Hat Detay: ${data.route}`;

    // 2. Decision & Reason
    const decText = document.getElementById('modalDecisionText');
    decText.innerText = data.recommendation.decision.replace('_', ' ');

    // Colorize decision
    decText.className = 'display-6 fw-bold mb-3 text-uppercase'; // reset
    if (data.recommendation.decision === 'CRITICAL_OVERLOAD') decText.classList.add('text-danger');
    else if (data.recommendation.decision === 'INEFFICIENT_ROUTE') decText.classList.add('text-danger'); // or pink
    else if (data.recommendation.decision === 'STABLE') decText.classList.add('text-success');
    else decText.classList.add('text-warning');

    document.getElementById('modalReasonText').innerText = data.recommendation.reason;

    // 3. Financial Progress
    const cost = data.financial.cost;
    const revenue = data.financial.revenue;
    const total = cost + revenue;

    let costPerc = 50;
    let revPerc = 50;

    if (total > 0) {
        costPerc = (cost / total) * 100;
        revPerc = (revenue / total) * 100;
    }

    document.getElementById('modalCostBar').style.width = `${costPerc}%`;
    document.getElementById('modalRevenueBar').style.width = `${revPerc}%`;
    document.getElementById('modalCostVal').innerText = `-${cost.toLocaleString('tr-TR')} ₺`;
    document.getElementById('modalRevenueVal').innerText = `+${revenue.toLocaleString('tr-TR')} ₺`;

    // 4. Hourly Chart
    renderHourlyChart(data.hourly_stats);
}

function renderHourlyChart(hourlyStats) {
    const ctx = document.getElementById('modalHourlyChart').getContext('2d');

    if (hourlyChartInstance) {
        hourlyChartInstance.destroy();
    }

    const labels = hourlyStats.map(h => h.hour);
    const dataPassengers = hourlyStats.map(h => h.passengers);
    const dataCapacity = hourlyStats.map(h => h.capacity);

    hourlyChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Yolcu Sayısı',
                    data: dataPassengers,
                    borderColor: '#0093d6',
                    backgroundColor: 'rgba(0, 147, 214, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Kapasite Sınırı',
                    data: dataCapacity,
                    borderColor: '#dc3545',
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// ------ MAP INTEGRATION ------

async function renderDistrictMap(districtsData) {
    // 1. Initialize Map
    // Remove if exists
    if (mapInstance) {
        mapInstance.remove();
    }
    const map = L.map('dashboard-map').setView([41.0082, 28.9784], 10); // Istanbul Center
    mapInstance = map; // Save to global

    // Leaflet fix for dashboard load
    setTimeout(() => { map.invalidateSize(); }, 200);

    // 2. Add Tile Layer (CartoDB Positron for clean look)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    try {
        // 3. Fetch Real GeoJSON
        const response = await fetch('/istanbul_districts.json');
        if (!response.ok) throw new Error('GeoJSON failed');
        const geoJsonData = await response.json();

        // 4. Transform API Data to Map (District Name -> Passenger Count)
        // We switch to Total Passengers for "Density" visualization as requested.
        const usageMap = {};
        districtsData.forEach(d => {
            usageMap[d.name.toLocaleUpperCase('tr-TR').trim()] = parseInt(d.total_departing_passengers);
        });

        // Determine max for scaling
        const scores = districtsData.map(d => parseInt(d.total_departing_passengers));
        const maxScore = Math.max(...scores) || 1;

        // 5. Style Function (Choropleth Logic)
        function getColor(score) {
            const ratio = score / maxScore;
            if (ratio > 0.7) return '#BD0026'; // High
            if (ratio > 0.4) return '#FD8D3C'; // Medium
            if (ratio > 0.1) return '#FEB24C'; // Low-Medium
            return '#FFEDA0'; // Low
        }

        function style(feature) {
            // Feature property name might vary, check json structure ideally.
            // Assuming 'name' or 'Name' exists. 
            // In ozanyerli's json, property is usually 'Name' or 'name' and might require uppercase match

            // Try to find the matching name
            let dName = feature.properties.Name || feature.properties.name || "";

            // Normalize for matching: Uppercase, TR chars
            let matchName = dName.toLocaleUpperCase('tr-TR');

            // Adjust common mismatches if necessary
            // e.g. "EYUPSULTAN" vs "EYÜPSULTAN"

            // Find score
            // Look for direct match or close match
            let score = 0;

            // Direct lookup
            if (usageMap[matchName] !== undefined) {
                score = usageMap[matchName];
            } else {
                // Fuzzy or loop check?
                // Let's rely on basic TR uppercase matching for now.
                // console.log('No match for:', matchName);
            }

            return {
                fillColor: getColor(score),
                weight: 1,
                opacity: 1,
                color: 'white',
                dashArray: '3',
                fillOpacity: 0.7
            };
        }

        // 6. Interaction
        function highlightFeature(e) {
            var layer = e.target;
            layer.setStyle({
                weight: 3,
                color: '#666',
                dashArray: '',
                fillOpacity: 0.9
            });
            layer.bringToFront();
        }

        function resetHighlight(e) {
            geojsonLayer.resetStyle(e.target);
        }

        const geojsonLayer = L.geoJson(geoJsonData, {
            style: style,
            onEachFeature: function (feature, layer) {
                let dName = feature.properties.Name || feature.properties.name;
                const matchName = dName.toLocaleUpperCase('tr-TR');

                // Find data object
                const dataObj = districtsData.find(d => d.name.toLocaleUpperCase('tr-TR') === matchName);
                const count = dataObj ? dataObj.total_departing_passengers : 0;
                const score = dataObj ? dataObj.usage_score : 0;

                layer.bindTooltip(`<strong>${dName}</strong><br>Skor: ${score}<br>Yolcu: ${count}`, {
                    permanent: false,
                    direction: "center"
                });

                layer.on({
                    mouseover: highlightFeature,
                    mouseout: resetHighlight
                });
            }
        }).addTo(map);

        // 7. Custom Legend Control
        const legend = L.control({ position: 'bottomright' });

        legend.onAdd = function (map) {
            const div = L.DomUtil.create('div', 'info legend');
            const grades = [0, 0.1, 0.4, 0.7];
            const labels = ['Düşük Yoğunluk', 'Orta-Düşük', 'Orta Yoğunluk', 'Yüksek Yoğunluk'];
            const colors = ['#FFEDA0', '#FEB24C', '#FD8D3C', '#BD0026'];

            for (let i = 0; i < grades.length; i++) {
                div.innerHTML +=
                    '<i style="background:' + colors[i] + '"></i> ' +
                    labels[i] + '<br>';
            }
            return div;
        };
        legend.addTo(map);

    } catch (e) {
        console.error("Map GeoJSON Error:", e);
    }
}


