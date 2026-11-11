const RESOURCE_KEYS = ['oxygen', 'water', 'food', 'power', 'battery'];

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
