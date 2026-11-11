import { DATA_MODES } from './dataConfig.js';
import { generateMissionConditions } from './simulationDataGenerator.js';
import { SIMULATION_PROFILE } from './simulationConfig.js';

export function getMissionData(day, difficulty, equipment) {
  return {
    mode: DATA_MODES.SIMULATION_MODE,
    label: SIMULATION_PROFILE.label,
    sourceType: SIMULATION_PROFILE.sourceType,
    ...generateMissionConditions(day, difficulty, equipment)
  };
}
