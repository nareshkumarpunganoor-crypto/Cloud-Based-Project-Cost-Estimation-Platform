const express = require('express');
const router = express.Router();
const {
    createProject,
    getProjects,
    getProject,
    updateProject,
    deleteProject,
    getProjectStats
} = require('../controllers/projectController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes need authentication
router.use(protect);

router.get('/stats/overview', getProjectStats);
router.route('/')
    .get(getProjects)
    .post(createProject);

router.route('/:id')
    .get(getProject)
    .put(updateProject)
    .delete(deleteProject);

module.exports = router;