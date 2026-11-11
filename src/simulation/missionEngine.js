import { DEFAULT_CONFIG, MISSION_DIFFICULTIES, SIMULATION_PROFILE } from '../data/simulationConfig.js';
import { getMissionData } from '../data/simulationDataProvider.js';
import { clampResource, validateMissionState } from '../data/dataValidator.js';
import { addMissionLog, getDayLabel } from '../utils/formatting.js';
import { applyDailyResources, createInitialResources, getDailyResourceNeeds } from './resourceSystem.js';
import { createEmergencyEvent, resolveEmergencyDecision } from './emergencySystem.js';
import { resolveRadiationDecision } from './radiationSystem.js';

export const DAILY_DECISIONS = [
  {
    id: 'normal',
    label: 'Normal operations',
    description: 'Maintain the nominal activity and electrical-load plan.',
    activityFactor: 1,
    waterUseFactor: 1,
    powerDemandFactor: 1
  },
  {
    id: 'oxygen-conserve',
    label: 'Oxygen conservation',
    description: 'Limit nonessential movement; modeled metabolic oxygen demand falls with activity.',
    activityFactor: 0.78,
    waterUseFactor: 1,
    powerDemandFactor: 0.9
  },
  {
    id: 'power-priority',
    label: 'Power priority',
    description: 'Defer noncritical tasks to reduce electrical demand and crew activity.',
    activityFactor: 0.82,
    waterUseFactor: 1,
    powerDemandFactor: 0.78
  },
  {
    id: 'water-ration',
    label: 'Water rationing',
    description: 'Reduce modeled nonessential water use by 35%; hygiene and drinking needs remain.',
    activityFactor: 1,
    waterUseFactor: 0.65,
    powerDemandFactor: 1
  },
  {
    id: 'radiation-shelter',
    label: 'Radiation shelter protocol',
    description: 'Pause external activity and use the shielded area; electrical demand rises slightly.',
    activityFactor: 0.68,
    waterUseFactor: 1,
    powerDemandFactor: 1.08,
    radiationReduction: 52
  },
  {
    id: 'crew-rest',
    label: 'Crew rest cycle',
    description: 'Reduce activity and recover from fatigue; science tasks are deferred.',
    activityFactor: 0.72,
    waterUseFactor: 1,
    powerDemandFactor: 0.82,
    fatigueRecovery: 12
  }
];

const PHASES = ['Ready', 'Progressing', 'Alert', 'Critical', 'Complete'];
const SYSTEM_OVERRIDE_KEYS = new Set([
  'solarGenerationFactor',
  'recyclerEfficiencyOverride',
  'oxygenLeakFraction',
  'batteryDischargeFactor',
  'batteryCapacityFactor',
  'communicationsOverride'
]);

export function createAstronautRoster(count = 4) {
  if (!Number.isInteger(count) || count < 1 || count > 4) {
    throw new RangeError('Crew size must be an integer from 1 to 4.');
  }
  return SIMULATION_PROFILE.astronauts
    .map((astronaut) => ({ ...astronaut, health: 100, fatigue: 12, status: 'Ready' }))
    .slice(0, count);
}

function getConditions(mission, day = mission.day) {
  return getMissionData(day, mission.difficulty, {
    ...mission.systems,
    ...mission.conditionOverrides
  });
}

function applyConditionOverrides(mission) {
  const conditions = getConditions(mission);
  if (mission.conditionOverrides.radiationReduction) {
    conditions.radiation = resolveRadiationDecision(
      conditions.radiation,
      mission.conditionOverrides.radiationReduction >= 42 ? 'shelter' : 'reduceOperations'
    );
    conditions.radiation.level = Math.max(
      0,
      conditions.radiation.level - Math.max(0, mission.conditionOverrides.radiationReduction - (mission.conditionOverrides.radiationReduction >= 42 ? 42 : 25))
    );
  }
  mission.conditions = conditions;
  mission.radiation = { ...conditions.radiation };
}

function recordHistory(mission, needs = null, startingResources = mission.resources) {
  mission.history.push({
    day: mission.day,
    label: needs ? `${getDayLabel(mission.day)} end` : 'Mission start',
    scenarioTitle: mission.conditions.scenario.title,
    oxygen: mission.resources.oxygen,
    water: mission.resources.water,
    food: mission.resources.food,
    power: mission.resources.power,
    battery: mission.resources.battery,
    radiationIndex: mission.radiation.level,
    solarGeneration: needs?.solarGeneration ?? mission.conditions.solarGeneration,
    oxygenUse: needs ? needs.oxygen + startingResources.oxygen * needs.oxygenLeakFraction : null,
    waterMakeup: needs?.water ?? null,
    foodUse: needs?.food ?? null,
    powerDemand: needs?.powerDemand ?? null,
    surfaceTemperatureC: mission.conditions.environment.surfaceTemperatureC,
    averageCrewHealth: averageCrewValue(mission.astronauts, 'health')
  });
}

function averageCrewValue(astronauts, key) {
  if (astronauts.length === 0) return 0;
  return astronauts.reduce((total, astronaut) => total + astronaut[key], 0) / astronauts.length;
}

export function createMission(config = DEFAULT_CONFIG) {
  const duration = Number(config.days ?? 7);
  const crew = Number(config.crew ?? 4);
  const difficulty = config.difficulty ?? 'Standard';
  if (!Number.isInteger(duration) || duration < 1 || duration > 7) {
    throw new RangeError('Mission duration must be an integer from 1 to 7 days.');
  }
  if (!Number.isInteger(crew) || crew < 1 || crew > 4) {
    throw new RangeError('Crew size must be an integer from 1 to 4.');
  }
  if (!MISSION_DIFFICULTIES.includes(difficulty)) {
    throw new RangeError(`Unsupported mission difficulty: ${difficulty}`);
  }
  const mission = {
    simulationVersion: 2,
    day: 1,
    duration,
    crew,
    difficulty,
    status: 'active',
    phase: 'Ready',
    paused: false,
    astronauts: createAstronautRoster(crew),
    resources: createInitialResources(config),
    initialResources: createInitialResources(config),
    systems: {
      ...SIMULATION_PROFILE.mission.equipment,
      recyclerEfficiency: 0.9,
      habitatPressureKPa: 101.3,
      cabinTemperatureC: 21
    },
    conditionOverrides: {},
    emergency: null,
    decisions: [],
    log: ['Mission control confirms a four-system habitat checkout. All values are simulated educational estimates.'],
    score: 0,
    responsePenalties: 0,
    radiationPenaltyTotal: 0,
    report: null,
    conditions: null,
    radiation: null,
    history: [],
    timeline: [{ day: 1, title: 'Mission launched', detail: 'Habitat systems online; crew briefing complete.' }]
  };
  applyConditionOverrides(mission);
  mission.emergency = createEmergencyEvent(1, mission.difficulty);
  recordHistory(mission);
  mission.phase = getMissionPhase(mission);
  return validateMissionState(mission);
}

export function getMissionPhase(mission) {
  if (mission.status === 'complete') return PHASES[4];
  if (
    mission.resources.oxygen <= 4000 ||
    mission.resources.water <= 15 ||
    mission.resources.food <= 3 ||
    mission.resources.power <= 75 ||
    mission.resources.battery <= 30 ||
    averageCrewValue(mission.astronauts, 'health') < 55
  ) {
    return PHASES[3];
  }
  if (mission.radiation?.level >= 60 || mission.emergency) return PHASES[2];
  if (mission.day > 1) return PHASES[1];
  return PHASES[0];
}

export function resolveEmergencyChoice(mission, optionId) {
  if (!mission.emergency) return mission;

  const result = resolveEmergencyDecision(mission.emergency, optionId);
  if (!result.valid) {
    throw new Error(result.message);
  }

  for (const [key, delta] of Object.entries(result.resourceDelta)) {
    if (Object.hasOwn(mission.resources, key)) {
      mission.resources[key] = clampResource(Number(mission.resources[key]) + Number(delta));
    }
  }
  for (const [key, value] of Object.entries(result.systemDelta)) {
    if (key === 'radiationReduction' || SYSTEM_OVERRIDE_KEYS.has(key)) {
      mission.conditionOverrides[key] = value;
    } else {
      mission.systems[key] = value;
    }
  }
  mission.score = Math.max(0, mission.score + (result.missionDelta.score ?? 0));
  mission.responsePenalties += Math.max(0, -(result.missionDelta.score ?? 0));
  mission.log = addMissionLog(mission.log, `${result.label}: ${result.message}`);
  mission.timeline.push({ day: mission.day, title: result.label, detail: result.message });
  mission.emergency = null;
  applyConditionOverrides(mission);
  mission.phase = getMissionPhase(mission);
  return mission;
}

export function advanceMission(mission, decisionId = 'normal') {
  if (mission.status === 'complete' || mission.status === 'failed') return mission;
  if (mission.emergency) {
    throw new Error('Resolve the active mission scenario before advancing the day.');
  }

  const decision = DAILY_DECISIONS.find((item) => item.id === decisionId) ?? DAILY_DECISIONS[0];
  const fatigueFactor = 1 + averageCrewValue(mission.astronauts, 'fatigue') / 400;
  const effectiveActivityFactor = decision.activityFactor * fatigueFactor;
  const needs = getDailyResourceNeeds({
    crew: mission.crew,
    difficulty: mission.difficulty,
    activityFactor: effectiveActivityFactor,
    waterUseFactor: decision.waterUseFactor,
    powerDemandFactor: decision.powerDemandFactor,
    recyclerEfficiency: mission.conditions.recyclerEfficiency,
    recyclerPowerDemand: mission.conditions.recyclerPowerDemand,
    oxygenLeakFraction: mission.conditions.oxygenLeakFraction,
    solarGeneration: mission.conditions.solarGeneration
  });
  const startingResources = { ...mission.resources };
  mission.resources = applyDailyResources(mission.resources, {
    crew: mission.crew,
    difficulty: mission.difficulty,
    activityFactor: effectiveActivityFactor,
    waterUseFactor: decision.waterUseFactor,
    powerDemandFactor: decision.powerDemandFactor,
    conditions: mission.conditions
  });
  if (decision.radiationReduction) {
    mission.radiation = resolveRadiationDecision(mission.radiation, decision.radiationReduction >= 42 ? 'shelter' : 'reduceOperations');
    const additionalReduction = Math.max(0, decision.radiationReduction - (decision.radiationReduction >= 42 ? 42 : 25));
    mission.radiation.level = Math.max(0, mission.radiation.level - additionalReduction);
  }

  const radiationStress = mission.radiation.level >= 70 ? 4 : mission.radiation.level >= 45 ? 2 : 0;
  mission.radiationPenaltyTotal += Math.max(0, mission.radiation.level - 40) * 0.08;
  const resourceStress = Math.min(
    4,
    (mission.resources.oxygen < 4000 ? 2 : 0) +
    (mission.resources.water < 15 ? 1 : 0) +
    (mission.resources.power < 75 ? 1 : 0) +
    (averageCrewValue(mission.astronauts, 'fatigue') >= 70 ? 1 : 0)
  );
  for (const astronaut of mission.astronauts) {
    astronaut.fatigue = clampResource(
      astronaut.fatigue +
      Math.round(4 * decision.activityFactor) +
      mission.conditions.crewFatigueIncrement -
      (decision.fatigueRecovery ?? 0),
      100
    );
    astronaut.health = clampResource(astronaut.health - radiationStress - resourceStress, 100);
    astronaut.status = astronaut.health < 50 ? 'Needs care' : astronaut.health < 80 ? 'Monitoring' : 'Ready';
  }

  mission.decisions.push({
    day: mission.day,
    decision: decision.label,
    scenario: mission.conditions.scenario.id
  });
  mission.log = addMissionLog(
    mission.log,
    `${getDayLabel(mission.day)} complete: ${mission.conditions.scenario.title}; ${decision.label.toLowerCase()} selected.`
  );
  recordHistory(mission, needs, startingResources);
  mission.timeline.push({
    day: mission.day,
    title: `${getDayLabel(mission.day)} complete`,
    detail: `${mission.conditions.scenario.title}. ${decision.label} selected.`
  });

  const missionFailed =
    mission.resources.oxygen <= 0 ||
    mission.resources.water <= 0 ||
    mission.resources.food <= 0 ||
    (mission.resources.power <= 0 && mission.resources.battery <= 0) ||
    mission.astronauts.some((astronaut) => astronaut.health <= 0);
  if (missionFailed) {
    mission.status = 'failed';
    mission.phase = 'Critical';
    mission.score = computeMissionScore(mission);
    mission.report = buildMissionReport(mission, 'Mission Failure');
    return validateMissionState(mission);
  }

  const nextDay = mission.day + 1;
  if (nextDay > mission.duration) {
    mission.status = 'complete';
    mission.phase = 'Complete';
    mission.score = computeMissionScore(mission);
    mission.report = buildMissionReport(mission);
    return validateMissionState(mission);
  }

  mission.day = nextDay;
  mission.conditionOverrides = {};
  applyConditionOverrides(mission);
  mission.emergency = createEmergencyEvent(mission.day, mission.difficulty);
  mission.log = addMissionLog(
    mission.log,
    `${getDayLabel(mission.day)} begins. Scenario trigger: ${mission.conditions.scenario.trigger}`
  );
  mission.phase = getMissionPhase(mission);
  mission.score = computeMissionScore(mission);

  if (
    mission.resources.oxygen <= 0 ||
    mission.resources.water <= 0 ||
    mission.resources.food <= 0 ||
    (mission.resources.power <= 0 && mission.resources.battery <= 0) ||
    mission.astronauts.some((astronaut) => astronaut.health <= 0)
  ) {
    mission.status = 'failed';
    mission.phase = 'Critical';
    mission.report = buildMissionReport(mission, 'Mission Failure');
  }

  return validateMissionState(mission);
}

export function computeMissionScore(mission) {
  const starting = mission.initialResources ?? SIMULATION_PROFILE.mission.initialResources;
  const resourceRatios = ['oxygen', 'water', 'food', 'power'].map((key) => {
    const initial = Math.max(1, Number(starting[key]));
    return Math.min(1, Math.max(0, Number(mission.resources[key]) / initial));
  });
  const resourceHealth = resourceRatios.reduce((sum, ratio) => sum + ratio, 0) / resourceRatios.length;
  const crewHealth = averageCrewValue(mission.astronauts, 'health') / 100;
  return Math.max(0, Math.min(100, Math.round(
    resourceHealth * 70 + crewHealth * 30 - mission.radiationPenaltyTotal - mission.responsePenalties
  )));
}

export function buildMissionReport(mission, overrideStatus = null) {
  const status = overrideStatus ?? (
    mission.score >= 65 ? 'Mission Success' : mission.score >= 42 ? 'Partial Success' : 'Mission Failure'
  );
  const initial = mission.initialResources ?? SIMULATION_PROFILE.mission.initialResources;

  return {
    status,
    duration: mission.duration,
    dayReached: mission.day,
    astronautStatus: mission.astronauts.map(({ name, role, status: crewStatus, health }) => ({
      name, role, status: crewStatus, health
    })),
    totalResourcesConsumed: Object.fromEntries(
      ['oxygen', 'water', 'food', 'power', 'battery'].map((key) => [
        key,
        Math.max(0, Number(initial[key] ?? 0) - Number(mission.resources[key] ?? 0))
      ])
    ),
    remainingResources: { ...mission.resources },
    score: mission.score,
    lessons: status === 'Mission Success'
      ? [
          'The crew balanced life-support demand and energy reserves across changing scenario conditions.',
          'The deterministic event schedule makes cause-and-effect comparisons possible; it is not a forecast.'
        ]
      : status === 'Partial Success'
        ? [
            'The crew completed the scenario, but at least one reserve or health indicator was under pressure.',
            'Compare each response with the scenario trigger and the measured change in resource history.'
          ]
        : [
            'The mission ended after a modeled resource or crew-health limit was reached.',
            'Prioritize essential life support, assess event duration, and conserve resources before they become critical.'
          ],
    dataNotice: SIMULATION_PROFILE.label
  };
}

export function getDailyDecisionOptions() {
  return DAILY_DECISIONS;
}

export function formatMissionForStorage(mission) {
  return {
    ...mission,
    emergency: mission.emergency ? { ...mission.emergency } : null,
    radiation: { ...mission.radiation },
    conditions: mission.conditions ? { ...mission.conditions } : null
  };
}

export { addMissionLog, getDayLabel };
