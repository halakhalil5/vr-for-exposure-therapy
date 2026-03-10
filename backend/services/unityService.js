/**
 * Unity Service
 * 
 * Handles communication with the Unity scene builder application.
 * Sends scene configurations and receives preview images.
 */

const axios = require('axios');

// Unity HTTP listener configuration
const UNITY_SERVER_URL = process.env.UNITY_SERVER_URL || 'http://localhost:8080';
const UNITY_TIMEOUT = 60000; // 60 seconds for scene building

/**
 * Send scene configuration to Unity for building
 * 
 * @param {Object} sceneJSON - Scene configuration object
 * @returns {Object} Response from Unity server
 */
const sendSceneToUnity = async (sceneJSON) => {
  try {
    console.log(`📤 Sending scene to Unity at ${UNITY_SERVER_URL}`);
    
    const response = await axios.post(
      `${UNITY_SERVER_URL}/build-scene`,
      {
        scene: sceneJSON,
        timestamp: new Date().toISOString(),
        requestPreview: true
      },
      {
        timeout: UNITY_TIMEOUT,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Unity response received');
    return response.data;

  } catch (error) {
    // Handle specific error cases
    if (error.code === 'ECONNREFUSED') {
      console.warn('⚠️ Unity server not available at', UNITY_SERVER_URL);
      throw new Error('Unity server is not running. Please start the Unity application.');
    }
    
    if (error.code === 'ETIMEDOUT') {
      throw new Error('Unity scene building timed out. The scene may be too complex.');
    }

    if (error.response) {
      throw new Error(`Unity error: ${error.response.data.message || error.response.statusText}`);
    }

    throw error;
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
  sendSceneToUnity,
  requestPreview,
  checkUnityStatus,
  sendCommand,
  streamPreview,
  getAvailableAssets
};
