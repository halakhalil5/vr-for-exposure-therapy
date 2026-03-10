/**
 * Scene Controller
 * 
 * Handles scene generation via LLM integrated and communication
 * with Unity for scene building and preview generation.
 */

const Session = require('../models/Session');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const llmService = require('../services/llmService');
const unityService = require('../services/unityService');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads', 'previews');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Generate VR scene using LLM
 * POST /api/generate-scene
 * 
 * Takes session configuration and uses LLM to generate
 * detailed scene JSON with objects, positions, and settings.
 */
const generateScene = asyncHandler(async (req, res) => {
  const {
    sessionId,
    phobia,
    intensity,
    environment,
    objectCounts,
    customInstructions
  } = req.body;

  // Validate required fields
  if (!phobia || !intensity || !environment) {
    throw new ApiError('Phobia, intensity, and environment are required', 400);
  }

  console.log('🎨 Generating scene with LLM...');
  console.log('   Phobia:', phobia);
  console.log('   Intensity:', intensity);
  console.log('   Environment:', environment);

  try {
    // Generate scene using LLM service
    const sceneJSON = await llmService.generateSceneConfiguration({
      phobia,
      intensity: parseInt(intensity),
      environment,
      objectCounts: objectCounts || {},
      customInstructions: customInstructions || ''
    });

    // If sessionId provided, update the session
    let session = null;
    if (sessionId) {
      session = await Session.findByIdAndUpdate(
        sessionId,
        { 
          $set: { 
            sceneJSON,
            sceneApproved: false
          } 
        },
        { new: true }
      );
    }

    // Send to Unity for preview generation
    let previewURL = null;
    try {
      console.log('📤 Sending scene to Unity...');
      const unityResponse = await unityService.sendSceneToUnity(sceneJSON);
      
      if (unityResponse && unityResponse.previewURL) {
        previewURL = unityResponse.previewURL;
        
        // Update session with preview URL
        if (session) {
          session.previewURL = previewURL;
          await session.save();
        }
      }
    } catch (unityError) {
      console.warn('⚠️ Unity communication failed:', unityError.message);
      // Continue without Unity preview - scene is still valid
    }

    res.json({
      message: 'Scene generated successfully',
      data: {
        sceneJSON,
        previewURL,
        sessionId: session?._id
      }
    });

  } catch (error) {
    console.error('Scene generation error:', error);
    throw new ApiError(`Scene generation failed: ${error.message}`, 500);
  }
});

/**
 * Receive preview image from Unity
 * POST /api/scene-preview
 * 
 * Unity calls this endpoint to upload preview images
 * after building the scene.
 */
const receiveScenePreview = asyncHandler(async (req, res) => {
  const { sessionId, imageData, imageType } = req.body;

  if (!imageData) {
    throw new ApiError('Image data is required', 400);
  }

  // Generate unique filename
  const filename = `preview_${sessionId || uuidv4()}_${Date.now()}.png`;
  const filepath = path.join(uploadsDir, filename);

  try {
    // Handle base64 encoded image
    let imageBuffer;
    if (imageData.startsWith('data:image')) {
      // Extract base64 data from data URL
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      imageBuffer = Buffer.from(base64Data, 'base64');
    } else {
      // Assume raw base64
      imageBuffer = Buffer.from(imageData, 'base64');
    }

    // Save image to disk
    fs.writeFileSync(filepath, imageBuffer);

    // Generate public URL
    const previewURL = `/uploads/previews/${filename}`;

    // Update session if sessionId provided
    if (sessionId) {
      const session = await Session.findById(sessionId);
      if (session) {
        session.previewURL = previewURL;
        session.previewImages.push({
          url: previewURL,
          type: imageType || 'main',
          createdAt: new Date()
        });
        await session.save();
      }
    }

    console.log('✅ Preview image saved:', filename);

    res.json({
      message: 'Preview image received successfully',
      data: {
        previewURL,
        filename
      }
    });

  } catch (error) {
    console.error('Error saving preview image:', error);
    throw new ApiError('Failed to save preview image', 500);
  }
});

/**
 * Send scene to Unity for building
 * POST /api/build-scene
 */
const buildScene = asyncHandler(async (req, res) => {
  const { sessionId, sceneJSON } = req.body;

  let sceneConfig = sceneJSON;

  // If sessionId provided, get scene from session
  if (sessionId && !sceneJSON) {
    const session = await Session.findById(sessionId);
    if (!session) {
      throw new ApiError('Session not found', 404);
    }
    sceneConfig = session.sceneJSON;
  }

  if (!sceneConfig) {
    throw new ApiError('Scene configuration is required', 400);
  }

  try {
    console.log('🏗️ Sending scene to Unity for building...');
    const result = await unityService.sendSceneToUnity(sceneConfig);

    res.json({
      message: 'Scene sent to Unity successfully',
      data: result
    });

  } catch (error) {
    console.error('Unity build error:', error);
    throw new ApiError(`Failed to send scene to Unity: ${error.message}`, 500);
  }
});

/**
 * Get scene templates
 * GET /api/scene-templates
 */
const getSceneTemplates = asyncHandler(async (req, res) => {
  const { phobia } = req.query;

  // Predefined scene templates for common phobias
  const templates = {
    arachnophobia: [
      {
        name: 'Basement Encounter',
        description: 'Dark basement with spider webs and spiders',
        intensity: 5,
        environment: 'indoor-room',
        preview: '/templates/arachnophobia_basement.jpg'
      },
      {
        name: 'Garden Path',
        description: 'Outdoor path with spiders in vegetation',
        intensity: 3,
        environment: 'outdoor-park',
        preview: '/templates/arachnophobia_garden.jpg'
      }
    ],
    acrophobia: [
      {
        name: 'Office Window',
        description: 'High-rise office with floor-to-ceiling windows',
        intensity: 4,
        environment: 'office',
        preview: '/templates/acrophobia_office.jpg'
      },
      {
        name: 'Glass Bridge',
        description: 'Glass-bottom bridge over canyon',
        intensity: 8,
        environment: 'bridge',
        preview: '/templates/acrophobia_bridge.jpg'
      }
    ],
    claustrophobia: [
      {
        name: 'Elevator Ride',
        description: 'Small elevator ascending slowly',
        intensity: 5,
        environment: 'elevator',
        preview: '/templates/claustrophobia_elevator.jpg'
      }
    ],
    'social-anxiety': [
      {
        name: 'Small Meeting',
        description: 'Conference room with few attendees',
        intensity: 3,
        environment: 'presentation-room',
        preview: '/templates/social_meeting.jpg'
      },
      {
        name: 'Large Presentation',
        description: 'Auditorium with large audience',
        intensity: 8,
        environment: 'presentation-room',
        preview: '/templates/social_presentation.jpg'
      }
    ]
  };

  if (phobia && templates[phobia]) {
    res.json({ data: templates[phobia] });
  } else {
    res.json({ data: templates });
  }
});

/**
 * Validate scene configuration
 * POST /api/validate-scene
 */
const validateScene = asyncHandler(async (req, res) => {
  const { sceneJSON } = req.body;

  if (!sceneJSON) {
    throw new ApiError('Scene configuration is required', 400);
  }

  const errors = [];
  const warnings = [];

  // Validate environment
  if (!sceneJSON.environment) {
    errors.push('Environment configuration is missing');
  }

  // Validate objects
  if (!sceneJSON.objects || !Array.isArray(sceneJSON.objects)) {
    warnings.push('No objects defined in scene');
  } else {
    sceneJSON.objects.forEach((obj, index) => {
      if (!obj.type) {
        errors.push(`Object at index ${index} is missing type`);
      }
      if (!obj.position) {
        warnings.push(`Object "${obj.type || index}" has no position defined`);
      }
    });
  }

  // Validate camera
  if (!sceneJSON.camera) {
    warnings.push('Camera configuration not defined, using defaults');
  }

  const isValid = errors.length === 0;

  res.json({
    valid: isValid,
    errors,
    warnings
  });
});

module.exports = {
  generateScene,
  receiveScenePreview,
  buildScene,
  getSceneTemplates,
  validateScene
};
