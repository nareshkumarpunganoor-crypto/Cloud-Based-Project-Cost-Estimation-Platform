const Project = require('../models/Project');

// @desc    Create a project
// @route   POST /api/projects
// @access  Private
exports.createProject = async (req, res, next) => {
    try {
        req.body.owner = req.user.id;

        const project = await Project.create(req.body);

        res.status(201).json({
            success: true,
            message: 'Project created successfully',
            data: project
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all projects (for current user)
// @route   GET /api/projects
// @access  Private
exports.getProjects = async (req, res, next) => {
    try {
        // Query building
        let query = {};

        // Filter by owner (unless admin)
        if (req.user.role !== 'admin') {
            query.owner = req.user.id;
        }

        // Filter by status
        if (req.query.status) {
            query.status = req.query.status;
        }

        // Filter by category
        if (req.query.category) {
            query.category = req.query.category;
        }

        // Filter by priority
        if (req.query.priority) {
            query.priority = req.query.priority;
        }

        // Search by name
        if (req.query.search) {
            query.$text = { $search: req.query.search };
        }

        // Pagination
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;

        // Sort
        const sortBy = req.query.sort || '-createdAt';

        const projects = await Project.find(query)
            .populate('owner', 'name email')
            .populate('team.member', 'name email')
            .sort(sortBy)
            .skip(skip)
            .limit(limit);

        const total = await Project.countDocuments(query);

        res.status(200).json({
            success: true,
            data: projects,
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

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
exports.getProject = async (req, res, next) => {
    try {
        const project = await Project.findById(req.params.id)
            .populate('owner', 'name email')
            .populate('team.member', 'name email')
            .populate('estimates');

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Check ownership (unless admin)
        if (project.owner._id.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to access this project'
            });
        }

        res.status(200).json({
            success: true,
            data: project
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
exports.updateProject = async (req, res, next) => {
    try {
        let project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Check ownership
        if (project.owner.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this project'
            });
        }

        project = await Project.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({
            success: true,
            message: 'Project updated successfully',
            data: project
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
exports.deleteProject = async (req, res, next) => {
    try {
        const project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Check ownership
        if (project.owner.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this project'
            });
        }

        await project.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Project deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get project statistics
// @route   GET /api/projects/stats/overview
// @access  Private
exports.getProjectStats = async (req, res, next) => {
    try {
        let matchQuery = {};
        if (req.user.role !== 'admin') {
            matchQuery.owner = req.user._id;
        }

        const stats = await Project.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: null,
                    totalProjects: { $sum: 1 },
                    totalEstimatedBudget: { $sum: '$budget.estimated' },
                    totalApprovedBudget: { $sum: '$budget.approved' },
                    totalSpent: { $sum: '$budget.spent' },
                    avgBudget: { $avg: '$budget.estimated' }
                }
            }
        ]);

        const statusCounts = await Project.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const categoryCounts = await Project.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    totalBudget: { $sum: '$budget.estimated' }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: {
                overview: stats[0] || {},
                byStatus: statusCounts,
                byCategory: categoryCounts
            }
        });
    } catch (error) {
        next(error);
    }
};