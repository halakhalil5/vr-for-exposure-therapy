const test = require('node:test');
const assert = require('node:assert/strict');

const { mapIntensity } = require('../services/unityService');

test('maps zero intensity to 0.0 on any scale', () => {
  assert.equal(mapIntensity(0, 5), 0.0);
  assert.equal(mapIntensity(0, 10), 0.0);
});

test('maps scene builder levels on a 1-5 scale', () => {
  assert.equal(mapIntensity(1, 5), 0.0);
  assert.equal(mapIntensity(2, 5), 0.25);
  assert.equal(mapIntensity(3, 5), 0.5);
  assert.equal(mapIntensity(4, 5), 0.75);
  assert.equal(mapIntensity(5, 5), 1.0);
});

test('maps session levels on a 1-10 scale', () => {
  assert.equal(mapIntensity(1, 10), 0.0);
  assert.equal(mapIntensity(5, 10), 0.4444444444444444);
  assert.equal(mapIntensity(10, 10), 1.0);
});
