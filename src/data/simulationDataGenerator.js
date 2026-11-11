const SCENARIOS = [
  {
    day: 1,
    id: 'nominal-operations',
    title: 'Nominal lunar operations',
    trigger: 'Mission start: all systems are within their planned operating bands.',
    durationDays: 1,
    radiationIndex: 18,
    surfaceTemperatureC: -110
  },
  {
    day: 2,
    id: 'reduced-solar',
    title: 'Reduced solar generation',
    trigger: 'A scheduled dust-on-array scenario reduces panel output to 62% for this simulated operations period.',
    durationDays: 1,
    solarFactor: 0.62,
    radiationIndex: 22,
    surfaceTemperatureC: -85
  },
  {
    day: 3,
    id: 'recycler-malfunction',
    title: 'Water recovery performance loss',
    trigger: 'A filter fault lowers the modeled water-recovery efficiency to 45% for one day.',
    durationDays: 1,
    recyclerEfficiency: 0.45,
    recyclerPowerDemand: 10,
    radiationIndex: 26,
    surfaceTemperatureC: -35
  },
  {
    day: 4,
    id: 'communications-interruption',
    title: 'Communication interruption',
    trigger: 'A simulated relay handover interrupts mission-control contact for one operations period; autonomous workload adds 8 fatigue-index points.',
    durationDays: 1,
    communicationsAvailable: false,
    crewFatigueIncrement: 8,
    radiationIndex: 30,
    surfaceTemperatureC: 20
  },
  {
    day: 5,
    id: 'oxygen-leak',
    title: 'Habitat oxygen-line leak',
    trigger: 'A seal fault causes a modeled 1.8% reserve loss during this operations period.',
    durationDays: 1,
    oxygenLeakFraction: 0.018,
    radiationIndex: 34,
    surfaceTemperatureC: 80
  },
  {
    day: 6,
    id: 'solar-radiation-event',
    title: 'Elevated radiation-risk scenario',
    trigger: 'A pre-scripted solar-particle-event scenario raises the relative risk index for this day.',
    durationDays: 1,
    radiationIndex: 82,
    surfaceTemperatureC: 110
  },
  {
    day: 7,
    id: 'battery-degradation',
    title: 'Battery performance degradation',
    trigger: 'A simulated battery-string fault limits backup discharge capability to 70% for this period.',
    durationDays: 1,
    batteryDischargeFactor: 0.7,
    batteryCapacityFactor: 0.7,
    radiationIndex: 32,
    surfaceTemperatureC: 75
  }
];

export function getScenarioForDay(day = 1) {
  const scheduled = SCENARIOS.find((scenario) => scenario.day === day) ?? SCENARIOS[0];
  return { ...scheduled };
}

export function generateMissionConditions(day = 1, difficulty = 'Standard', equipment = {}) {
  const scenario = getScenarioForDay(day);
  const difficultyFactor = {
    Training: 0.8,
    Standard: 1,
    'High Risk': 1.2
  }[difficulty] ?? 1;
  const solarHealth = Math.max(0, Math.min(1, Number(equipment.solarPanels ?? 100) / 100));
  const recyclerHealth = Math.max(0, Math.min(1, Number(equipment.recycler ?? 90) / 100));
  const configuredEfficiency = Number(equipment.recyclerEfficiency ?? 0.9);
  const solarFactor = Math.max(0, Math.min(1, Number(equipment.solarGenerationFactor ?? scenario.solarFactor ?? 1)));
  const recyclerEfficiency = Math.min(
    equipment.recyclerEfficiencyOverride ?? scenario.recyclerEfficiency ?? configuredEfficiency,
    configuredEfficiency * Math.max(0.5, recyclerHealth / 0.9)
  );

  return {
    scenario,
    solarGeneration: 25 * 4.5 * 0.93 * solarHealth * solarFactor,
    oxygenLeakFraction: equipment.oxygenLeakFraction ?? scenario.oxygenLeakFraction ?? 0,
    recyclerEfficiency,
    recyclerPowerDemand: scenario.recyclerPowerDemand ?? 0,
    batteryDischargeFactor: equipment.batteryDischargeFactor ?? scenario.batteryDischargeFactor ?? 1,
    batteryCapacityFactor: equipment.batteryCapacityFactor ?? scenario.batteryCapacityFactor ?? 1,
    communicationsAvailable: equipment.communicationsOverride ?? scenario.communicationsAvailable ?? true,
    crewFatigueIncrement: scenario.crewFatigueIncrement ?? 0,
    radiation: {
      level: Math.round(scenario.radiationIndex * difficultyFactor),
      unit: 'relative index',
      status: scenario.radiationIndex >= 70 ? 'Elevated scenario' : 'Baseline scenario',
      message: scenario.radiationIndex >= 70
        ? 'A scripted educational hazard scenario is active. The index is not a radiation dose or forecast.'
        : 'No elevated scripted radiation scenario is active. The index is not a radiation dose or measurement.'
    },
    environment: {
      surfaceTemperatureC: scenario.surfaceTemperatureC,
      cabinTemperatureC: 21,
      cabinPressureKPa: 101.3
    },
    difficultyFactor
  };
}

export function getSimulationAssumptions() {
  return [...SIMULATION_PROFILE.assumptions];
}
