const express = require('express');
const router = express.Router();
const mainController = require('../controllers/mainController');

// Define routes mapped to controller functions
// These paths must match what the frontend expects (previously /api/analysis/...)

// 1. Lines Analysis
router.get('/lines', mainController.getLineAnalysis);

// 2. Districts (Map)
router.get('/districts', mainController.getDistrictAnalysis);

// 3. Line Details
router.get('/lines/:id/details', mainController.getLineDetails);

// 4. Supply Demand
router.get('/supply-demand', mainController.getSupplyDemandAnalysis);

// 5. Radar Comparison
router.get('/radar', mainController.getRadarComparison);

// 6. Recent Events
router.get('/events/recent', mainController.getRecentEvents);

// 7. Strategic Report
router.get('/strategic-report', mainController.getStrategicData);

// 8. Financial Breakdown
router.get('/financial-breakdown', mainController.getFinancialBreakdown);

// 9. Satisfaction
router.get('/satisfaction', mainController.getSatisfactionStats);

// 10. Financial Trend
router.get('/financial-trend', mainController.getFinancialTrend);

module.exports = router;
