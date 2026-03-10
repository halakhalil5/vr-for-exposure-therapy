/**
 * Session Routes
 * 
 * API routes for VR therapy session management.
 */

const express = require('express');
const router = express.Router();
const {
  getAllSessions,
  getSessionById,
  createSession,
  updateSession,
  updateSceneConfig,
  approveScene,
  deleteSession,
  addBiofeedbackData,
  updatePatientFeedback,
  startSession,
  completeSession
} = require('../controllers/sessionController');

// GET /api/sessions - Get all sessions (with filtering)
router.get('/', getAllSessions);

// GET /api/sessions/:id - Get single session
router.get('/:id', getSessionById);

// POST /api/sessions - Create new VR session
router.post('/', createSession);

// PUT /api/sessions/:id - Update session
router.put('/:id', updateSession);

// PATCH /api/sessions/:id/scene - Update scene configuration
router.patch('/:id/scene', updateSceneConfig);

// POST /api/sessions/:id/approve - Approve scene for VR
router.post('/:id/approve', approveScene);

// DELETE /api/sessions/:id - Delete session
router.delete('/:id', deleteSession);

// POST /api/sessions/:id/biofeedback - Add biofeedback data
router.post('/:id/biofeedback', addBiofeedbackData);

// POST /api/sessions/:id/feedback - Update patient feedback
router.post('/:id/feedback', updatePatientFeedback);

// POST /api/sessions/:id/start - Start session
router.post('/:id/start', startSession);

// POST /api/sessions/:id/complete - Complete session
router.post('/:id/complete', completeSession);

module.exports = router;
