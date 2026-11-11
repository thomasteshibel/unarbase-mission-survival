import { convertMeasurement } from './unitConverter.js';

export function normalizeMeasurements(measurements, sourceUnits, targetUnits) {
  if (!measurements || typeof measurements !== 'object' || Array.isArray(measurements)) {
    throw new TypeError('Measurements must be provided as a keyed object.');
  }
  if (!sourceUnits || typeof sourceUnits !== 'object' || !targetUnits || typeof targetUnits !== 'object') {
    throw new TypeError('Source units and target units must be keyed objects.');
  }

  const values = {};
  const units = {};
  for (const [key, targetUnit] of Object.entries(targetUnits)) {
    if (!Object.hasOwn(measurements, key) || !Object.hasOwn(sourceUnits, key)) {
      throw new Error(`Measurement "${key}" or its source unit is missing.`);
    }
    values[key] = convertMeasurement(measurements[key], sourceUnits[key], targetUnit);
    units[key] = targetUnit;
  }
  return { measurements: values, units };
}
