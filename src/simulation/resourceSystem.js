import { SIMULATION_PROFILE } from '../data/simulationConfig.js';
import { clampResource } from '../data/dataValidator.js';

const MAX_POWER_RESERVE_KWH = 600;
const MAX_BATTERY_RESERVE_KWH = 300;
const OXYGEN_LITERS_PER_PERSON_DAY = 588;
const GROSS_WATER_LITERS_PER_PERSON_DAY = 3.5;
const FOOD_KG_PER_PERSON_DAY = 0.62;
const BASE_POWER_DEMAND_KWH_PER_DAY = 84;

export function createInitialResources(config = {}) {
  const starting = config.initialResources ?? SIMULATION_PROFILE.mission.initialResources;

  return {
    oxygen: clampResource(starting.oxygen ?? 20000),
    water: clampResource(starting.water ?? 110),
    food: clampResource(starting.food ?? 22),
    power: clampResource(starting.power ?? 360, MAX_POWER_RESERVE_KWH),
    battery: clampResource(starting.battery ?? 260, MAX_BATTERY_RESERVE_KWH)
  };
}

export function getDailyResourceNeeds({
  crew = 4,
  difficulty = 'Standard',
  activityFactor = 1,
  recyclerEfficiency = 0.9,
  recyclerPowerDemand = 0,
  waterUseFactor = 1,
  powerDemandFactor = 1,
  oxygenLeakFraction = 0,
  solarGeneration = 104.625
} = {}) {
  const difficultyFactor = {
    Training: 0.8,
    Standard: 1,
    'High Risk': 1.2
  }[difficulty] ?? 1;
  const safeCrew = Math.max(0, Number(crew));
  const safeActivity = Math.max(0.5, Number(activityFactor));
  const safeRecovery = Math.min(1, Math.max(0, Number(recyclerEfficiency)));

  return {
    oxygen: safeCrew * OXYGEN_LITERS_PER_PERSON_DAY * difficultyFactor * safeActivity,
    waterGross: safeCrew * GROSS_WATER_LITERS_PER_PERSON_DAY,
    water: safeCrew * (GROSS_WATER_LITERS_PER_PERSON_DAY * (1 - safeRecovery) + 0.55) * Math.max(0.5, Number(waterUseFactor)),
    food: safeCrew * FOOD_KG_PER_PERSON_DAY * difficultyFactor,
    powerDemand: (BASE_POWER_DEMAND_KWH_PER_DAY * (safeCrew / 4) * difficultyFactor * safeActivity + Math.max(0, Number(recyclerPowerDemand))) * Math.max(0.5, Number(powerDemandFactor)),
    solarGeneration: Math.max(0, Number(solarGeneration)),
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
  conditions = {}
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
    solarGeneration: conditions.solarGeneration ?? 104.625
  });
  const oxygenUse = needs.oxygen + Number(resources.oxygen) * needs.oxygenLeakFraction;
  const waterUse = needs.water;
  const foodUse = needs.food;
  const energyBalance = needs.solarGeneration - needs.powerDemand;
  let power = Number(resources.power);
  let battery = Number(resources.battery);
  const batteryCapacity = MAX_BATTERY_RESERVE_KWH * Math.min(
    1,
    Math.max(0, Number(conditions.batteryCapacityFactor ?? 1))
  );
  battery = Math.min(battery, batteryCapacity);

  if (energyBalance >= 0) {
    const storedInMainReserve = Math.min(MAX_POWER_RESERVE_KWH - power, energyBalance);
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
    power: clampResource(power, MAX_POWER_RESERVE_KWH),
    battery: clampResource(battery, MAX_BATTERY_RESERVE_KWH)
  };
}
