/**
 * Scene Routes
 * 
 * API routes for scene generation and Unity communication.
 */

const express = require('express');
const router = express.Router();
const {
  generateScene,
  receiveScenePreview,
  buildScene,
  getSceneTemplates,
  validateScene,
  generateAIPlacement,
  testAIPlacementExtraction
} = require('../controllers/sceneController');

// POST /api/generate-scene - Generate VR scene using LLM
router.post('/generate-scene', generateScene);

// POST /api/scene-preview - Receive preview image from Unity
router.post('/scene-preview', receiveScenePreview);

// POST /api/build-scene - Send scene to Unity for building
router.post('/build-scene', buildScene);

// GET /api/scene-templates - Get predefined scene templates
router.get('/scene-templates', getSceneTemplates);

// POST /api/validate-scene - Validate scene configuration
router.post('/validate-scene', validateScene);

// POST /api/ai-placement - AI-assisted Unity placement from screenshots
router.post('/ai-placement', generateAIPlacement);

// POST /api/ai-placement/test-extraction - Parser/validation test helper
router.post('/ai-placement/test-extraction', testAIPlacementExtraction);

module.exports = router;
