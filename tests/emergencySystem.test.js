import assert from 'node:assert/strict';
import test from 'node:test';
import { createEmergencyEvent, resolveEmergencyDecision } from '../src/simulation/emergencySystem.js';

test('emergency system creates a valid emergency event', () => {
  const event = createEmergencyEvent(2, 'Standard');
  assert.ok(event.title);
  assert.ok(event.options.length > 0);
});

test('emergency system applies a chosen emergency response with resource consequences', () => {
  const event = createEmergencyEvent(2, 'Standard');
  const result = resolveEmergencyDecision(event, event.options[0].id);
  assert.ok(result.resourceDelta);
  assert.ok(result.message);
});
