const OpenAI = require('openai');
const { normalizeAndSanitizePlacements } = require('./placementNormalizer');

let openRouterClient = null;

const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getOpenRouterClient = () => {
  if (openRouterClient) {
    return openRouterClient;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw createError('OPENROUTER_API_KEY is not configured', 500);
  }

  openRouterClient = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
    timeout: 40000
  });

  return openRouterClient;
};

const normalizeScreenshot = (imageInput) => {
  if (typeof imageInput !== 'string' || !imageInput.trim()) {
    return null;
  }

  const trimmed = imageInput.trim();
  if (trimmed.startsWith('data:image')) {
    return trimmed;
  }

  return `data:image/png;base64,${trimmed}`;
};

const validatePlacementPayload = (payload = {}) => {
  const { screenshots, objectsToPlace, sceneInventory, intensity } = payload;

  if (!Array.isArray(screenshots) || screenshots.length < 2) {
    throw createError('screenshots must contain at least two base64 images', 400);
  }

  if (!Array.isArray(objectsToPlace)) {
    throw createError('objectsToPlace must be an array', 400);
  }

  if (!sceneInventory || typeof sceneInventory !== 'object') {
    throw createError('sceneInventory is required', 400);
  }

  if (!Array.isArray(sceneInventory.existingObjects)) {
    throw createError('sceneInventory.existingObjects must be an array', 400);
  }

  if (!sceneInventory.roomBounds || typeof sceneInventory.roomBounds !== 'object') {
    throw createError('sceneInventory.roomBounds is required', 400);
  }

  if (!Number.isFinite(Number(intensity))) {
    throw createError('intensity must be a number from 0 to 1', 400);
  }

  const normalizedIntensity = Number(intensity);
  if (normalizedIntensity < 0 || normalizedIntensity > 1) {
    throw createError('intensity must be between 0 and 1', 400);
  }

  const topDownScreenshot = normalizeScreenshot(screenshots[0]);
  const playerScreenshot = normalizeScreenshot(screenshots[1]);
  if (!topDownScreenshot || !playerScreenshot) {
    throw createError('screenshots must contain valid base64 image strings', 400);
  }

  return {
    screenshots: [topDownScreenshot, playerScreenshot],
    objectsToPlace,
    sceneInventory,
    intensity: normalizedIntensity
  };
};

const buildPlacementPrompt = ({ objectsToPlace, sceneInventory, intensity }) => {
  const minDistanceFromPlayer = Math.max(0.5, 1.5 - intensity);

  return [
    'You place VR therapy objects in a Unity room.',
    'Return strict JSON only with an array of placement objects. No markdown, no prose.',
    '',
    'Placement constraints you must satisfy:',
    '- Identify free surfaces from images (floor, walls, ceiling, furniture).',
    '- Place spiders/insects on visible surfaces.',
    '- Place cobweb props in room corners and wall intersections.',
    '- Place floor objects only on walkable floor.',
    '- No overlap with existing scene objects.',
    '- No overlap between newly placed objects.',
    '- Keep minimum spacing of 0.4 meters between placed objects.',
    '- Keep every placement inside room bounds.',
    '- Ensure objects are visible from player start (0, 1.6, 0).',
    `- Keep placed objects at least ${minDistanceFromPlayer.toFixed(2)}m from player start (max(0.5, 1.5 - intensity)).`,
    '',
    'Use this output array format exactly:',
    '[',
    '  {',
    '    "id": "input id",',
    '    "type": "input type",',
    '    "position": {"x": 0, "y": 0, "z": 0},',
    '    "rotation": {"x": 0, "y": 0, "z": 0},',
    '    "surface": "floor|wall|ceiling|furniture",',
    '    "reasoning": "brief"',
    '  }',
    ']',
    '',
    `intensity: ${intensity}`,
    'playerStart: {"x":0,"y":1.6,"z":0}',
    `objectsToPlace: ${JSON.stringify(objectsToPlace)}`,
    `sceneInventory: ${JSON.stringify(sceneInventory)}`
  ].join('\n');
};

const callOpenRouterForPlacements = async ({
  screenshots,
  objectsToPlace,
  sceneInventory,
  intensity,
  requestHeaders = {}
}) => {
  const client = getOpenRouterClient();

  const referer = requestHeaders.httpReferer || process.env.OPENROUTER_HTTP_REFERER;
  const title = requestHeaders.xTitle || process.env.OPENROUTER_X_TITLE;
  const extraHeaders = {};
  if (referer) {
    extraHeaders['HTTP-Referer'] = referer;
  }
  if (title) {
    extraHeaders['X-Title'] = title;
  }

  const response = await client.chat.completions.create(
    {
      model: 'openai/gpt-4o',
      temperature: 0.1,
      max_tokens: 1200,
      messages: [
        {
          role: 'system',
          content:
            'You are a Unity VR object placement assistant. Respond with JSON only and satisfy geometric constraints exactly.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: buildPlacementPrompt({ objectsToPlace, sceneInventory, intensity })
            },
            {
              type: 'image_url',
              image_url: {
                url: screenshots[0]
              }
            },
            {
              type: 'image_url',
              image_url: {
                url: screenshots[1]
              }
            }
          ]
        }
      ]
    },
    Object.keys(extraHeaders).length > 0 ? { headers: extraHeaders } : undefined
  );

  return response?.choices?.[0]?.message?.content;
};

const normalizeModelPlacements = ({ modelOutput, objectsToPlace, sceneInventory, intensity }) => {
  return normalizeAndSanitizePlacements({
    rawOutput: modelOutput,
    objectsToPlace,
    sceneInventory,
    intensity
  });
};

const generateAIPlacements = async (payload, requestHeaders = {}) => {
  const normalized = validatePlacementPayload(payload);

  let modelOutput;
  try {
    modelOutput = await callOpenRouterForPlacements({
      ...normalized,
      requestHeaders
    });
  } catch (error) {
    const status = Number(error?.status) || 500;
    const providerMessage = status >= 500
      ? 'AI provider request failed'
      : 'AI provider rejected the request';
    throw createError(providerMessage, 502);
  }

  return normalizeModelPlacements({
    modelOutput,
    objectsToPlace: normalized.objectsToPlace,
    sceneInventory: normalized.sceneInventory,
    intensity: normalized.intensity
  });
};

module.exports = {
  callOpenRouterForPlacements,
  generateAIPlacements,
  normalizeModelPlacements,
  validatePlacementPayload
};
