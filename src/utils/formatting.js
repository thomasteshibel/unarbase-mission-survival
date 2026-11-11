export function getDayLabel(day) {
  return `Day ${day}`;
}

export function addMissionLog(log, update) {
  return [...log, update];
}

export function formatResourceValue(value, unit = '') {
  const number = Number(value ?? 0);
  return `${Math.round(number)}${unit}`;
}
