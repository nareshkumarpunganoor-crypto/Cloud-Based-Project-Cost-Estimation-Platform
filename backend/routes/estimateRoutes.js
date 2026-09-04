const express = require('express');
const router = express.Router();
const {
    createEstimate,
    getEstimates,
    getEstimate,
    updateEstimate,
    deleteEstimate,
    addCostItem,
    updateCostItem,
    deleteCostItem,
    reviewEstimate,
    threePointEstimate
} = require('../controllers/estimateController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// Three-point estimation tool
router.post('/three-point', threePointEstimate);

router.route('/')
    .get(getEstimates)
    .post(createEstimate);

router.route('/:id')
    .get(getEstimate)
    .put(updateEstimate)
    .delete(deleteEstimate);

// Review (approve/reject)
router.put('/:id/review', authorize('manager', 'admin'), reviewEstimate);

// Cost Items
router.post('/:id/cost-items', addCostItem);
router.put('/:id/cost-items/:itemId', updateCostItem);
router.delete('/:id/cost-items/:itemId', deleteCostItem);

module.exports = router;