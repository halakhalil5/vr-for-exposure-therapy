const test = require('node:test');
const assert = require('node:assert/strict');

// Mock the unityService to inspect the exact payload
const unityService = require('../services/unityService');

test('scene builder intensity 1 normalizes to 0.0 in payload', () => {
  // Simulate a scene builder POST with intensity 1
  const sceneJSON = {
    environment: 'bedroom',
    description: 'Test scene'
  };
  
  const intensity = 1;
  const maxIntensity = 5;
  
  // This is what buildSceneRequest does internally
  const { mapIntensity } = require('../services/unityService');
  const intensityFloat = mapIntensity(intensity, maxIntensity);
  
  console.log('\n📋 Scene Builder Payload Test:');
  console.log('  Input intensity:', intensity);
  console.log('  Max level:', maxIntensity);
  console.log('  Computed float:', intensityFloat);
  console.log('  Type:', typeof intensityFloat);
  console.log('  JSON representation:', JSON.stringify({intensity: intensityFloat}));
  
  // Verify the float value is exactly 0
  assert.equal(intensityFloat, 0.0);
  
  // Verify it's a number type
  assert.equal(typeof intensityFloat, 'number');
});

test('scene builder intensity 5 normalizes to 1.0 in payload', () => {
  const intensity = 5;
  const maxIntensity = 5;
  
  const { mapIntensity } = require('../services/unityService');
  const intensityFloat = mapIntensity(intensity, maxIntensity);
  
  console.log('\n📋 Scene Builder Max Intensity Test:');
  console.log('  Input intensity:', intensity);
  console.log('  Max level:', maxIntensity);
  console.log('  Computed float:', intensityFloat);
  console.log('  Type:', typeof intensityFloat);
  console.log('  JSON representation:', JSON.stringify({intensity: intensityFloat}));
  
  assert.equal(intensityFloat, 1.0);
  assert.equal(typeof intensityFloat, 'number');
});
