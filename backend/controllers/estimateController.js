const Estimate = require('../models/Estimate');
const CostItem = require('../models/CostItem');
const Project = require('../models/Project');
const CostCalculator = require('../utils/costCalculator');

// @desc    Create an estimate
// @route   POST /api/estimates
// @access  Private
exports.createEstimate = async (req, res, next) => {
    try {
        // Verify project exists
        const project = await Project.findById(req.body.project);
        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        req.body.createdBy = req.user.id;

        // Get latest version for this project
        const latestEstimate = await Estimate.findOne({ project: req.body.project })
            .sort('-version');
        req.body.version = latestEstimate ? latestEstimate.version + 1 : 1;

        const estimate = await Estimate.create(req.body);

        res.status(201).json({
            success: true,
            message: 'Estimate created successfully',
            data: estimate
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all estimates
// @route   GET /api/estimates
// @access  Private
exports.getEstimates = async (req, res, next) => {
    try {
        let query = {};

        // Filter by project
        if (req.query.project) {
            query.project = req.query.project;
        }

        // Filter by status
        if (req.query.status) {
            query.status = req.query.status;
        }

        // Non-admin: only own estimates
        if (req.user.role !== 'admin') {
            query.createdBy = req.user.id;
        }

        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;

        const estimates = await Estimate.find(query)
            .populate('project', 'name category status')
            .populate('createdBy', 'name email')
            .populate('approvedBy', 'name email')
            .sort('-createdAt')
            .skip(skip)
            .limit(limit);

        const total = await Estimate.countDocuments(query);

        res.status(200).json({
            success: true,
            data: estimates,
            pagination: {
                current: page,
                pages: Math.ceil(total / limit),
                total,
                limit
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single estimate with cost items
// @route   GET /api/estimates/:id
// @access  Private
exports.getEstimate = async (req, res, next) => {
    try {
        const estimate = await Estimate.findById(req.params.id)
            .populate('project', 'name category status client')
            .populate('createdBy', 'name email')
            .populate('approvedBy', 'name email')
            .populate('comments.user', 'name email');

        if (!estimate) {
            return res.status(404).json({
                success: false,
                message: 'Estimate not found'
            });
        }

        // Get cost items
        const costItems = await CostItem.find({ estimate: estimate._id });

        res.status(200).json({
            success: true,
            data: {
                estimate,
                costItems,
                summary: CostCalculator.generateSummary(costItems)
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update estimate
// @route   PUT /api/estimates/:id
// @access  Private
exports.updateEstimate = async (req, res, next) => {
    try {
        let estimate = await Estimate.findById(req.params.id);

        if (!estimate) {
            return res.status(404).json({
                success: false,
                message: 'Estimate not found'
            });
        }

        if (estimate.status === 'approved') {
            return res.status(400).json({
                success: false,
                message: 'Cannot edit an approved estimate'
            });
        }

        estimate = await Estimate.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({
            success: true,
            message: 'Estimate updated successfully',
            data: estimate
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete estimate
// @route   DELETE /api/estimates/:id
// @access  Private
exports.deleteEstimate = async (req, res, next) => {
    try {
        const estimate = await Estimate.findById(req.params.id);

        if (!estimate) {
            return res.status(404).json({
                success: false,
                message: 'Estimate not found'
            });
        }

        // Delete all related cost items
        await CostItem.deleteMany({ estimate: estimate._id });
        await estimate.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Estimate and related cost items deleted'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Add cost item to estimate
// @route   POST /api/estimates/:id/cost-items
// @access  Private
exports.addCostItem = async (req, res, next) => {
    try {
        const estimate = await Estimate.findById(req.params.id);

        if (!estimate) {
            return res.status(404).json({
                success: false,
                message: 'Estimate not found'
            });
        }

        req.body.estimate = estimate._id;

        const costItem = await CostItem.create(req.body);

        // Recalculate estimate totals
        await recalculateEstimate(estimate._id);

        res.status(201).json({
            success: true,
            message: 'Cost item added',
            data: costItem
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update cost item
// @route   PUT /api/estimates/:id/cost-items/:itemId
// @access  Private
exports.updateCostItem = async (req, res, next) => {
    try {
        let costItem = await CostItem.findById(req.params.itemId);

        if (!costItem) {
            return res.status(404).json({
                success: false,
                message: 'Cost item not found'
            });
        }

        costItem = await CostItem.findByIdAndUpdate(req.params.itemId, req.body, {
            new: true,
            runValidators: true
        });

        // Recalculate
        await recalculateEstimate(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Cost item updated',
            data: costItem
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete cost item
// @route   DELETE /api/estimates/:id/cost-items/:itemId
// @access  Private
exports.deleteCostItem = async (req, res, next) => {
    try {
        const costItem = await CostItem.findById(req.params.itemId);

        if (!costItem) {
            return res.status(404).json({
                success: false,
                message: 'Cost item not found'
            });
        }

        await costItem.deleteOne();

        // Recalculate
        await recalculateEstimate(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Cost item deleted'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Approve / Reject estimate
// @route   PUT /api/estimates/:id/review
// @access  Private (Manager/Admin)
exports.reviewEstimate = async (req, res, next) => {
    try {
        const { status, comment } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status must be approved or rejected'
            });
        }

        const estimate = await Estimate.findById(req.params.id);

        if (!estimate) {
            return res.status(404).json({
                success: false,
                message: 'Estimate not found'
            });
        }

        estimate.status = status;
        estimate.approvedBy = req.user.id;
        estimate.approvedDate = Date.now();

        if (comment) {
            estimate.comments.push({
                user: req.user.id,
                text: comment
            });
        }

        // If approved, update project budget
        if (status === 'approved') {
            await Project.findByIdAndUpdate(estimate.project, {
                'budget.approved': estimate.totals.grandTotal,
                status: 'approved'
            });
        }

        await estimate.save();

        res.status(200).json({
            success: true,
            message: `Estimate ${status}`,
            data: estimate
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Three-point estimation
// @route   POST /api/estimates/three-point
// @access  Private
exports.threePointEstimate = async (req, res, next) => {
    try {
        const { optimistic, mostLikely, pessimistic } = req.body;

        if (!optimistic || !mostLikely || !pessimistic) {
            return res.status(400).json({
                success: false,
                message: 'Provide optimistic, mostLikely, and pessimistic values'
            });
        }

        const result = CostCalculator.threePointEstimate(
            optimistic,
            mostLikely,
            pessimistic
        );

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Helper: Recalculate estimate totals
 */
async function recalculateEstimate(estimateId) {
    const costItems = await CostItem.find({ estimate: estimateId });
    const estimate = await Estimate.findById(estimateId);

    if (!estimate) return;

    // Calculate breakdown
    const breakdown = CostCalculator.calculateBreakdown(costItems);
    estimate.costBreakdown = breakdown;

    // Calculate subtotal
    const subtotal = CostCalculator.calculateSubtotal(costItems);

    // Calculate totals
    const totals = CostCalculator.calculateTotals(
        subtotal,
        estimate.contingencyRate,
        estimate.taxRate,
        estimate.discountRate
    );

    estimate.totals = totals;
    await estimate.save();

    // Update project estimated budget
    await Project.findByIdAndUpdate(estimate.project, {
        'budget.estimated': totals.grandTotal
    });
}