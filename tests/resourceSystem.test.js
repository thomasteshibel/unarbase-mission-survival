import assert from 'node:assert/strict';
import test from 'node:test';
import { applyDailyResources, createInitialResources, getDailyResourceNeeds } from '../src/simulation/resourceSystem.js';

test('resource system creates initial resources using configured values', () => {
  const resources = createInitialResources({ initialResources: { oxygen: 1000, water: 500, food: 600, power: 300, battery: 200 } });
  assert.deepEqual(resources, { oxygen: 1000, water: 500, food: 600, power: 300, battery: 200 });
});

test('resource system calculates daily needs for a crew and day', () => {
  const needs = getDailyResourceNeeds({ crew: 4, difficulty: 'Standard', day: 2 });
  assert.ok(needs.oxygen > 0);
  assert.ok(needs.water > 0);
  assert.ok(needs.food > 0);
  assert.ok(needs.powerDemand > 0);
});

test('resource system ensures values stay above zero after daily usage', () => {
  const resources = { oxygen: 100, water: 100, food: 100, power: 40, battery: 30 };
  const next = applyDailyResources(resources, { crew: 4, difficulty: 'Standard', day: 3 });
  assert.ok(next.oxygen >= 0);
  assert.ok(next.water >= 0);
  assert.ok(next.food >= 0);
  assert.ok(next.power >= 0);
});
