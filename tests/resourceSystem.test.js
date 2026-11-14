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

test('water calculations strictly adhere to 3.5 L/person-day gross and 3.6 L/day net for 4 crew at 90% recovery', () => {
  const needs = getDailyResourceNeeds({
    crew: 4,
    difficulty: 'Standard',
    recyclerEfficiency: 0.9,
    modelParameters: {
      grossWaterLitersPerPersonDay: 3.5,
      recyclerEfficiency: 0.9
    }
  });

  // Gross water for 4 crew: 4 * 3.5 = 14.0 L/day
  assert.equal(needs.waterGross, 14.0);

  // Net water make-up: 4 * (3.5 * (1 - 0.9) + 0.55) = 4 * (0.35 + 0.55) = 4 * 0.90 = 3.6 L/day
  assert.equal(Math.round(needs.water * 10) / 10, 3.6);

  // Must NOT be based on an unverified 2.5 L/person/day claim
  assert.notEqual(needs.waterGross, 10.0);
});
