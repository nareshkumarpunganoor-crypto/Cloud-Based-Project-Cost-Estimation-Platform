const express = require('express');
const router = express.Router();
const {
    getDashboard,
    getProjectAnalysis,
    getCategorySpending,
    getMonthlyTrend,
    calculateROI,
    compareEstimates
} = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/dashboard', getDashboard);
router.get('/project/:projectId/analysis', getProjectAnalysis);
router.get('/category-spending', getCategorySpending);
router.get('/monthly-trend', getMonthlyTrend);
router.post('/roi-calculator', calculateROI);
router.post('/compare-estimates', compareEstimates);

module.exports = router;