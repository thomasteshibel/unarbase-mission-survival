const UNITS = {
  pa: { dimension: 'pressure', scale: 0.001, offset: 0 },
  kpa: { dimension: 'pressure', scale: 1, offset: 0 },
  bar: { dimension: 'pressure', scale: 100, offset: 0 },
  k: { dimension: 'temperature', scale: 1, offset: 0 },
  c: { dimension: 'temperature', scale: 1, offset: 273.15 },
  '°c': { dimension: 'temperature', scale: 1, offset: 273.15 },
  f: { dimension: 'temperature', scale: 5 / 9, offset: 255.3722222222 },
  '°f': { dimension: 'temperature', scale: 5 / 9, offset: 255.3722222222 },
  ml: { dimension: 'volume', scale: 0.001, offset: 0 },
  l: { dimension: 'volume', scale: 1, offset: 0 },
  m3: { dimension: 'volume', scale: 1000, offset: 0 },
  'm³': { dimension: 'volume', scale: 1000, offset: 0 },
  g: { dimension: 'mass', scale: 0.001, offset: 0 },
  kg: { dimension: 'mass', scale: 1, offset: 0 },
  w: { dimension: 'power', scale: 0.001, offset: 0 },
  kw: { dimension: 'power', scale: 1, offset: 0 },
  wh: { dimension: 'energy', scale: 0.001, offset: 0 },
  kwh: { dimension: 'energy', scale: 1, offset: 0 }
};

function getUnit(unit) {
  const normalized = String(unit).trim().toLowerCase();
  const definition = UNITS[normalized];
  if (!definition) {
    throw new Error(`Unsupported unit: ${unit}`);
  }
  return definition;
}

export function convertMeasurement(value, sourceUnit, targetUnit) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    throw new TypeError('Measurement value must be finite.');
  }
  const source = getUnit(sourceUnit);
  const target = getUnit(targetUnit);
  if (source.dimension !== target.dimension) {
    throw new Error(`Cannot convert ${sourceUnit} to ${targetUnit}: dimensions differ.`);
  }
  const baseValue = numericValue * source.scale + source.offset;
  return (baseValue - target.offset) / target.scale;
}
