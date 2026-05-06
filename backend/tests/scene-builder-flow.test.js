const test = require('node:test');
const assert = require('node:assert/strict');

test('scene builder actual flow: frontend sends 2, should normalize to 0.25', () => {
  // Simulate the backend flow when /build-scene is called with intensity: 2
  const { mapIntensity } = require('../services/unityService');
  
  // Step 1: Frontend sends intensity 2
  const frontendPayload = {
    environment: 'bedroom',
    intensity: 2,
    patientId: '69cd92d57b2cb00d9119c783',
    patientName: 'Jana Maher',
    phobia: 'arachnophobia'
  };
  
  // Step 2: Backend receives and processes (like in buildScene controller)
  let sessionIntensity = Number(frontendPayload.intensity); // 2
  sessionIntensity = parseFloat(sessionIntensity.toFixed(1)); // 2.0
  
  // Step 3: Create unitySceneConfig (this is what gets passed to sendSceneToUnity as sceneJSON param)
  const unitySceneConfig = {
    environment: frontendPayload.environment,
    description: '',
    patientId: frontendPayload.patientId,
    patientName: frontendPayload.patientName,
    phobia: frontendPayload.phobia,
    intensity: sessionIntensity  // Raw 2 stored here
  };
  
  // Step 4: sendSceneToUnity is called with:
  // sceneJSON = unitySceneConfig
  // intensity = sessionIntensity (2)
  // maxIntensity = 5  (scene builder uses 1-5 scale)
  
  // Step 5: buildSceneRequest normalizes it
  const maxIntensity = 5;
  const intensityFloat = mapIntensity(sessionIntensity, maxIntensity);
  
  const finalPayload = {
    environment: frontendPayload.environment,
    freeText: '',
    intensity: intensityFloat,  // <-- Should be 0.25
    patientId: frontendPayload.patientId,
    patientName: frontendPayload.patientName,
    phobia: frontendPayload.phobia
  };
  
  console.log('\n📊 Scene Builder Flow Test (intensity 2):');
  console.log('Frontend sends:', JSON.stringify({intensity: frontendPayload.intensity}));
  console.log('Backend normalizes with maxIntensity=5');
  console.log('Final payload to Unity:', JSON.stringify(finalPayload, null, 2));
  
  assert.equal(intensityFloat, 0.25, 'intensity should be normalized to 0.25');
  assert.equal(finalPayload.intensity, 0.25);
});
