import assert from 'node:assert/strict';
import test from 'node:test';
import { generateRadiationState, resolveRadiationDecision } from '../src/simulation/radiationSystem.js';

test('radiation system creates a valid severity band', () => {
  const state = generateRadiationState(3, 'Standard');
  assert.ok(state.level >= 0);
  assert.ok(state.level <= 100);
  assert.ok(['Normal', 'Warning', 'Solar Event'].includes(state.status));
});

test('radiation system reduces risk after a shelter decision', () => {
  const result = resolveRadiationDecision({ level: 60, status: 'Warning', message: 'Warning' }, 'shelter');
  assert.ok(result.level < 60);
});
