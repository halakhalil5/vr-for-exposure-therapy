const test = require('node:test');
const assert = require('node:assert/strict');

test('buildSceneRequest creates correct Unity payload', () => {
  // Import the internal function
  const { mapIntensity } = require('../services/unityService');
  
  // Simulate what happens in buildSceneRequest
  const sceneJSON = {
    environment: 'bedroom',
    description: 'add one spider'
  };
  
  const intensity = 1;
  const sceneDescription = 'add one spider';
  const maxIntensity = 5; // Scene builder uses 1-5 scale
  
  // This mimics buildSceneRequest logic
  const intensityFloat = mapIntensity(intensity, maxIntensity);
  
  const payload = {
    environment: sceneJSON.environment,
    freeText: sceneDescription,
    intensity: intensityFloat,
    patientId: '69cd92d57b2cb00d9119c783',
    patientName: 'Jana Maher',
    phobia: 'arachnophobia'
  };
  
  console.log('\n🧾 Unity Payload (intensity=1, maxLevel=5):');
  console.log(JSON.stringify(payload, null, 2));
  
  assert.equal(payload.intensity, 0);
  assert.equal(typeof payload.intensity, 'number');
});

test('buildSceneRequest with intensity 3 maps to 0.5', () => {
  const { mapIntensity } = require('../services/unityService');
  
  const intensity = 3;
  const maxIntensity = 5;
  const intensityFloat = mapIntensity(intensity, maxIntensity);
  
  const payload = {
    environment: 'bedroom',
    freeText: 'moderate exposure',
    intensity: intensityFloat,
    patientId: '69cd92d57b2cb00d9119c783',
    patientName: 'Jana Maher',
    phobia: 'arachnophobia'
  };
  
  console.log('\n🧾 Unity Payload (intensity=3, maxLevel=5):');
  console.log(JSON.stringify(payload, null, 2));
  
  assert.equal(payload.intensity, 0.5);
});
