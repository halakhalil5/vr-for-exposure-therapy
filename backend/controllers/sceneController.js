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

const ENABLE_LLM = process.env.ENABLE_LLM === 'true';

const SCENE_TEMPLATES = [
  {
    id: 'living-room',
    name: 'Living Room',
    environment: 'living-room',
    description: 'Comfortable indoor home setting'
  },
  {
    id: 'road-with-skyscrappers',
    name: 'Road with Skyscrappers',
    environment: 'city-street',
    description: 'Urban road surrounded by tall skyscrapers'
  },
  {
    id: 'rooftop',
    name: 'Rooftop',
    environment: 'rooftop',
    description: 'Open rooftop at significant height'
  },
  {
    id: 'cliff-edge',
    name: 'Cliff edge',
    environment: 'cliff-edge',
    description: 'Natural cliff edge with steep drop'
  },
  {
    id: 'building',
    name: 'Building',
    environment: 'building',
    description: 'Multi-floor building environment with interior corridors'
  },
  {
    id: 'cave',
    name: 'Cave',
    environment: 'cave',
    description: 'Enclosed cave pathway with rocky surroundings'
  },
  {
    id: 'elevator',
    name: 'Elevator',
    environment: 'elevator',
    description: 'Confined elevator cabin'
  },
  {
    id: 'airplane',
    name: 'Airplane',
    environment: 'airplane',
    description: 'Commercial airplane cabin'
  },
  {
    id: 'airport',
    name: 'Airport',
    environment: 'airport',
    description: 'Airport terminal and boarding context'
  }
];

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads', 'previews');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const buildFallbackSceneJSON = ({
  environment,
  intensity,
  sceneDescription,
  objectCounts,
  customInstructions
}) => {
  const triggerCount = Math.max(1, Math.min(10, objectCounts?.triggers || Math.ceil(Number(intensity) / 2)));
  const ambientCount = Math.max(0, Math.min(20, objectCounts?.ambient || 5));

  const objects = [];
  for (let i = 0; i < ambientCount; i += 1) {
    objects.push({
      id: `ambient_${i + 1}`,
      type: 'ambient',
      position: [i % 5, 0, Math.floor(i / 5) + 2],
      scale: 1
    });
  }

  const triggers = [];
  for (let i = 0; i < triggerCount; i += 1) {
    triggers.push({
      id: `trigger_${i + 1}`,
      type: 'trigger',
      position: [i % 4, 0, 1 + Math.floor(i / 4)],
      scale: 1
    });
  }

  return {
    environment,
    environmentSettings: {
      size: 'medium',
      ambiance: Number(intensity) > 6 ? 'challenging' : 'neutral',
      description: sceneDescription || ''
    },
    lighting: {
      brightness: Number(intensity) > 6 ? 0.8 : 0.65,
      color: '#ffffff'
    },
    metadata: {
      generator: 'fallback',
      customInstructions: customInstructions || ''
    },
    objects: [...objects, ...triggers]
  };
};

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
    sceneTemplate,
    environment,
    objectCounts,
    sceneDescription,
    customInstructions
  } = req.body;

  const selectedTemplate = SCENE_TEMPLATES.find((template) => template.id === sceneTemplate);
  const resolvedEnvironment = selectedTemplate?.environment || environment;

  // Validate required fields
  if (!phobia || !intensity || !resolvedEnvironment) {
    throw new ApiError('Phobia, intensity, and scene template/environment are required', 400);
  }

  console.log('🎨 Generating scene with LLM...');
  console.log('   Phobia:', phobia);
  console.log('   Intensity:', intensity);
  console.log('   Template:', sceneTemplate || 'n/a');
  console.log('   Environment:', resolvedEnvironment);

  try {
    let sceneJSON;

    if (ENABLE_LLM) {
      const therapistInstructions = [sceneDescription, customInstructions]
        .filter(Boolean)
        .join('\n\n');

      console.log('📤 Sending scene generation request to OpenAI...');
      sceneJSON = await llmService.generateSceneConfiguration({
        phobia,
        intensity: Number(intensity),
        environment: resolvedEnvironment,
        objectCounts,
        customInstructions: therapistInstructions,
        sceneTemplate: selectedTemplate?.name || 'Custom'
      });
      console.log('✅ OpenAI response received');
    } else {
      console.log('🛠️ LLM disabled. Using fallback scene generator.');
      sceneJSON = buildFallbackSceneJSON({
        environment: resolvedEnvironment,
        intensity,
        sceneDescription,
        objectCounts,
        customInstructions
      });
    }

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
      const unityResponse = await unityService.sendSceneToUnity(sceneJSON, Number(intensity));
      
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
  const { sessionId, sceneJSON, intensity } = req.body;

  let sceneConfig = sceneJSON;
  let sessionIntensity = intensity;

  // If sessionId provided, get scene from session
  if (sessionId && !sceneJSON) {
    const session = await Session.findById(sessionId);
    if (!session) {
      throw new ApiError('Session not found', 404);
    }
    sceneConfig = session.sceneJSON;
    sessionIntensity = intensity || session.intensity || 5;
  }

  if (!sceneConfig) {
    throw new ApiError('Scene configuration is required', 400);
  }

  try {
    console.log('🏗️ Sending scene to Unity for building...');
    const result = await unityService.sendSceneToUnity(sceneConfig, Number(sessionIntensity));

    res.json({
      message: 'Scene sent to Unity successfully',
      data: result
    });
    console.log(result);

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
  res.json({ data: SCENE_TEMPLATES });
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
