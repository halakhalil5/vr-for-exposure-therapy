/**
 * LLM Service
 * 
 * Handles scene generation using OpenAI GPT or similar LLM.
 * Generates detailed VR scene configurations based on therapy parameters.
 */

const OpenAI = require('openai');

const DISALLOWED_OBJECT_TERMS = ['floor', 'room', 'wall', 'walls', 'camera', 'furniture'];

// Initialize OpenAI client (will use OPENAI_API_KEY from env)
let openai = null;

/**
 * Initialize OpenAI client
 */
const initializeClient = () => {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openai;
};

const normalizeSceneShape = (scene = {}, selectedEnvironment) => {
  const rawEnvironment = scene.environment;
  let normalizedEnvironment = selectedEnvironment;

  if (typeof rawEnvironment === 'string' && rawEnvironment.trim()) {
    normalizedEnvironment = rawEnvironment.trim();
  } else if (rawEnvironment && typeof rawEnvironment === 'object') {
    normalizedEnvironment = rawEnvironment.type || rawEnvironment.id || rawEnvironment.name || selectedEnvironment;
  }

  const normalizedObjects = Array.isArray(scene.objects)
    ? scene.objects
        .map((obj) => {
          const { environment, ...rest } = obj || {};
          return rest;
        })
        .filter((obj) => {
          const typeText = String(obj?.type || '').toLowerCase();
          const nameText = String(obj?.name || '').toLowerCase();
          return !DISALLOWED_OBJECT_TERMS.some(
            (term) => typeText.includes(term) || nameText.includes(term)
          );
        })
    : [];

  return {
    ...scene,
    environment: normalizedEnvironment,
    objects: normalizedObjects,
    camera: undefined
  };
};

/**
 * Generate VR scene configuration using LLM
 * 
 * @param {Object} params - Scene parameters
 * @param {string} params.phobia - Type of phobia to address
 * @param {number} params.intensity - Intensity level (1-10)
 * @param {string} params.environment - Environment type
 * @param {Object} params.objectCounts - Specific object count requirements
 * @param {string} params.customInstructions - Additional instructions
 * @returns {Object} Scene configuration JSON
 */
const generateSceneConfiguration = async ({
  phobia,
  intensity,
  environment,
  objectCounts = {},
  customInstructions = '',
  sceneTemplate = 'Custom'
}) => {
  // Try to use OpenAI if available
  const client = initializeClient();
  
  if (client) {
    try {
      const generated = await generateWithOpenAI(phobia, intensity, environment, objectCounts, customInstructions, sceneTemplate);
      return normalizeSceneShape(generated, environment);
    } catch (error) {
      console.warn('OpenAI generation failed, using fallback:', error.message);
    }
  }

  // Fallback to rule-based generation
  return normalizeSceneShape(
    generateFallbackScene(phobia, intensity, environment, objectCounts),
    environment
  );
};

/**
 * Generate scene using OpenAI API
 */
const generateWithOpenAI = async (phobia, intensity, environment, objectCounts, customInstructions, sceneTemplate) => {
  const systemPrompt = `You are a VR scene designer specializing in exposure therapy environments. 
Generate detailed JSON scene configurations for therapeutic VR experiences.
Your scenes should be clinically appropriate, gradually exposing patients to their fears.
Always respond with valid JSON only, no additional text.
The selected environment type is mandatory and must be used exactly as provided.`;

  const userPrompt = `Create a VR scene configuration for exposure therapy with these parameters:

Phobia: ${phobia}
Intensity Level: ${intensity}/10 (1=minimal exposure, 10=maximum exposure)
Environment: ${environment}
Selected Template: ${sceneTemplate}
${objectCounts ? `Object counts: ${JSON.stringify(objectCounts)}` : ''}
${customInstructions ? `Therapist instructions for room and objects: ${customInstructions}` : ''}

Generate a JSON scene configuration with this structure:
{
  "environment": "environment type id",
  "objects": [
    {
      "type": "object_type",
      "name": "descriptive_name",
      "position": {"x": 0, "y": 0, "z": 0},
      "rotation": {"x": 0, "y": 0, "z": 0},
      "scale": {"x": 1, "y": 1, "z": 1},
      "properties": {}
    }
  ],
  "triggers": [
    {
      "type": "phobia_trigger_type",
      "count": number,
      "behavior": "static/moving/interactive",
      "spawnArea": {"minX": 0, "maxX": 0, "minZ": 0, "maxZ": 0}
    }
  ]
}

Requirements:
- Set environment exactly to "${environment}" as a string (not an object).
- Include objects that match the therapist instructions.
- Do not include an environment field inside individual objects.
- Do not include objects whose type or name represents floor, room, walls, camera, or furniture.
- Do not include a top-level camera field in the scene JSON.
- Keep object positions physically plausible inside the selected environment.
- Return only valid JSON matching the schema above.

Create an appropriate scene based on the intensity level. Lower intensity means fewer triggers, 
greater distance from triggers, and calmer environment. Higher intensity means more triggers, 
closer proximity, and potentially more dynamic/threatening scenarios.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7,
    max_tokens: 2000
  });

  const content = response.choices[0].message.content;
  
  // Extract JSON from response (in case there's extra text)
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No valid JSON found in LLM response');
  }

  return JSON.parse(jsonMatch[0]);
};

/**
 * Fallback scene generation (rule-based)
 * Used when LLM is not available
 */
const generateFallbackScene = (phobia, intensity, environment, objectCounts) => {
  // Base scene configuration
  const scene = {
    environment,
    environmentSettings: {
      skybox: getDefaultSkybox(environment),
      lighting: {
        type: 'natural',
        intensity: intensity <= 5 ? 1.2 : 0.8,
        color: '#FFFFFF',
        timeOfDay: intensity <= 3 ? 'day' : intensity <= 7 ? 'dusk' : 'night'
      },
      weather: {
        type: intensity <= 5 ? 'clear' : 'cloudy',
        intensity: Math.min(intensity * 0.1, 0.5)
      },
      ambientSounds: getAmbientSounds(environment, intensity)
    },
    objects: generateEnvironmentObjects(environment),
    triggers: generateTriggers(phobia, intensity, objectCounts)
  };

  return scene;
};

/**
 * Get default skybox for environment
 */
const getDefaultSkybox = (environment) => {
  const skyboxes = {
    'indoor-room': 'indoor_neutral',
    'outdoor-park': 'sunny_park',
    'office': 'office_windows',
    'elevator': 'elevator_interior',
    'rooftop': 'city_skyline',
    'bridge': 'canyon_vista',
    'airplane': 'clouds_altitude',
    'forest': 'forest_canopy',
    'beach': 'beach_sunset',
    'city-street': 'urban_day',
    'medical-office': 'clinical_white',
    'presentation-room': 'conference_hall'
  };
  return skyboxes[environment] || 'default_sky';
};

/**
 * Get ambient sounds for environment
 */
const getAmbientSounds = (environment, intensity) => {
  const sounds = {
    'indoor-room': ['room_tone', 'distant_traffic'],
    'outdoor-park': ['birds_chirping', 'wind_light', 'leaves_rustling'],
    'office': ['office_ambience', 'keyboard_typing', 'air_conditioning'],
    'elevator': ['elevator_hum', 'floor_dings'],
    'rooftop': ['wind_strong', 'city_distant'],
    'bridge': ['wind_howling', 'creaking'],
    'airplane': ['engine_drone', 'cabin_noise'],
    'forest': ['birds_forest', 'crickets', 'leaves_rustling'],
    'beach': ['waves_crashing', 'seagulls'],
    'city-street': ['traffic', 'crowd_chatter', 'horns'],
    'medical-office': ['clinical_ambience', 'beeping'],
    'presentation-room': ['crowd_murmur', 'air_conditioning']
  };

  const baseSounds = sounds[environment] || ['ambient_neutral'];
  
  // Add intensity-based sounds
  if (intensity > 7) {
    baseSounds.push('tension_drone');
  }

  return baseSounds;
};

/**
 * Generate environment objects
 */
const generateEnvironmentObjects = (environment) => {
  const objects = [];

  // Common objects for each environment
  const envObjects = {
    'indoor-room': [
      { type: 'floor', name: 'wooden_floor', position: { x: 0, y: 0, z: 0 } },
      { type: 'walls', name: 'room_walls', position: { x: 0, y: 0, z: 0 } },
      { type: 'furniture', name: 'sofa', position: { x: 2, y: 0, z: 0 } },
      { type: 'furniture', name: 'table', position: { x: 0, y: 0, z: 2 } },
      { type: 'lighting', name: 'ceiling_light', position: { x: 0, y: 2.5, z: 0 } }
    ],
    'outdoor-park': [
      { type: 'terrain', name: 'grass_ground', position: { x: 0, y: 0, z: 0 } },
      { type: 'vegetation', name: 'tree_oak', position: { x: 5, y: 0, z: 3 } },
      { type: 'vegetation', name: 'tree_oak', position: { x: -4, y: 0, z: 5 } },
      { type: 'furniture', name: 'bench', position: { x: 2, y: 0, z: 0 } },
      { type: 'path', name: 'gravel_path', position: { x: 0, y: 0.01, z: 0 } }
    ],
    'office': [
      { type: 'floor', name: 'carpet_floor', position: { x: 0, y: 0, z: 0 } },
      { type: 'furniture', name: 'desk', position: { x: 0, y: 0, z: 2 } },
      { type: 'furniture', name: 'office_chair', position: { x: 0, y: 0, z: 1 } },
      { type: 'furniture', name: 'filing_cabinet', position: { x: 3, y: 0, z: 3 } },
      { type: 'window', name: 'large_window', position: { x: 0, y: 1.5, z: 5 } }
    ],
    'elevator': [
      { type: 'floor', name: 'metal_floor', position: { x: 0, y: 0, z: 0 } },
      { type: 'walls', name: 'elevator_walls', position: { x: 0, y: 0, z: 0 } },
      { type: 'panel', name: 'button_panel', position: { x: 1, y: 1.2, z: 0 } },
      { type: 'lighting', name: 'ceiling_panel', position: { x: 0, y: 2.4, z: 0 } }
    ],
    'presentation-room': [
      { type: 'floor', name: 'conference_floor', position: { x: 0, y: 0, z: 0 } },
      { type: 'furniture', name: 'podium', position: { x: 0, y: 0, z: 5 } },
      { type: 'furniture', name: 'chairs_audience', position: { x: 0, y: 0, z: -5 } },
      { type: 'screen', name: 'presentation_screen', position: { x: 0, y: 2, z: 6 } }
    ]
  };

  return envObjects[environment] || [
    { type: 'floor', name: 'default_floor', position: { x: 0, y: 0, z: 0 } }
  ];
};

/**
 * Generate phobia-specific trigger objects
 */
const generateTriggers = (phobia, intensity, objectCounts) => {
  const triggers = [];

  // Calculate trigger count based on intensity
  const baseCount = objectCounts?.triggers || Math.ceil(intensity / 2);

  const triggerConfigs = {
    'arachnophobia': {
      type: 'spider',
      behaviors: ['static', 'crawling', 'web_building'],
      scaleRange: { min: 0.5, max: 2 }
    },
    'acrophobia': {
      type: 'height_indicator',
      behaviors: ['static', 'swaying', 'transparent_floor'],
      scaleRange: { min: 1, max: 1 }
    },
    'claustrophobia': {
      type: 'wall_closing',
      behaviors: ['static', 'slowly_closing', 'breathing'],
      scaleRange: { min: 1, max: 1 }
    },
    'social-anxiety': {
      type: 'person',
      behaviors: ['static', 'looking', 'approaching', 'talking'],
      scaleRange: { min: 0.9, max: 1.1 }
    },
    'cynophobia': {
      type: 'dog',
      behaviors: ['static', 'walking', 'barking', 'running'],
      scaleRange: { min: 0.7, max: 1.3 }
    },
    'ophidiophobia': {
      type: 'snake',
      behaviors: ['static', 'slithering', 'coiled'],
      scaleRange: { min: 0.5, max: 2 }
    }
  };

  const config = triggerConfigs[phobia] || {
    type: 'generic_trigger',
    behaviors: ['static'],
    scaleRange: { min: 1, max: 1 }
  };

  // Determine behavior based on intensity
  const behaviorIndex = Math.min(
    Math.floor(intensity / 3),
    config.behaviors.length - 1
  );

  triggers.push({
    type: config.type,
    count: baseCount,
    behavior: config.behaviors[behaviorIndex],
    spawnArea: {
      minX: -5 + (10 - intensity) * 0.5, // Closer at higher intensity
      maxX: 5 - (10 - intensity) * 0.5,
      minZ: 2 + (10 - intensity) * 0.3,
      maxZ: 8
    },
    scale: {
      min: config.scaleRange.min * (0.5 + intensity * 0.1),
      max: config.scaleRange.max * (0.5 + intensity * 0.1)
    }
  });

  return triggers;
};

module.exports = {
  generateSceneConfiguration
};
