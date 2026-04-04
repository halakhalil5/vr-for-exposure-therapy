/**
 * Unity Service
 * 
 * Handles communication with the Unity scene builder application.
 * Sends scene configurations and receives preview images.
 * 
 * Specification: Always check /status before /build-scene
 * Ensures Unity is ready and responding before attempting scene builds.
 */

const axios = require('axios');

// Unity HTTP listener configuration
const UNITY_SERVER_URL = process.env.UNITY_SERVER_URL || 'http://localhost:8080';
const UNITY_TIMEOUT = 60000; // 60 seconds for scene building
const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds for health check

// Template to Environment Mapping per specification
const ENVIRONMENT_MAP = {
  'living-room': 'living_room',
  'road-with-skyscrapers': 'city-street',
  'rooftop': 'rooftop',
  'cliff-edge': 'cliff-edge',
  'building': 'building',
  'elevator': 'elevator',
  'airplane': 'airplane',
  'airport': 'airport'
};

// Map intensity level (1-10) to float (0.0-1.0)
const mapIntensity = (level) => {
  const intensityNum = Number(level);
  if (isNaN(intensityNum) || intensityNum < 1 || intensityNum > 10) {
    console.warn(`Invalid intensity ${level}, defaulting to 0.5`);
    return 0.5;
  }
  return (intensityNum - 1) / 9;
};

// Helper: Convert value to Vector3 format
const toVector3 = (value, fallback = { x: 0, y: 0, z: 0 }) => {
  if (Array.isArray(value)) {
    return {
      x: Number(value[0] ?? fallback.x),
      y: Number(value[1] ?? fallback.y),
      z: Number(value[2] ?? fallback.z)
    };
  }

  if (value && typeof value === 'object') {
    return {
      x: Number(value.x ?? fallback.x),
      y: Number(value.y ?? fallback.y),
      z: Number(value.z ?? fallback.z)
    };
  }

  return { ...fallback };
};

// Normalize scene object format per spec
const normalizeSceneObject = (obj = {}) => {
  if (!obj.id) {
    obj.id = `obj_${Math.random().toString(36).substr(2, 9)}`;
  }

  return {
    id: obj.id,
    type: obj.type || 'unknown',
    position: toVector3(obj.position),
    ...(obj.rotation && { rotation: toVector3(obj.rotation) }),
    ...(obj.scale && { scale: toVector3(obj.scale) })
  };
};

// Build scene request matching spec format
const buildSceneRequest = (sceneJSON, intensity) => {
  return {
    scene: {
      environment: String(sceneJSON.environment || 'unknown'),
      objects: Array.isArray(sceneJSON.objects)
        ? sceneJSON.objects.map(normalizeSceneObject)
        : [],
      triggers: Array.isArray(sceneJSON.triggers)
        ? sceneJSON.triggers.map((t) => ({
            type: t.type || 'unknown',
            count: t.count || 1,
            behavior: t.behavior || 'static',
            position: t.position ? toVector3(t.position) : { x: 0, y: 0, z: 0 }
          }))
        : []
    },
    intensity: mapIntensity(intensity),
    timestamp: new Date().toISOString(),
    requestPreview: true
  };
};

/**
 * Check Unity server health before any operations
 * Per spec: All build requests must be preceded by a health check
 * 
 * @returns {Object} Status object with available flag
 */
const checkUnityHealth = async () => {
  try {
    console.log(`🔍 Checking Unity health at ${UNITY_SERVER_URL}/status`);
    const response = await axios.get(`${UNITY_SERVER_URL}/status`, {
      timeout: HEALTH_CHECK_TIMEOUT
    });

    const { status, version, capabilities } = response.data;
    
    if (status !== 'ready') {
      console.warn(`⚠️  Unity status is "${status}", not "ready"`);
      return {
        available: false,
        status,
        reason: `Unity not ready: ${status}`
      };
    }

    console.log(`✅ Unity is ready (v${version})`);
    return {
      available: true,
      status: 'ready',
      version,
      capabilities: capabilities || []
    };

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Unity connection refused - server not running');
      return {
        available: false,
        status: 'unavailable',
        reason: 'Connection refused - Unity server not running at ' + UNITY_SERVER_URL
      };
    }

    if (error.code === 'ETIMEDOUT') {
      console.error('❌ Unity health check timeout');
      return {
        available: false,
        status: 'timeout',
        reason: 'Health check timeout - Unity may be unresponsive'
      };
    }

    console.error('❌ Unity health check failed:', error.message);
    return {
      available: false,
      status: 'error',
      reason: error.message
    };
  }
};

/**
 * Send scene configuration to Unity for building
 * Per spec: Always call checkUnityHealth() first, then POST to /build-scene
 * 
 * @param {Object} sceneJSON - Scene configuration (environment as string, no camera)
 * @param {number} intensity - Intensity level 1-10 (will be mapped to 0.0-1.0)
 * @returns {Object} Unity response with status and previewURL
 * @throws {Error} If Unity is not ready or request fails
 */
const sendSceneToUnity = async (sceneJSON, intensity = 5) => {
  // Step 1: Check Unity health per spec
  const health = await checkUnityHealth();
  if (!health.available) {
    const error = new Error(`Unity not ready: ${health.reason}`);
    error.httpStatus = 503;
    throw error;
  }

  try {
    // Step 2: Build request body per spec
    const requestBody = buildSceneRequest(sceneJSON, intensity);

    console.log(`📤 Sending scene build request to Unity`);
    console.log(`   Environment: ${requestBody.scene.environment}`);
    console.log(`   Objects: ${requestBody.scene.objects.length}`);
    console.log(`   Intensity: ${requestBody.intensity}`);

    // Step 3: POST to /build-scene
    const response = await axios.post(
      `${UNITY_SERVER_URL}/build-scene`,
      requestBody,
      {
        timeout: UNITY_TIMEOUT,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    // Step 4: Validate response per spec
    if (!response.data) {
      throw new Error('Empty response from Unity');
    }

    const { status, error: unityError, previewURL } = response.data;

    if (status === 'error' || unityError) {
      const err = new Error(`Unity build failed: ${unityError || 'unknown error'}`);
      err.httpStatus = 502;
      throw err;
    }

    console.log(`✅ Unity build successful - preview: ${previewURL || 'none'}`);

    return {
      status: status || 'ok',
      previewURL: previewURL || null,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    if (error.httpStatus) {
      throw error;
    }

    if (error.code === 'ECONNREFUSED') {
      const err = new Error('Unity server not running');
      err.httpStatus = 503;
      throw err;
    }

    if (error.code === 'ETIMEDOUT') {
      const err = new Error('Scene build timed out - Unity may be overloaded');
      err.httpStatus = 504;
      throw err;
    }

    if (error.response?.data) {
      const err = new Error(`Unity error: ${JSON.stringify(error.response.data)}`);
      err.httpStatus = 502;
      throw err;
    }

    // Log full error for debugging per spec
    console.error('Scene send error:', error.message);
    const err = new Error(`Failed to build scene: ${error.message}`);
    err.httpStatus = 500;
    throw err;
  }
};

/**
 * Request a preview image from Unity
 * 
 * @param {string} sceneId - Scene identifier
 * @param {Object} options - Preview options (angle, quality, etc.)
 * @returns {Object} Preview data including base64 image
 */
const requestPreview = async (sceneId, options = {}) => {
  try {
    const response = await axios.post(
      `${UNITY_SERVER_URL}/capture-preview`,
      {
        sceneId,
        angle: options.angle || 'default',
        quality: options.quality || 'high',
        width: options.width || 1920,
        height: options.height || 1080
      },
      {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;

  } catch (error) {
    console.error('Preview request failed:', error.message);
    throw new Error(`Failed to capture preview: ${error.message}`);
  }
};

/**
 * Check Unity server health/status
 * 
 * @returns {Object} Unity server status
 */
const checkUnityStatus = async () => {
  try {
    const response = await axios.get(`${UNITY_SERVER_URL}/status`, {
      timeout: 5000
    });

    return {
      available: true,
      status: response.data.status || 'ready',
      version: response.data.version,
      capabilities: response.data.capabilities || []
    };

  } catch (error) {
    return {
      available: false,
      status: 'unavailable',
      error: error.message
    };
  }
};

/**
 * Send a command to Unity (e.g., reset scene, change view)
 * 
 * @param {string} command - Command name
 * @param {Object} params - Command parameters
 * @returns {Object} Command response
 */
const sendCommand = async (command, params = {}) => {
  try {
    const response = await axios.post(
      `${UNITY_SERVER_URL}/command`,
      {
        command,
        params,
        timestamp: new Date().toISOString()
      },
      {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;

  } catch (error) {
    throw new Error(`Unity command failed: ${error.message}`);
  }
};

/**
 * Stream live preview updates from Unity
 * 
 * @param {string} sessionId - Session to stream
 * @param {Function} callback - Callback for preview updates
 * @returns {Object} Stream controller
 */
const streamPreview = async (sessionId, callback) => {
  // This would use WebSocket in production
  // For now, return a placeholder implementation
  console.log(`Starting preview stream for session ${sessionId}`);
  
  return {
    stop: () => {
      console.log('Preview stream stopped');
    }
  };
};

/**
 * Get available Unity assets for scene building
 * 
 * @param {string} category - Asset category (optional)
 * @returns {Array} List of available assets
 */
const getAvailableAssets = async (category = null) => {
  try {
    const url = category 
      ? `${UNITY_SERVER_URL}/assets?category=${category}`
      : `${UNITY_SERVER_URL}/assets`;
    
    const response = await axios.get(url, { timeout: 10000 });
    return response.data.assets || [];

  } catch (error) {
    console.warn('Could not fetch Unity assets:', error.message);
    
    // Return default assets list
    return getDefaultAssets(category);
  }
};

/**
 * Default assets when Unity is not available
 */
const getDefaultAssets = (category) => {
  const assets = {
    environment: [
      { id: 'indoor_room', name: 'Indoor Room', category: 'environment' },
      { id: 'outdoor_park', name: 'Outdoor Park', category: 'environment' },
      { id: 'office_space', name: 'Office Space', category: 'environment' },
      { id: 'elevator', name: 'Elevator', category: 'environment' }
    ],
    triggers: {
      arachnophobia: [
        { id: 'spider_small', name: 'Small Spider', category: 'trigger' },
        { id: 'spider_large', name: 'Large Spider', category: 'trigger' },
        { id: 'spider_web', name: 'Spider Web', category: 'trigger' }
      ],
      acrophobia: [
        { id: 'glass_floor', name: 'Glass Floor', category: 'trigger' },
        { id: 'ledge', name: 'Building Ledge', category: 'trigger' },
        { id: 'swaying_platform', name: 'Swaying Platform', category: 'trigger' }
      ],
      'social-anxiety': [
        { id: 'person_male', name: 'Male Character', category: 'trigger' },
        { id: 'person_female', name: 'Female Character', category: 'trigger' },
        { id: 'crowd', name: 'Crowd Group', category: 'trigger' }
      ]
    },
    furniture: [
      { id: 'chair', name: 'Chair', category: 'furniture' },
      { id: 'table', name: 'Table', category: 'furniture' },
      { id: 'sofa', name: 'Sofa', category: 'furniture' },
      { id: 'desk', name: 'Desk', category: 'furniture' }
    ],
    lighting: [
      { id: 'ceiling_light', name: 'Ceiling Light', category: 'lighting' },
      { id: 'floor_lamp', name: 'Floor Lamp', category: 'lighting' },
      { id: 'spotlight', name: 'Spotlight', category: 'lighting' }
    ]
  };

  if (category && assets[category]) {
    return assets[category];
  }

  // Flatten all assets
  return Object.values(assets).flat();
};

module.exports = {
  // Core spec-compliant functions
  sendSceneToUnity,
  checkUnityHealth,
  mapIntensity,
  ENVIRONMENT_MAP,
  
  // Existing utilities (kept for backward compatibility)
  requestPreview,
  sendCommand,
  streamPreview,
  getAvailableAssets
};
