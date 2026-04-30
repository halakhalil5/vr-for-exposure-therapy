/**
 * Scene Routes
 * 
 * API routes for scene generation and Unity communication.
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const {
  receiveScenePreview,
  buildScene,
  getSceneTemplates,
  validateScene,
  speechToText
} = require('../controllers/sceneController');

const speechUploadsDir = path.join(__dirname, '..', 'uploads', 'speech-temp');
if (!fs.existsSync(speechUploadsDir)) {
  fs.mkdirSync(speechUploadsDir, { recursive: true });
}

const speechStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, speechUploadsDir),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname || '') || '.webm';
    cb(null, `speech_${Date.now()}_${Math.round(Math.random() * 1E9)}${extension}`);
  }
});

const uploadSpeechAudio = multer({
  storage: speechStorage,
  limits: {
    fileSize: 25 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype?.startsWith('audio/')) {
      return cb(null, true);
    }

    const error = new Error('Only audio uploads are allowed');
    error.statusCode = 400;
    error.isOperational = true;
    cb(error);
  }
});

// POST /api/scene-preview - Receive preview image from Unity
router.post('/scene-preview', receiveScenePreview);

// POST /api/build-scene - Send scene to Unity for building
router.post('/build-scene', buildScene);

// POST /api/speech-to-text - Transcribe microphone audio using local Whisper
router.post('/speech-to-text', uploadSpeechAudio.single('audio'), speechToText);

// GET /api/scene-templates - Get predefined scene templates
router.get('/scene-templates', getSceneTemplates);

// POST /api/validate-scene - Validate scene configuration
router.post('/validate-scene', validateScene);

module.exports = router;
