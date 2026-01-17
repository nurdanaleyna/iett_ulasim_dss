require('dotenv').config();
const express = require('express');
const analysisRoutes = require('./routes/analysisRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup View Engine
app.set('view engine', 'ejs');

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Routes
app.use('/api/analysis', analysisRoutes);

// UI Routes
app.get('/strategic-analysis', (req, res) => {
    res.render('strategic-analysis');
});

app.get('/line-analysis', (req, res) => {
    res.render('dashboard');
});

app.get('/dashboard', (req, res) => {
    res.render('dashboard');
});

// Root Endpoint (fallback if index.html not found)
app.get('/api-status', (req, res) => {
    res.send('Istanbul Transport Analysis API is running...');
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`http://localhost:${PORT}/api/analysis/lines`);
    console.log(`http://localhost:${PORT}/api/analysis/districts`);
});
