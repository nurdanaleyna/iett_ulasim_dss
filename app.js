require('dotenv').config();
const express = require('express');
const app = express();
const mainRouter = require('./routers/mainRouter');
const path = require('path');

const PORT = process.env.PORT || 3000;

// Setup View Engine (Keeping EJS for existing views just in case, though user focuses on public static now)
app.set('view engine', 'ejs');

// Middleware
app.use(express.json());
// "public klasörünü statik yap"
app.use(express.static(path.join(__dirname, 'public')));

// "Controller'daki fonksiyonları '/api/veriler' gibi bir adrese bağla"
// Start Note: The user asked for '/api/veriler' as an example, but to keep the frontend working 
// which expects '/api/analysis/lines' etc., I must stick to the existing base path.
// However, I can ALSO alias it if strictly needed, but I'll stick to what works for the frontend first.
// If I use '/api/analysis', everything breaks if frontend uses that.
// Frontend uses: fetch('/api/analysis/lines') in main.js
// So I MUST use '/api/analysis'.
app.use('/api/analysis', mainRouter);

// Database Connection Call (Implicitly happens when importing db/connect in model/controller, 
// but we can require it here to log connection start if we wanted, 
// though db/connect.js logs on load anyway).
require('./db/connect');

// UI Routes (Legacy support for the EJS views if still needed, 
// though user asked to move index.html to public which serves at root /)
// Since express.static is "public", accessing "/" will serve public/index.html.
// But we might want specific routes for the other pages if they are not SPAs.
// The dashboard IS public/index.html.
// /strategic-analysis and /line-analysis are currently rendered via EJS.
// The user "public/index.html ... buraya taşı" implies they want the static site.
// But 'strategic-analysis' uses EJS.
// I should keep the EJS routes for continuity unless explicitly told to delete them.
app.get('/strategic-analysis', (req, res) => {
    res.render('strategic-analysis');
});

app.get('/line-analysis', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Root Endpoint
// If index.html is in public, app.use(express.static) handles '/' if index.html is present.
// So we don't strictly need a '/' route.

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`http://localhost:${PORT}`);
});
