const PLAYER_START = { x: 0, y: 1.6, z: 0 };
const MIN_PLACEMENT_SPACING = 0.4;
const DEFAULT_OBJECT_RADIUS = 0.2;
const ALLOWED_SURFACES = new Set(['floor', 'wall', 'ceiling', 'furniture']);

const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const isFiniteNumber = (value) => Number.isFinite(value);

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizeVector = (vector) => {
  if (!vector || typeof vector !== 'object') {
    return null;
  }

  const x = toNumber(vector.x);
  const y = toNumber(vector.y);
  const z = toNumber(vector.z);

  if (!isFiniteNumber(x) || !isFiniteNumber(y) || !isFiniteNumber(z)) {
    return null;
  }

  return { x, y, z };
};

const vectorDistance = (a, b) => {
  return Math.sqrt(
    Math.pow(a.x - b.x, 2) +
      Math.pow(a.y - b.y, 2) +
      Math.pow(a.z - b.z, 2)
  );
};

const safeJsonParse = (value) => {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

const normalizeRoomBounds = (roomBounds = {}) => {
  const fallback = {
    minX: -10,
    maxX: 10,
    minY: 0,
    maxY: 4,
    minZ: -10,
    maxZ: 10
  };

  const hasContractBounds =
    roomBounds &&
    [roomBounds.minX, roomBounds.maxX, roomBounds.minZ, roomBounds.maxZ, roomBounds.floorY, roomBounds.ceilingY].every(
      (value) => Number.isFinite(Number(value))
    );

  if (hasContractBounds) {
    return {
      minX: Number(roomBounds.minX),
      maxX: Number(roomBounds.maxX),
      minY: Number(roomBounds.floorY),
      maxY: Number(roomBounds.ceilingY),
      minZ: Number(roomBounds.minZ),
      maxZ: Number(roomBounds.maxZ)
    };
  }

  const hasFlatBounds =
    roomBounds &&
    [roomBounds.minX, roomBounds.maxX, roomBounds.minY, roomBounds.maxY, roomBounds.minZ, roomBounds.maxZ].every(
      (value) => Number.isFinite(Number(value))
    );

  if (hasFlatBounds) {
    return {
      minX: Number(roomBounds.minX),
      maxX: Number(roomBounds.maxX),
      minY: Number(roomBounds.minY),
      maxY: Number(roomBounds.maxY),
      minZ: Number(roomBounds.minZ),
      maxZ: Number(roomBounds.maxZ)
    };
  }

  return fallback;
};

const extractPlacementArray = (rawOutput) => {
  if (Array.isArray(rawOutput)) {
    return rawOutput;
  }

  if (rawOutput && typeof rawOutput === 'object') {
    if (Array.isArray(rawOutput.objects)) return rawOutput.objects;
    if (Array.isArray(rawOutput.placements)) return rawOutput.placements;
    if (Array.isArray(rawOutput.layout)) return rawOutput.layout;
  }

  if (typeof rawOutput !== 'string') {
    throw createError('Model output was not parseable JSON', 500);
  }

  const trimmed = rawOutput.trim();
  if (!trimmed) {
    throw createError('Model output was empty', 500);
  }

  const direct = safeJsonParse(trimmed);
  if (Array.isArray(direct)) return direct;
  if (direct && typeof direct === 'object') {
    if (Array.isArray(direct.objects)) return direct.objects;
    if (Array.isArray(direct.placements)) return direct.placements;
    if (Array.isArray(direct.layout)) return direct.layout;
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    const fenced = safeJsonParse(fencedMatch[1].trim());
    if (Array.isArray(fenced)) return fenced;
    if (fenced && typeof fenced === 'object') {
      if (Array.isArray(fenced.objects)) return fenced.objects;
      if (Array.isArray(fenced.placements)) return fenced.placements;
      if (Array.isArray(fenced.layout)) return fenced.layout;
    }
  }

  const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    const parsedArray = safeJsonParse(arrayMatch[0]);
    if (Array.isArray(parsedArray)) {
      return parsedArray;
    }
  }

  const objectMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    const parsedObject = safeJsonParse(objectMatch[0]);
    if (parsedObject && typeof parsedObject === 'object') {
      if (Array.isArray(parsedObject.objects)) return parsedObject.objects;
      if (Array.isArray(parsedObject.placements)) return parsedObject.placements;
      if (Array.isArray(parsedObject.layout)) return parsedObject.layout;
    }
  }

  throw createError('Model output did not contain a valid placement array', 500);
};

const normalizeExistingObjects = (existingObjects = []) => {
  return existingObjects
    .map((item) => {
      const position = normalizeVector(item?.position);
      if (!position) return null;

      const bounds = item?.bounds && typeof item.bounds === 'object'
        ? {
            x: Number.isFinite(Number(item.bounds.x)) ? Number(item.bounds.x) : 0,
            y: Number.isFinite(Number(item.bounds.y)) ? Number(item.bounds.y) : 0,
            z: Number.isFinite(Number(item.bounds.z)) ? Number(item.bounds.z) : 0
          }
        : { x: 0, y: 0, z: 0 };

      return {
        name: String(item?.name || ''),
        position,
        bounds
      };
    })
    .filter(Boolean);
};

const overlapsWithExistingFurniture = (candidate, existingObject) => {
  const halfX = (existingObject.bounds.x || 0) / 2 + DEFAULT_OBJECT_RADIUS;
  const halfY = (existingObject.bounds.y || 0) / 2 + DEFAULT_OBJECT_RADIUS;
  const halfZ = (existingObject.bounds.z || 0) / 2 + DEFAULT_OBJECT_RADIUS;

  const dx = Math.abs(candidate.x - existingObject.position.x);
  const dy = Math.abs(candidate.y - existingObject.position.y);
  const dz = Math.abs(candidate.z - existingObject.position.z);

  return dx <= halfX && dy <= halfY && dz <= halfZ;
};

const normalizeAndSanitizePlacements = ({
  rawOutput,
  objectsToPlace = [],
  sceneInventory = {},
  intensity = 0
}) => {
  const modelPlacements = extractPlacementArray(rawOutput);
  const roomBounds = normalizeRoomBounds(sceneInventory.roomBounds || {});
  const existingObjects = normalizeExistingObjects(sceneInventory.existingObjects || []);
  const minDistanceFromPlayer = Math.max(0.5, 1.5 - Number(intensity || 0));

  const candidateById = new Map();
  modelPlacements.forEach((item, index) => {
    if (!item || typeof item !== 'object') return;
    const modelId = item.id != null ? String(item.id) : null;
    if (modelId && !candidateById.has(modelId)) {
      candidateById.set(modelId, item);
      return;
    }
    candidateById.set(`index_${index}`, item);
  });

  const accepted = [];

  objectsToPlace.forEach((inputObject, index) => {
    if (!inputObject || typeof inputObject !== 'object') return;

    const id = inputObject.id != null ? String(inputObject.id) : null;
    const type = inputObject.type != null ? String(inputObject.type) : null;
    if (!id || !type) {
      return;
    }

    const rawPlacement = candidateById.get(id) || candidateById.get(`index_${index}`);
    if (!rawPlacement || typeof rawPlacement !== 'object') {
      return;
    }

    const position = normalizeVector(rawPlacement.position);
    if (!position) {
      return;
    }

    const clampedPosition = {
      x: clamp(position.x, roomBounds.minX, roomBounds.maxX),
      y: clamp(position.y, roomBounds.minY, roomBounds.maxY),
      z: clamp(position.z, roomBounds.minZ, roomBounds.maxZ)
    };

    if (vectorDistance(clampedPosition, PLAYER_START) < minDistanceFromPlayer) {
      return;
    }

    const tooCloseToPlaced = accepted.some(
      (placed) => vectorDistance(clampedPosition, placed.position) < MIN_PLACEMENT_SPACING
    );
    if (tooCloseToPlaced) {
      return;
    }

    const overlapsFurniture = existingObjects.some((existingObject) => overlapsWithExistingFurniture(clampedPosition, existingObject));
    if (overlapsFurniture) {
      return;
    }

    const rotation = normalizeVector(rawPlacement.rotation) || { x: 0, y: 0, z: 0 };
    const surface = String(rawPlacement.surface || '').toLowerCase();

    accepted.push({
      id,
      type,
      position: clampedPosition,
      rotation,
      surface: ALLOWED_SURFACES.has(surface) ? surface : 'floor',
      reasoning:
        typeof rawPlacement.reasoning === 'string' && rawPlacement.reasoning.trim()
          ? rawPlacement.reasoning.slice(0, 200)
          : 'Placement satisfies room and spacing constraints'
    });
  });

  return accepted;
};

module.exports = {
  extractPlacementArray,
  normalizeAndSanitizePlacements,
  normalizeRoomBounds
};
