import { SIMULATION_PROFILE } from '../data/simulationConfig.js';
import { clampResource, RESOURCE_CAPACITIES } from '../data/dataValidator.js';

export function createInitialResources(config = {}) {
  const starting = config.initialResources ?? SIMULATION_PROFILE.mission.initialResources;

  return {
    oxygen: clampResource(starting.oxygen ?? 20000, RESOURCE_CAPACITIES.oxygen),
    water: clampResource(starting.water ?? 110, RESOURCE_CAPACITIES.water),
    food: clampResource(starting.food ?? 22, RESOURCE_CAPACITIES.food),
    power: clampResource(starting.power ?? 360, RESOURCE_CAPACITIES.power),
    battery: clampResource(starting.battery ?? 260, RESOURCE_CAPACITIES.battery)
  };
}

export function getDailyResourceNeeds({
  crew = 4,
  difficulty = 'Standard',
  activityFactor = 1,
  recyclerEfficiency,
  recyclerPowerDemand = 0,
  waterUseFactor = 1,
  powerDemandFactor = 1,
  oxygenLeakFraction = 0,
  solarGeneration,
  modelParameters = {}
} = {}) {
  const difficultyFactor = {
    Training: 0.8,
    Standard: 1,
    'High Risk': 1.2
  }[difficulty] ?? 1;
  const safeCrew = Math.max(0, Number(crew));
  const safeActivity = Math.max(0.5, Number(activityFactor));
  const safeRecovery = Math.min(1, Math.max(0, Number(recyclerEfficiency ?? modelParameters.recyclerEfficiency ?? 0.9)));
  const oxygenRate = Number(modelParameters.oxygenLitersPerPersonDay ?? 588);
  const grossWaterRate = Number(modelParameters.grossWaterLitersPerPersonDay ?? 3.5);
  const foodRate = Number(modelParameters.foodKgPerPersonDay ?? 0.62);
  const basePower = Number(modelParameters.basePowerKWhPerDay ?? 84);

  return {
    oxygen: safeCrew * oxygenRate * difficultyFactor * safeActivity,
    waterGross: safeCrew * grossWaterRate,
    water: safeCrew * (grossWaterRate * (1 - safeRecovery) + 0.55) * Math.max(0.5, Number(waterUseFactor)),
    food: safeCrew * foodRate * difficultyFactor,
    powerDemand: (basePower * (safeCrew / 4) * difficultyFactor * safeActivity + Math.max(0, Number(recyclerPowerDemand))) * Math.max(0.5, Number(powerDemandFactor)),
    solarGeneration: Math.max(0, Number(solarGeneration ?? modelParameters.solarGenerationKWhPerDay ?? 104.625)),
    oxygenLeakFraction: Math.max(0, Number(oxygenLeakFraction)),
    recyclerEfficiency: safeRecovery
  };
}

export function applyDailyResources(resources, {
  crew = 4,
  difficulty = 'Standard',
  activityFactor = 1,
  waterUseFactor = 1,
  powerDemandFactor = 1,
  conditions = {},
  modelParameters = {}
} = {}) {
  const needs = getDailyResourceNeeds({
    crew,
    difficulty,
    activityFactor,
    waterUseFactor,
    powerDemandFactor,
    recyclerEfficiency: conditions.recyclerEfficiency ?? 0.9,
    recyclerPowerDemand: conditions.recyclerPowerDemand ?? 0,
    oxygenLeakFraction: conditions.oxygenLeakFraction ?? 0,
    solarGeneration: conditions.solarGeneration ?? modelParameters.solarGenerationKWhPerDay ?? 104.625,
    modelParameters
  });
  const oxygenUse = needs.oxygen + Number(resources.oxygen) * needs.oxygenLeakFraction;
  const waterUse = needs.water;
  const foodUse = needs.food;
  const energyBalance = needs.solarGeneration - needs.powerDemand;
  let power = Number(resources.power);
  let battery = Number(resources.battery);
  const batteryCapacity = RESOURCE_CAPACITIES.battery * Math.min(
    1,
    Math.max(0, Number(conditions.batteryCapacityFactor ?? 1))
  );
  battery = Math.min(battery, batteryCapacity);

  if (energyBalance >= 0) {
    const storedInMainReserve = Math.min(RESOURCE_CAPACITIES.power - power, energyBalance);
    power += storedInMainReserve;
    battery = Math.min(batteryCapacity, battery + Math.max(0, energyBalance - storedInMainReserve) * 0.4);
  } else {
    const deficit = -energyBalance;
    const mainReserveDischarge = Math.min(power, deficit);
    power -= mainReserveDischarge;
    const batteryDemand = deficit - mainReserveDischarge;
    const usableBattery = battery * Math.min(1, Math.max(0, Number(conditions.batteryDischargeFactor ?? 1)));
    const batteryDischarge = Math.min(usableBattery, batteryDemand);
    battery -= batteryDischarge;
  }

  return {
    oxygen: clampResource(Number(resources.oxygen) - oxygenUse),
    water: clampResource(Number(resources.water) - waterUse),
    food: clampResource(Number(resources.food) - foodUse),
    power: clampResource(power, RESOURCE_CAPACITIES.power),
    battery: clampResource(battery, RESOURCE_CAPACITIES.battery)
  };
}
