const fs = require('fs');
const path = require('path');

const districts = [
    { name: 'Adalar', population: 16372 },
    { name: 'Arnavutköy', population: 312023 },
    { name: 'Ataşehir', population: 422594 },
    { name: 'Avcılar', population: 457981 },
    { name: 'Bağcılar', population: 744351 },
    { name: 'Bahçelievler', population: 605300 },
    { name: 'Bakırköy', population: 226387 },
    { name: 'Başakşehir', population: 519964 },
    { name: 'Bayrampaşa', population: 274884 },
    { name: 'Beşiktaş', population: 178938 },
    { name: 'Beykoz', population: 248595 },
    { name: 'Beylikdüzü', population: 398840 },
    { name: 'Beyoğlu', population: 225940 },
    { name: 'Büyükçekmece', population: 269160 },
    { name: 'Çatalca', population: 76131 },
    { name: 'Çekmeköy', population: 283185 },
    { name: 'Esenler', population: 445421 },
    { name: 'Esenyurt', population: 978007 },
    { name: 'Eyüpsultan', population: 423879 },
    { name: 'Fatih', population: 378446 },
    { name: 'Gaziosmanpaşa', population: 493096 },
    { name: 'Güngören', population: 283083 },
    { name: 'Kadıköy', population: 485233 },
    { name: 'Kağıthane', population: 454550 },
    { name: 'Kartal', population: 480738 },
    { name: 'Küçükçekmece', population: 805930 },
    { name: 'Maltepe', population: 525566 },
    { name: 'Pendik', population: 741895 },
    { name: 'Sancaktepe', population: 474668 },
    { name: 'Sarıyer', population: 349968 },
    { name: 'Silivri', population: 209014 },
    { name: 'Sultanbeyli', population: 358201 },
    { name: 'Sultangazi', population: 543380 },
    { name: 'Şile', population: 41627 },
    { name: 'Şişli', population: 276528 },
    { name: 'Tuzla', population: 284443 },
    { name: 'Ümraniye', population: 726758 },
    { name: 'Üsküdar', population: 525395 },
    { name: 'Zeytinburnu', population: 293839 }
];

const targetDir = path.join(__dirname, 'istanbul_districts_data');

if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir);
}

districts.forEach(d => {
    const fileName = `${d.name.toLowerCase().replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')}.json`;
    const filePath = path.join(targetDir, fileName);

    const content = {
        district_name: d.name,
        population: d.population,
        region: 'Istanbul',
        data_source: 'TUIK 2023 Est.',
        // Extended placeholder structure
        metrics: {
            // More realistic estimate: Daily public transport trips ~ 25-40% of population depending on district centrality
            daily_trips: Math.floor(d.population * (0.25 + Math.random() * 0.15)),
            traffic_density_score: Math.floor(Math.random() * 100)
        }
    };

    fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
    console.log(`Created ${fileName}`);
});

console.log(`Successfully created ${districts.length} district JSON files in ${targetDir}`);
