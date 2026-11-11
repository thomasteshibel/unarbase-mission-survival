import assert from 'node:assert/strict';
import test from 'node:test';
import { DATA_MODES, getActiveDataSet, isNASADataModeAvailable, setDataMode } from '../src/data/dataConfig.js';
import { normalizeMeasurements } from '../src/data/dataNormalizer.js';
import { getScenarioForDay, generateMissionConditions } from '../src/data/simulationDataGenerator.js';
import { adaptNASAData } from '../src/data/nasaDataAdapter.js';
import { getDailyResourceNeeds, applyDailyResources } from '../src/simulation/resourceSystem.js';
import { createEmergencyEvent } from '../src/simulation/emergencySystem.js';

test('daily scenario generation is deterministic and identifies assumptions', () => {
  const first = generateMissionConditions(2, 'Standard');
  const replay = generateMissionConditions(2, 'Standard');
  assert.deepEqual(first, replay);
  assert.equal(first.scenario.id, 'reduced-solar');
  assert.equal(first.scenario.durationDays, 1);
  assert.match(first.scenario.trigger, /62%/);
  assert.ok(first.solarGeneration > 0 && first.solarGeneration < 105);
});

test('resource needs use consistent crew-day units and respond to activity and recovery', () => {
  const nominal = getDailyResourceNeeds({ crew: 4, difficulty: 'Standard' });
  const quiet = getDailyResourceNeeds({ crew: 4, activityFactor: 0.5 });
  const poorRecovery = getDailyResourceNeeds({ crew: 4, recyclerEfficiency: 0.45 });
  assert.equal(nominal.oxygen, 2352);
  assert.equal(nominal.food, 2.48);
  assert.ok(quiet.oxygen < nominal.oxygen);
  assert.ok(poorRecovery.water > nominal.water);
});

test('resource stocks remain non-negative during a high-demand, low-solar period', () => {
  const next = applyDailyResources(
    { oxygen: 10, water: 1, food: 1, power: 0, battery: 0 },
    { crew: 4, difficulty: 'High Risk', conditions: { solarGeneration: 0, recyclerEfficiency: 0.45, oxygenLeakFraction: 0.2 } }
  );
  for (const value of Object.values(next)) {
    assert.ok(Number.isFinite(value));
    assert.ok(value >= 0);
  }
});

test('NASA data mode remains unavailable until verified data is configured', () => {
  assert.equal(isNASADataModeAvailable(), false);
  assert.match(getActiveDataSet().label, /SIMULATED DATA — NOT LIVE NASA DATA/);
  assert.equal(setDataMode(DATA_MODES.SIMULATION_MODE), DATA_MODES.SIMULATION_MODE);
  assert.throws(() => setDataMode(DATA_MODES.NASA_DATA_MODE), /no verified, compatible external dataset/);
});

test('external data requires provenance and explicit verification before adaptation', () => {
  const unverified = {
    datasetName: 'Example',
    source: 'Example source',
    sourceUrl: 'https://example.invalid/data',
    units: { temperature: 'K' },
    collectionPeriod: 'illustrative test period',
    spatialApplicability: 'test only',
    limitations: 'not real data',
    measurements: { temperature: 293.15 },
    verified: false
  };
  assert.throws(() => adaptNASAData(unverified), /explicitly verified/);
  assert.throws(() => adaptNASAData({ ...unverified, verified: true, sourceUrl: 'http://example.invalid' }), /HTTPS/);
});

test('verified external metadata is preserved without fabricating a source', () => {
  const dataset = {
    datasetName: 'Local adapter fixture',
    source: 'Test fixture supplied by the test',
    sourceUrl: 'https://example.invalid/test-fixture',
    units: { pressure: 'Pa' },
    collectionPeriod: 'test only',
    spatialApplicability: 'test fixture; no real geographic applicability',
    limitations: 'not a real or external dataset',
    measurements: { pressure: 101325 },
    verified: true
  };
  const adapted = adaptNASAData(dataset);
  assert.equal(adapted.measurements.pressure, 101325);
  assert.equal(adapted.sourceUrl, dataset.sourceUrl);
  assert.deepEqual(adapted.units, dataset.units);
});

test('unit conversion and normalization preserve measurement meaning', () => {
  const normalized = normalizeMeasurements(
    { pressure: 101325, temperature: 293.15 },
    { pressure: 'Pa', temperature: 'K' },
    { pressure: 'kPa', temperature: '°C' }
  );
  assert.equal(normalized.measurements.pressure, 101.325);
  assert.ok(Math.abs(normalized.measurements.temperature - 20) < 1e-8);
  assert.deepEqual(normalized.units, { pressure: 'kPa', temperature: '°C' });
});

test('emergency event selection is repeatable and tied to a scenario trigger', () => {
  const first = createEmergencyEvent(2, 'Standard');
  const replay = createEmergencyEvent(2, 'Standard');
  assert.deepEqual(first, replay);
  assert.equal(first.scenarioId, getScenarioForDay(2).id);
  assert.match(first.trigger, /62%/);
});
