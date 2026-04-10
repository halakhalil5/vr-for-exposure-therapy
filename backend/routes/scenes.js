/**
 * Scene Routes
 * 
 * API routes for scene generation and Unity communication.
 */

const express = require('express');
const router = express.Router();
const {
  receiveScenePreview,
  buildScene,
  getSceneTemplates,
  validateScene
} = require('../controllers/sceneController');

// POST /api/scene-preview - Receive preview image from Unity
router.post('/scene-preview', receiveScenePreview);

// POST /api/build-scene - Send scene to Unity for building
router.post('/build-scene', buildScene);

// GET /api/scene-templates - Get predefined scene templates
router.get('/scene-templates', getSceneTemplates);

// POST /api/validate-scene - Validate scene configuration
router.post('/validate-scene', validateScene);

module.exports = router;
