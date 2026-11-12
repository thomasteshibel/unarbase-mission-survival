export const MISSION_DIFFICULTIES = ['Training', 'Standard', 'High Risk'];

export const DEFAULT_MODEL_PARAMETERS = Object.freeze({
  oxygenLitersPerPersonDay: 588,
  grossWaterLitersPerPersonDay: 3.5,
  foodKgPerPersonDay: 0.62,
  basePowerKWhPerDay: 84,
  solarGenerationKWhPerDay: 104.625,
  recyclerEfficiency: 0.9
});

export const SIMULATION_PROFILE = {
  label: 'SIMULATED DATA — NOT LIVE NASA DATA',
  sourceType: 'Illustrative engineering assumptions',
  assumptions: [
    'Crew oxygen metabolism is modeled at 0.84 kg per person-day, approximately 588 L/person-day at standard temperature and pressure (about 700 L/kg).',
    'Gross water use is 3.5 L/person-day. The baseline recycler recovers 90%; a further 0.55 L/person-day represents unrecovered hygiene and handling losses.',
    'Packaged food is modeled at 0.62 kg/person-day. Actual menus, packaging, and individual needs are not represented.',
    'Nominal habitat electrical load is 84 kWh/day. Solar yield is an illustrative 25 kW array, 4.5 equivalent full-sun hours, and a 93% system factor (about 105 kWh/day). Both can be changed as educational model parameters.',
    'Oxygen, water, food, and energy inventories are scenario-design choices for a seven-day classroom exercise, not specifications for a flight habitat.',
    'Habitat pressure (101.3 kPa) and cabin temperature (21 °C) are illustrative control targets. Exterior surface temperatures are day-level scenario estimates and are not cabin temperatures.',
    'Radiation is shown as a dimensionless relative risk index, not dose, a forecast, or a measured lunar radiation value. Health effects are intentionally simplified.',
    'Crew fatigue is a 0–100 educational index. High fatigue increases modeled activity demand and can add a small health penalty; it is not a physiological prediction.',
    'Crew specialist skills are illustrative indices. Flight-engineer expertise can reduce selected modeled repair power costs by up to 25%; this is a game mechanic, not measured repair performance.'
  ],
  mission: {
    durationDays: 7,
    astronautCount: 4,
    difficulty: 'Standard',
    initialResources: {
      oxygen: 20000,
      water: 110,
      food: 22,
      power: 360,
      battery: 260
    },
    equipment: {
      habitatIntegrity: 100,
      solarPanels: 100,
      lifeSupport: 100,
      recycler: 90,
      batteryHealth: 100,
      communications: 100
    }
  },
  astronauts: [
    {
      name: 'Ava Chen',
      role: 'Mission Commander',
      profile: 'Coordinates operations and confirms that the crew understands the current plan.',
      skills: { missionPlanning: 0.9 }
    },
    {
      name: 'Leo Park',
      role: 'Flight Engineer',
      profile: 'Diagnoses habitat equipment faults and supports subsystem repair decisions.',
      skills: { systemsTroubleshooting: 0.9 }
    },
    {
      name: 'Maya Ortiz',
      role: 'Medical Officer',
      profile: 'Monitors crew workload and supports health and rest procedures.',
      skills: { crewCare: 0.9 }
    },
    {
      name: 'Noah Singh',
      role: 'Science Officer',
      profile: 'Tracks environmental observations and records mission measurements.',
      skills: { environmentalMonitoring: 0.9 }
    }
  ]
};

export const placeholderData = SIMULATION_PROFILE;

export const DEFAULT_CONFIG = {
  days: 7,
  crew: 4,
  difficulty: 'Standard',
  scenarioSeed: 0,
  initialResources: { ...SIMULATION_PROFILE.mission.initialResources },
  modelParameters: { ...DEFAULT_MODEL_PARAMETERS }
};
