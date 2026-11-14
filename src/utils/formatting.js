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

export function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}
