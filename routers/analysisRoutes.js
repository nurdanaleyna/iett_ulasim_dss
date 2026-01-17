const express = require('express');
const analysisService = require('../services/analysisService');
const router = express.Router();

// GET /api/analysis/lines
router.get('/lines', async (req, res) => {
    try {
        const data = await analysisService.getLineAnalysis();
        res.json({
            success: true,
            count: data.length,
            timestamp: new Date(),
            data: data
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/analysis/districts
router.get('/districts', async (req, res) => {
    try {
        const data = await analysisService.getDistrictAnalysis();
        res.json({
            success: true,
            count: data.length,
            timestamp: new Date(),
            data: data
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/analysis/line-details/:id
router.get('/line-details/:id', async (req, res) => {
    try {
        const data = await analysisService.getLineDetails(req.params.id);
        res.json({
            success: true,
            timestamp: new Date(),
            data: data
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/analysis/regional/supply-demand
router.get('/regional/supply-demand', async (req, res) => {
    try {
        const data = await analysisService.getSupplyDemandAnalysis();
        res.json({ success: true, data: data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/analysis/regional/radar-comparison
router.get('/regional/radar-comparison', async (req, res) => {
    try {
        const data = await analysisService.getRadarComparison();
        res.json({ success: true, data: data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/analysis/events
router.get('/events', async (req, res) => {
    try {
        const data = await analysisService.getRecentEvents();
        res.json({ success: true, data: data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 1. Stratejik Analiz Ana Verisi
router.get('/strategic', async (req, res) => {
    try {
        const data = await analysisService.getStrategicData();
        res.json({ success: true, data: data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2. Finansal Detay Verisi (Pasta Grafik)
router.get('/financial-breakdown', async (req, res) => {
    try {
        const data = await analysisService.getFinancialBreakdown();
        res.json({ success: true, data: data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 3. Memnuniyet Analizi (Geri Bildirim)
router.get('/satisfaction', async (req, res) => {
    try {
        const data = await analysisService.getSatisfactionStats();
        res.json(data); // Doğrudan objeyi dönüyoruz (Frontend yapısına uygun)
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. Finansal Trend (Grafik)
router.get('/financial-trend', async (req, res) => {
    try {
        const data = await analysisService.getFinancialTrend();
        res.json({ success: true, data: data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
