import { getMissionData } from '../data/simulationDataProvider.js';

export function generateRadiationState(day = 1, difficulty = 'Standard', equipment = {}) {
  const radiation = getMissionData(day, difficulty, equipment).radiation;
  const status = radiation.level >= 70
    ? 'Solar Event'
    : radiation.level >= 45
      ? 'Warning'
      : 'Normal';

  return {
    ...radiation,
    status,
    message: radiation.message
  };
}

export function resolveRadiationDecision(radiation, choice = 'shelter') {
  const reductions = {
    shelter: 42,
    reduceOperations: 25,
    continue: 0
  };
  const reducedLevel = Math.max(0, Number(radiation.level) - (reductions[choice] ?? 0));

  return {
    ...radiation,
    level: reducedLevel,
    status: reducedLevel >= 70 ? 'Solar Event' : reducedLevel >= 45 ? 'Warning' : 'Normal',
    message: reducedLevel >= 70
      ? 'The relative-risk index remains elevated after the selected response.'
      : reducedLevel >= 45
        ? 'The relative-risk index is lower but remains elevated.'
        : 'The relative-risk index is within the baseline scenario band.'
  };
}
