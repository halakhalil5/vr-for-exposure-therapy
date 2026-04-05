const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeAndSanitizePlacements } = require('../services/placementNormalizer');

const baseSceneInventory = {
  existingObjects: [
    {
      name: 'Couch',
      position: { x: 1.5, y: 0.5, z: 1.0 },
      bounds: { x: 2.0, y: 1.0, z: 0.9 }
    }
  ],
  roomBounds: {
    minX: -4,
    maxX: 4,
    minZ: -4,
    maxZ: 4,
    floorY: 0,
    ceilingY: 3
  }
};

test('normalizes direct array output', () => {
  const objectsToPlace = [
    { id: 'spider_1', type: 'spider_myoldone' }
  ];

  const rawOutput = [
    {
      id: 'spider_1',
      type: 'spider_myoldone',
      position: { x: 0.8, y: 1.7, z: 1.9 },
      rotation: { x: 0, y: 180, z: 0 },
      surface: 'wall',
      reasoning: 'Visible placement'
    }
  ];

  const result = normalizeAndSanitizePlacements({
    rawOutput,
    objectsToPlace,
    sceneInventory: baseSceneInventory,
    intensity: 0.8
  });

  assert.equal(Array.isArray(result), true);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'spider_1');
  assert.equal(result[0].type, 'spider_myoldone');
  assert.equal(typeof result[0].position.x, 'number');
  assert.equal(typeof result[0].rotation.y, 'number');
});

test('normalizes wrapped placements object output', () => {
  const objectsToPlace = [
    { id: 'spider_1', type: 'spider_myoldone' }
  ];

  const rawOutput = {
    placements: [
      {
        id: 'spider_1',
        type: 'ignored_model_type',
        position: { x: 10, y: 99, z: -10 },
        surface: 'floor',
        reasoning: 'Out of bounds test'
      }
    ]
  };

  const result = normalizeAndSanitizePlacements({
    rawOutput,
    objectsToPlace,
    sceneInventory: baseSceneInventory,
    intensity: 0.2
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'spider_1');
  assert.equal(result[0].type, 'spider_myoldone');
  assert.equal(result[0].position.x <= 4, true);
  assert.equal(result[0].position.z >= -4, true);
  assert.deepEqual(result[0].rotation, { x: 0, y: 0, z: 0 });
});
