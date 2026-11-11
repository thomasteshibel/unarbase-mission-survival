import { validateExternalDataset } from './dataValidator.js';

export function adaptNASAData(dataset) {
  validateExternalDataset(dataset);

  const measurements = {};
  for (const [key, rawValue] of Object.entries(dataset.measurements)) {
    const value = Number(rawValue);
    if (!Number.isFinite(value)) {
      throw new TypeError(`External measurement "${key}" must be a finite number.`);
    }
    measurements[key] = value;
  }
  if (Object.keys(measurements).length === 0) {
    throw new Error('External dataset must contain at least one numeric measurement.');
  }

  return {
    datasetName: dataset.datasetName,
    source: dataset.source,
    sourceUrl: dataset.sourceUrl,
    collectionPeriod: dataset.collectionPeriod,
    spatialApplicability: dataset.spatialApplicability,
    limitations: dataset.limitations,
    units: { ...dataset.units },
    measurements
  };
}
