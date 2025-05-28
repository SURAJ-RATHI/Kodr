const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');

// Create a new project
router.post('/create', projectController.create);

// Get all projects
router.get('/list', projectController.list);

// Get a single project
router.get('/:id', projectController.getOne);

// Update project code
router.put('/:id/code', projectController.updateCode);

// Review code using AI
router.post('/:id/review', projectController.reviewCode);

module.exports = router;