const Project = require('../models/Project');
const Estimate = require('../models/Estimate');
const CostItem = require('../models/CostItem');
const CostCalculator = require('../utils/costCalculator');

// @desc    Get dashboard overview
// @route   GET /api/reports/dashboard
// @access  Private
exports.getDashboard = async (req, res, next) => {
    try {
        let matchQuery = {};
        if (req.user.role !== 'admin') {
            matchQuery.owner = req.user._id;
        }

        // Project stats
        const totalProjects = await Project.countDocuments(matchQuery);
        const activeProjects = await Project.countDocuments({ ...matchQuery, status: 'in-progress' });

        // Estimate stats
        let estimateMatch = {};
        if (req.user.role !== 'admin') {
            estimateMatch.createdBy = req.user._id;
        }
        const totalEstimates = await Estimate.countDocuments(estimateMatch);
        const pendingEstimates = await Estimate.countDocuments({ ...estimateMatch, status: 'pending' });

        // Budget stats
        const budgetStats = await Project.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: null,
                    totalEstimated: { $sum: '$budget.estimated' },
                    totalApproved: { $sum: '$budget.approved' },
                    totalSpent: { $sum: '$budget.spent' }
                }
            }
        ]);

        // Recent projects
        const recentProjects = await Project.find(matchQuery)
            .sort('-createdAt')
            .limit(5)
            .select('name status category budget createdAt');

        // Recent estimates
        const recentEstimates = await Estimate.find(estimateMatch)
            .sort('-createdAt')
            .limit(5)
            .populate('project', 'name')
            .select('title status totals createdAt');

        res.status(200).json({
            success: true,
            data: {
                stats: {
                    totalProjects,
                    activeProjects,
                    totalEstimates,
                    pendingEstimates
                },
                budget: budgetStats[0] || {
                    totalEstimated: 0,
                    totalApproved: 0,
                    totalSpent: 0
                },
                recentProjects,
                recentEstimates
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get cost analysis report for a project
// @route   GET /api/reports/project/:projectId/analysis
// @access  Private
exports.getProjectAnalysis = async (req, res, next) => {
    try {
        const project = await Project.findById(req.params.projectId);

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Get all estimates for this project
        const estimates = await Estimate.find({ project: req.params.projectId })
            .sort('-version');

        // Get all cost items from latest approved estimate
        const latestApproved = estimates.find(e => e.status === 'approved');
        const latestEstimate = latestApproved || estimates[0];

        let costItems = [];
        let breakdown = {};
        let summary = {};

        if (latestEstimate) {
            costItems = await CostItem.find({ estimate: latestEstimate._id });
            breakdown = CostCalculator.calculateBreakdown(costItems);
            summary = CostCalculator.generateSummary(costItems);
        }

        // Version comparison
        const versionHistory = estimates.map(est => ({
            version: est.version,
            status: est.status,
            grandTotal: est.totals.grandTotal,
            createdAt: est.createdAt
        }));

        // Budget variance
        const budgetVariance = {
            estimated: project.budget.estimated,
            approved: project.budget.approved,
            spent: project.budget.spent,
            remaining: project.budget.approved - project.budget.spent,
            variancePercent: project.budget.approved > 0
                ? ((project.budget.spent / project.budget.approved) * 100).toFixed(2)
                : 0
        };

        res.status(200).json({
            success: true,
            data: {
                project: {
                    name: project.name,
                    category: project.category,
                    status: project.status,
                    duration: project.durationDays
                },
                budgetVariance,
                costBreakdown: breakdown,
                costSummary: summary,
                costItems,
                versionHistory,
                totalEstimates: estimates.length
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get category-wise spending report
// @route   GET /api/reports/category-spending
// @access  Private
exports.getCategorySpending = async (req, res, next) => {
    try {
        let matchQuery = {};
        if (req.user.role !== 'admin') {
            matchQuery.owner = req.user._id;
        }

        const categorySpending = await Project.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    totalEstimated: { $sum: '$budget.estimated' },
                    totalApproved: { $sum: '$budget.approved' },
                    totalSpent: { $sum: '$budget.spent' },
                    avgBudget: { $avg: '$budget.estimated' }
                }
            },
            { $sort: { totalEstimated: -1 } }
        ]);

        res.status(200).json({
            success: true,
            data: categorySpending
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get monthly trend report
// @route   GET /api/reports/monthly-trend
// @access  Private
exports.getMonthlyTrend = async (req, res, next) => {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear();

        let matchQuery = {
            createdAt: {
                $gte: new Date(`${year}-01-01`),
                $lte: new Date(`${year}-12-31`)
            }
        };

        if (req.user.role !== 'admin') {
            matchQuery.owner = req.user._id;
        }

        const monthlyTrend = await Project.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: { $month: '$createdAt' },
                    projects: { $sum: 1 },
                    totalBudget: { $sum: '$budget.estimated' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Fill empty months
        const months = [];
        for (let i = 1; i <= 12; i++) {
            const found = monthlyTrend.find(m => m._id === i);
            months.push({
                month: i,
                monthName: new Date(year, i - 1).toLocaleString('default', { month: 'long' }),
                projects: found ? found.projects : 0,
                totalBudget: found ? found.totalBudget : 0
            });
        }

        res.status(200).json({
            success: true,
            data: {
                year,
                months
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    ROI Calculator
// @route   POST /api/reports/roi-calculator
// @access  Private
exports.calculateROI = async (req, res, next) => {
    try {
        const { totalInvestment, expectedReturn, timeframeMonths } = req.body;

        if (!totalInvestment || !expectedReturn || !timeframeMonths) {
            return res.status(400).json({
                success: false,
                message: 'Provide totalInvestment, expectedReturn, timeframeMonths'
            });
        }

        const result = CostCalculator.calculateROI(
            totalInvestment,
            expectedReturn,
            timeframeMonths
        );

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Compare multiple estimates
// @route   POST /api/reports/compare-estimates
// @access  Private
exports.compareEstimates = async (req, res, next) => {
    try {
        const { estimateIds } = req.body;

        if (!estimateIds || estimateIds.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Provide at least 2 estimate IDs to compare'
            });
        }

        const estimates = await Estimate.find({
            _id: { $in: estimateIds }
        })
            .populate('project', 'name')
            .populate('createdBy', 'name');

        const comparison = estimates.map(est => ({
            id: est._id,
            title: est.title,
            project: est.project.name,
            version: est.version,
            status: est.status,
            methodology: est.methodology,
            subtotal: est.totals.subtotal,
            contingency: est.totals.contingency,
            tax: est.totals.tax,
            discount: est.totals.discount,
            grandTotal: est.totals.grandTotal,
            costBreakdown: est.costBreakdown,
            createdBy: est.createdBy.name,
            createdAt: est.createdAt
        }));

        // Find differences
        const totals = comparison.map(c => c.grandTotal);
        const analysis = {
            highest: Math.max(...totals),
            lowest: Math.min(...totals),
            average: totals.reduce((a, b) => a + b, 0) / totals.length,
            difference: Math.max(...totals) - Math.min(...totals),
            variancePercent: (
                ((Math.max(...totals) - Math.min(...totals)) / Math.min(...totals)) * 100
            ).toFixed(2)
        };

        res.status(200).json({
            success: true,
            data: {
                estimates: comparison,
                analysis
            }
        });
    } catch (error) {
        next(error);
    }
};