import { SIMULATION_PROFILE } from './simulationConfig.js';

export const DATA_MODES = Object.freeze({
  SIMULATION_MODE: 'SIMULATION_MODE',
  NASA_DATA_MODE: 'NASA_DATA_MODE'
});

export const dataConfig = Object.freeze({
  mode: DATA_MODES.SIMULATION_MODE,
  nasaDataConfigured: false,
  sourceName: 'LunarBase educational simulation',
  sourceDescription: 'Deterministic scenario schedule using documented illustrative engineering assumptions.'
});

export function isNASADataModeAvailable() {
  return dataConfig.nasaDataConfigured;
}

export function getActiveDataSet() {
  if (dataConfig.mode === DATA_MODES.NASA_DATA_MODE && !isNASADataModeAvailable()) {
    return {
      warning: 'NASA Data Mode is unavailable: no verified, compatible external dataset is integrated.',
      source: null
    };
  }
  return SIMULATION_PROFILE;
}

export function setDataMode(mode) {
  if (mode === DATA_MODES.SIMULATION_MODE) {
    return DATA_MODES.SIMULATION_MODE;
  }
  if (mode === DATA_MODES.NASA_DATA_MODE && !isNASADataModeAvailable()) {
    throw new Error('NASA Data Mode is unavailable: no verified, compatible external dataset is integrated.');
  }
  if (!Object.values(DATA_MODES).includes(mode)) {
    throw new Error(`Unknown data mode: ${mode}`);
  }
  return mode;
}
