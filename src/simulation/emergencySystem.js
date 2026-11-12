import { getScenarioForDay } from '../data/simulationDataGenerator.js';

const SCENARIO_RESPONSES = {
  'reduced-solar': {
    severity: 'Moderate',
    options: [
      {
        id: 'inspect-array',
        label: 'Inspect and reconfigure the array',
        result: 'A power-consuming inspection restores some modeled panel output.',
        resourceDelta: { power: -8 },
        systemDelta: { solarPanels: 100, solarGenerationFactor: 0.9 },
        missionDelta: { score: -2 }
      },
      {
        id: 'shed-noncritical-load',
        label: 'Shed noncritical electrical loads',
        result: 'Crew workload is reduced and the habitat operates on a conservation schedule.',
        resourceDelta: { power: 6 },
        systemDelta: { solarPanels: 100, solarGenerationFactor: 0.62 },
        missionDelta: { score: -3 }
      },
      {
        id: 'hold-course-solar',
        label: 'Hold the current power plan',
        result: 'No repair energy is spent, but reduced generation remains in effect for the day.',
        resourceDelta: {},
        systemDelta: { solarPanels: 100, solarGenerationFactor: 0.62 },
        missionDelta: { score: -6 }
      }
    ]
  },
  'recycler-malfunction': {
    severity: 'Moderate',
    options: [
      {
        id: 'repair-recycler',
        label: 'Replace the recycler filter',
        result: 'A short maintenance task restores most modeled recovery performance.',
        resourceDelta: { power: -10, water: -1 },
        systemDelta: { recycler: 90, recyclerEfficiencyOverride: 0.82 },
        missionDelta: { score: -2 }
      },
      {
        id: 'ration-water',
        label: 'Ration nonessential water use',
        result: 'The crew conserves water while the low-efficiency recycler continues running.',
        resourceDelta: { water: 3 },
        systemDelta: { recycler: 55, recyclerEfficiencyOverride: 0.45 },
        missionDelta: { score: -3 }
      },
      {
        id: 'defer-recycler-repair',
        label: 'Defer maintenance',
        result: 'The crew avoids maintenance workload, but recovery remains degraded.',
        resourceDelta: {},
        systemDelta: { recycler: 45, recyclerEfficiencyOverride: 0.45 },
        missionDelta: { score: -6 }
      }
    ]
  },
  'communications-interruption': {
    severity: 'Low',
    options: [
      {
        id: 'switch-relay',
        label: 'Switch to the backup relay',
        result: 'A brief power-consuming reconfiguration restores the simulated link.',
        resourceDelta: { power: -4 },
        systemDelta: { communications: 100, communicationsOverride: true },
        missionDelta: { score: -1 }
      },
      {
        id: 'autonomous-operations',
        label: 'Continue the pre-approved plan',
        result: 'The crew follows the stored procedure until communications return next period.',
        resourceDelta: {},
        systemDelta: { communications: 60, communicationsOverride: false },
        missionDelta: { score: -2 }
      }
    ]
  },
  'oxygen-leak': {
    severity: 'High',
    options: [
      {
        id: 'seal-oxygen-line',
        label: 'Isolate and seal the damaged line',
        result: 'Power is spent on repair; the simulated leak is isolated.',
        resourceDelta: { power: -12, oxygen: -80 },
        systemDelta: { oxygenLeakFraction: 0, habitatIntegrity: 98 },
        missionDelta: { score: -2 }
      },
      {
        id: 'reduce-activity',
        label: 'Reduce crew activity and isolate the loop',
        result: 'The reduced-activity plan cuts oxygen use, but a small leak remains.',
        resourceDelta: { oxygen: -35 },
        systemDelta: { oxygenLeakFraction: 0.006 },
        missionDelta: { score: -3 }
      },
      {
        id: 'defer-oxygen-repair',
        label: 'Defer repair until the next check',
        result: 'The crew avoids immediate repair work while the leak remains active.',
        resourceDelta: {},
        systemDelta: { oxygenLeakFraction: 0.018 },
        missionDelta: { score: -8 }
      }
    ]
  },
  'solar-radiation-event': {
    severity: 'High',
    options: [
      {
        id: 'shelter-crew',
        label: 'Move the crew to the shielded shelter area',
        result: 'Shelter procedures reduce the educational risk index; this is not a dose calculation.',
        resourceDelta: { power: -6 },
        systemDelta: { radiationReduction: 52 },
        missionDelta: { score: -1 }
      },
      {
        id: 'pause-surface-work',
        label: 'Pause external activity and limit movement',
        result: 'Reduced activity lowers exposure in the simplified scenario model.',
        resourceDelta: { power: -2 },
        systemDelta: { radiationReduction: 28 },
        missionDelta: { score: -2 }
      },
      {
        id: 'continue-operations',
        label: 'Continue planned operations',
        result: 'No immediate power is spent, but the modeled hazard remains elevated.',
        resourceDelta: {},
        systemDelta: { radiationReduction: 0 },
        missionDelta: { score: -8 }
      }
    ]
  },
  'battery-degradation': {
    severity: 'Moderate',
    options: [
      {
        id: 'isolate-battery-string',
        label: 'Isolate the damaged battery string',
        result: 'Isolation costs power but restores reliable use of the remaining backup reserve.',
        resourceDelta: { power: -8 },
        systemDelta: { batteryHealth: 78, batteryDischargeFactor: 0.9, batteryCapacityFactor: 0.85 },
        missionDelta: { score: -2 }
      },
      {
        id: 'power-down-noncritical',
        label: 'Power down noncritical equipment',
        result: 'A low-load plan limits demand while reduced battery performance remains.',
        resourceDelta: { power: 4 },
        systemDelta: { batteryHealth: 70, batteryDischargeFactor: 0.7, batteryCapacityFactor: 0.7 },
        missionDelta: { score: -3 }
      },
      {
        id: 'monitor-battery',
        label: 'Monitor and defer corrective action',
        result: 'The current plan continues with reduced backup discharge capability.',
        resourceDelta: {},
        systemDelta: { batteryHealth: 65, batteryDischargeFactor: 0.7, batteryCapacityFactor: 0.7 },
        missionDelta: { score: -6 }
      }
    ]
  }
};

const EVENT_CONTEXT = {
  'reduced-solar': {
    affectedSystems: ['Solar array', 'Electrical reserve', 'Battery'],
    timeSensitivity: 'Review power priorities before today’s energy balance is applied.'
  },
  'recycler-malfunction': {
    affectedSystems: ['Water recycler', 'Fresh water inventory', 'Electrical load'],
    timeSensitivity: 'Choose a recovery or conservation response before today’s resource update.'
  },
  'communications-interruption': {
    affectedSystems: ['Communications relay', 'Crew workload'],
    timeSensitivity: 'Select the crew’s autonomous plan while mission control is unavailable.'
  },
  'oxygen-leak': {
    affectedSystems: ['Oxygen reserve', 'Habitat pressure integrity'],
    timeSensitivity: 'Isolate or manage the modeled leak before the daily reserve loss is applied.'
  },
  'solar-radiation-event': {
    affectedSystems: ['Crew activity', 'Relative radiation-risk index'],
    timeSensitivity: 'Review the shelter and activity options before the day’s simplified risk response.'
  },
  'battery-degradation': {
    affectedSystems: ['Backup battery', 'Electrical reserve', 'Power demand'],
    timeSensitivity: 'Set the backup-power strategy before the simulated degradation period.'
  }
};

export function createEmergencyEvent(day = 1, difficulty = 'Standard', scenarioSchedule = null) {
  const scenario = getScenarioForDay(day, scenarioSchedule);
  const template = SCENARIO_RESPONSES[scenario.id];
  if (!template) {
    return null;
  }

  return {
    id: `${scenario.id}-${day}`,
    scenarioId: scenario.id,
    title: scenario.title,
    severity: template.severity,
    description: `${scenario.trigger} Select a response; its effects are illustrative, scenario-based estimates. Difficulty: ${difficulty}.`,
    trigger: scenario.trigger,
    durationDays: scenario.durationDays,
    affectedSystems: [...(EVENT_CONTEXT[scenario.id]?.affectedSystems ?? [])],
    timeSensitivity: EVENT_CONTEXT[scenario.id]?.timeSensitivity ?? 'Review the event before proceeding.',
    resolutionStatus: 'Awaiting commander response',
    requiredSkill: ['reduced-solar', 'recycler-malfunction', 'communications-interruption', 'oxygen-leak', 'battery-degradation'].includes(scenario.id)
      ? 'systemsTroubleshooting'
      : null,
    options: template.options.map((option) => ({ ...option }))
  };
}

export function resolveEmergencyDecision(event, optionId) {
  const option = event?.options?.find((item) => item.id === optionId);
  if (!option) {
    return {
      label: null,
      message: 'Select a listed response before continuing the mission.',
      resourceDelta: {},
      systemDelta: {},
      missionDelta: { score: 0 },
      valid: false
    };
  }

  return {
    label: option.label,
    message: option.result,
    resourceDelta: option.resourceDelta ?? {},
    systemDelta: option.systemDelta ?? {},
    missionDelta: option.missionDelta ?? { score: 0 },
    valid: true
  };
}
