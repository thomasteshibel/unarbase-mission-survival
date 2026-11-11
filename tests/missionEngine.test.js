import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceMission, createMission, resolveEmergencyChoice } from '../src/simulation/missionEngine.js';

function advanceWithScenarioResponse(mission) {
  if (mission.emergency) {
    resolveEmergencyChoice(mission, mission.emergency.options[0].id);
  }
  return advanceMission(mission, 'normal');
}

test('mission engine creates a valid starting state with four astronauts', () => {
  const mission = createMission({ days: 7, crew: 4, difficulty: 'Standard' });
  assert.equal(mission.day, 1);
  assert.equal(mission.crew, 4);
  assert.equal(mission.astronauts.length, 4);
  assert.equal(mission.status, 'active');
});

test('mission engine advances through multiple days without crashing', () => {
  let mission = createMission({ days: 7, crew: 4, difficulty: 'Standard' });
  for (let idx = 0; idx < 6; idx += 1) {
    mission = advanceWithScenarioResponse(mission);
  }
  assert.equal(mission.day, 7);
  const latest = mission.history.at(-1);
  assert.ok(latest.oxygenUse > 0);
  assert.ok(latest.waterMakeup > 0);
  assert.ok(latest.foodUse > 0);
  assert.ok(latest.solarGeneration > 0);
  assert.ok(latest.powerDemand > 0);
});

test('mission engine marks the mission complete after the final day', () => {
  let mission = createMission({ days: 7, crew: 4, difficulty: 'Standard' });
  for (let idx = 0; idx < 7; idx += 1) {
    mission = advanceWithScenarioResponse(mission);
  }
  assert.equal(mission.status, 'complete');
  assert.ok(mission.report);
});

test('mission scenarios are repeatable and report their trigger and duration', () => {
  const first = createMission({ days: 7, crew: 4, difficulty: 'Standard' });
  const next = advanceWithScenarioResponse(first);
  const repeated = createMission({ days: 7, crew: 4, difficulty: 'Standard' });
  const replay = advanceWithScenarioResponse(repeated);
  assert.equal(next.conditions.scenario.id, 'reduced-solar');
  assert.deepEqual(next.conditions.scenario, replay.conditions.scenario);
  assert.match(next.conditions.scenario.trigger, /62%/);
  assert.equal(next.conditions.scenario.durationDays, 1);
});

test('mission cannot advance past an unresolved active scenario', () => {
  const mission = createMission({ days: 7, crew: 4, difficulty: 'Standard' });
  mission.day = 2;
  mission.emergency = { options: [{ id: 'response' }] };
  assert.throws(() => advanceMission(mission), /Resolve the active mission scenario/);
});

test('high crew fatigue raises modeled oxygen demand and affects the health index', () => {
  const rested = createMission({ days: 3, crew: 4, difficulty: 'Standard' });
  const fatigued = createMission({ days: 3, crew: 4, difficulty: 'Standard' });
  rested.emergency = null;
  fatigued.emergency = null;
  fatigued.astronauts.forEach((astronaut) => { astronaut.fatigue = 80; });

  advanceMission(rested);
  advanceMission(fatigued);

  assert.ok(fatigued.resources.oxygen < rested.resources.oxygen);
  assert.ok(fatigued.astronauts[0].health < rested.astronauts[0].health);
});

test('a solar-array response changes scenario generation and has a measurable cost', () => {
  const mission = advanceWithScenarioResponse(createMission({ days: 7, crew: 4, difficulty: 'Standard' }));
  const reducedGeneration = mission.conditions.solarGeneration;
  const reserveBeforeResponse = mission.resources.power;

  resolveEmergencyChoice(mission, 'inspect-array');

  assert.ok(mission.conditions.solarGeneration > reducedGeneration);
  assert.ok(mission.resources.power < reserveBeforeResponse);
});

test('battery degradation reduces available reserve during the triggered day', () => {
  const mission = createMission({ days: 7, crew: 4, difficulty: 'Standard' });
  while (mission.day < 7) {
    advanceWithScenarioResponse(mission);
  }
  const reserveBeforeDegradation = mission.resources.battery;
  resolveEmergencyChoice(mission, 'monitor-battery');
  advanceMission(mission);
  assert.ok(mission.resources.battery < reserveBeforeDegradation);
  assert.ok(mission.resources.battery <= 210);
});

test('zero critical inventory at mission end produces a failure report', () => {
  const mission = createMission({
    days: 1,
    crew: 4,
    difficulty: 'Standard',
    initialResources: { oxygen: 0, water: 0, food: 0, power: 0, battery: 0 }
  });

  advanceMission(mission);

  assert.equal(mission.status, 'failed');
  assert.equal(mission.report.status, 'Mission Failure');
});

test('mission configuration rejects values outside the supported range', () => {
  assert.throws(() => createMission({ days: 8, crew: 4, difficulty: 'Standard' }), /duration must be an integer/);
  assert.throws(() => createMission({ days: 7, crew: 0, difficulty: 'Standard' }), /Crew size must/);
  assert.throws(() => createMission({ days: 7, crew: 4, difficulty: 'Unknown' }), /Unsupported mission difficulty/);
});
