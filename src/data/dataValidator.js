const RESOURCE_KEYS = ['oxygen', 'water', 'food', 'power', 'battery'];

export const MODEL_PARAMETER_RANGES = Object.freeze({
  oxygenLitersPerPersonDay: { min: 100, max: 1200 },
  grossWaterLitersPerPersonDay: { min: 0.5, max: 15 },
  foodKgPerPersonDay: { min: 0.1, max: 3 },
  basePowerKWhPerDay: { min: 1, max: 500 },
  solarGenerationKWhPerDay: { min: 0, max: 600 },
  recyclerEfficiency: { min: 0, max: 0.98 }
});

export const RESOURCE_CAPACITIES = Object.freeze({
  oxygen: 100000,
  water: 10000,
  food: 1000,
  power: 600,
  battery: 300
});

export function validateModelParameters(parameters) {
  if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) {
    throw new TypeError('Simulation model parameters must be an object.');
  }
  for (const [key, { min, max }] of Object.entries(MODEL_PARAMETER_RANGES)) {
    const value = Number(parameters[key]);
    if (!Number.isFinite(value) || value < min || value > max) {
      throw new RangeError(`${key} must be a finite value between ${min} and ${max}.`);
    }
  }
  return parameters;
}

export function validateInitialResources(resources) {
  if (!resources || typeof resources !== 'object' || Array.isArray(resources)) {
    throw new TypeError('Starting resource inventories must be an object.');
  }
  for (const key of RESOURCE_KEYS) {
    const value = Number(resources[key]);
    if (!Number.isFinite(value) || value < 0 || value > RESOURCE_CAPACITIES[key]) {
      throw new RangeError(`Starting ${key} inventory must be between 0 and ${RESOURCE_CAPACITIES[key]}.`);
    }
  }
  return resources;
}

export function validateMissionState(mission) {
  if (!mission || typeof mission !== 'object') {
    throw new TypeError('Mission state must be an object.');
  }

  for (const key of RESOURCE_KEYS) {
    const value = Number(mission.resources?.[key]);
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`Mission resource "${key}" must be a finite, non-negative number.`);
    }
  }

  if (!Number.isInteger(mission.day) || !Number.isInteger(mission.duration) || mission.day < 1 || mission.day > mission.duration) {
    throw new RangeError('Mission day must be an integer within the configured mission duration.');
  }

  if (!['briefing', 'operations', 'complete'].includes(mission.operationStage)) {
    throw new RangeError('Mission operation stage must be briefing, operations, or complete.');
  }
  if (typeof mission.paused !== 'boolean') {
    throw new TypeError('Mission paused state must be a boolean.');
  }
  if (!Number.isInteger(mission.scenarioSeed) || mission.scenarioSeed < 0 || mission.scenarioSeed > 0xffffffff) {
    throw new RangeError('Mission scenario seed must be an unsigned 32-bit integer.');
  }
  if (
    !Array.isArray(mission.scenarioSchedule) ||
    mission.scenarioSchedule.length !== 7 ||
    mission.scenarioSchedule.some((scenario, index) =>
      scenario?.day !== index + 1 || typeof scenario.id !== 'string' || typeof scenario.trigger !== 'string'
    )
  ) {
    throw new RangeError('Mission scenario schedule must contain seven ordered, described day entries.');
  }

  if (!Array.isArray(mission.astronauts) || mission.astronauts.length !== mission.crew) {
    throw new RangeError('Mission crew roster must match the configured crew count.');
  }

  return mission;
}

export function validateExternalDataset(dataset) {
  if (!dataset || typeof dataset !== 'object' || Array.isArray(dataset)) {
    throw new TypeError('External dataset metadata must be an object.');
  }

  const requiredFields = [
    'datasetName',
    'source',
    'sourceUrl',
    'units',
    'collectionPeriod',
    'spatialApplicability',
    'limitations',
    'measurements'
  ];
  const missingFields = requiredFields.filter((field) => dataset[field] === undefined || dataset[field] === null || dataset[field] === '');
  if (missingFields.length > 0) {
    throw new Error(`External dataset is missing required validation metadata: ${missingFields.join(', ')}.`);
  }
  if (dataset.verified !== true) {
    throw new Error('External data must be explicitly verified before it can be adapted.');
  }
  if (!/^https:\/\//i.test(dataset.sourceUrl)) {
    throw new Error('External dataset source URL must use HTTPS.');
  }
  if (typeof dataset.units !== 'object' || Array.isArray(dataset.units) || typeof dataset.measurements !== 'object' || Array.isArray(dataset.measurements)) {
    throw new TypeError('External dataset units and measurements must be keyed objects.');
  }
  if (typeof dataset.collectionPeriod !== 'string' || typeof dataset.spatialApplicability !== 'string' || typeof dataset.limitations !== 'string') {
    throw new TypeError('Collection period, spatial applicability, and limitations must be documented as text.');
  }
  return dataset;
}

export function clampResource(value, maximum = Number.POSITIVE_INFINITY) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    throw new TypeError('Resource values must be finite numbers.');
  }
  return Math.min(maximum, Math.max(0, numericValue));
}
