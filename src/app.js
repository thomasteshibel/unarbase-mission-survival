import Chart from 'chart.js/auto';
import { DEFAULT_CONFIG, DEFAULT_MODEL_PARAMETERS, MISSION_DIFFICULTIES, SIMULATION_PROFILE } from './data/simulationConfig.js';
import { dataConfig, isNASADataModeAvailable } from './data/dataConfig.js';
import { MODEL_PARAMETER_RANGES, RESOURCE_CAPACITIES, validateMissionState } from './data/dataValidator.js';
import { NASA_DIVINER_MOSAIC } from './data/nasaDataCatalog.js';
import { createScenarioSchedule, getScenarioForDay } from './data/simulationDataGenerator.js';
import { readStoredMission, writeStoredMission } from './services/storageService.js';
import {
  advanceMission,
  advanceMissionStep,
  buildMissionReport,
  createMission,
  DAILY_DECISIONS,
  resolveEmergencyChoice,
  setMissionPaused,
  updateMissionModelParameters
} from './simulation/missionEngine.js';
import { getDailyResourceNeeds } from './simulation/resourceSystem.js';

const NAVIGATION = [
  { id: 'overview', label: 'Mission Overview', icon: '◫', group: 'MISSION CONTROL' },
  { id: 'dashboard', label: 'Mission Dashboard', icon: '▦', group: 'MISSION CONTROL' },
  { id: 'timeline', label: 'Mission Timeline', icon: '◷', group: 'MISSION CONTROL' },
  { id: 'habitat', label: 'Lunar Habitat', icon: '⌂', group: 'HABITAT OPERATIONS' },
  { id: 'life-support', label: 'Life Support Systems', icon: '◉', group: 'HABITAT OPERATIONS' },
  { id: 'oxygen', label: 'Oxygen Management', icon: '◌', group: 'HABITAT OPERATIONS' },
  { id: 'water', label: 'Water Management', icon: '≈', group: 'HABITAT OPERATIONS' },
  { id: 'food', label: 'Food Management', icon: '▤', group: 'HABITAT OPERATIONS' },
  { id: 'power', label: 'Electrical Power', icon: 'ϟ', group: 'HABITAT OPERATIONS' },
  { id: 'crew', label: 'Astronaut Crew', icon: '♙', group: 'CREW MANAGEMENT' },
  { id: 'profiles', label: 'Astronaut Profiles', icon: '♧', group: 'CREW MANAGEMENT' },
  { id: 'crew-health', label: 'Crew Health', icon: '♡', group: 'CREW MANAGEMENT' },
  { id: 'surface', label: 'Lunar Surface Conditions', icon: '◒', group: 'LUNAR ENVIRONMENT' },
  { id: 'radiation', label: 'Radiation Monitoring', icon: '◉', group: 'LUNAR ENVIRONMENT' },
  { id: 'sunlight', label: 'Sunlight and Shadow', icon: '☼', group: 'LUNAR ENVIRONMENT' },
  { id: 'nasa-explorer', label: 'NASA Data Explorer', icon: '◈', group: 'LUNAR ENVIRONMENT' },
  { id: 'emergencies', label: 'Emergency Center', icon: '△', group: 'MISSION OPERATIONS' },
  { id: 'decisions', label: 'Mission Decisions', icon: '⌁', group: 'MISSION OPERATIONS' },
  { id: 'mission-log', label: 'Mission Log', icon: '≡', group: 'MISSION OPERATIONS' },
  { id: 'analytics', label: 'Mission Analytics', icon: '⌁', group: 'MISSION OPERATIONS' },
  { id: 'report', label: 'Final Mission Report', icon: '▧', group: 'MISSION OPERATIONS' }
];
const APP_BASE_PATH = import.meta.env?.BASE_URL ?? '/';

const SUPPORT_NAVIGATION = [
  { id: 'data-source', label: 'Data Sources', icon: '◈' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
  { id: 'help', label: 'Help & About', icon: '?' }
];

const RESOURCE_META = [
  { key: 'oxygen', label: 'Oxygen', unit: 'L', initial: 20000, note: 'Metabolic oxygen reserve' },
  { key: 'water', label: 'Water', unit: 'L', initial: 110, note: 'Fresh make-up inventory' },
  { key: 'food', label: 'Food', unit: 'kg', initial: 22, note: 'Packaged provisions' },
  { key: 'power', label: 'Power reserve', unit: 'kWh', initial: 360, note: 'Stored operational energy' },
  { key: 'battery', label: 'Backup battery', unit: 'kWh', initial: 260, note: 'Emergency electrical reserve' }
];
const RESOURCE_DETAILS = {
  oxygen: {
    title: 'Oxygen management',
    description: 'Track modeled metabolic oxygen demand and any active habitat leak assumption.',
    explanation: 'Daily oxygen consumption scales with crew size, activity, and difficulty. Leak loss is applied to the remaining reserve. This simplified balance does not model cabin-gas chemistry, pressure control, or oxygen production.'
  },
  water: {
    title: 'Water management',
    description: 'Review gross crew use, modeled recycling, and fresh make-up demand.',
    explanation: 'Recovered water reduces the make-up estimate. Scenario faults can lower recovery; the model does not create water from waste or represent a real flight recycler.'
  },
  food: {
    title: 'Food management',
    description: 'Monitor packaged provisions against the illustrative per-person ration assumption.',
    explanation: 'Food demand scales with crew size and mission difficulty. Menu composition, packaging mass, nutrition, and individual needs are outside this educational model.'
  },
  power: {
    title: 'Electrical power',
    description: 'Compare scenario-adjusted solar generation with modeled habitat electrical demand.',
    explanation: 'The reserve balance is a simplified energy account. Panel geometry, illumination maps, storage chemistry, and conversion losses are not resolved as live engineering telemetry.'
  }
};

const TITLES = Object.fromEntries([...NAVIGATION, ...SUPPORT_NAVIGATION].map(({ id, label }) => [id, label]));
const VALID_PAGES = new Set(Object.keys(TITLES));
const SIDEBAR_PREFERENCE_KEY = 'lunarbase-sidebar-collapsed-v1';

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function percentage(value, maximum) {
  return Math.max(0, Math.min(100, (Number(value) / maximum) * 100));
}

function formatNumber(value, digits = 0) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(Number(value) || 0);
}

function getModelParameterValues(formData) {
  return {
    oxygenLitersPerPersonDay: Number(formData.get('oxygenLitersPerPersonDay')),
    grossWaterLitersPerPersonDay: Number(formData.get('grossWaterLitersPerPersonDay')),
    foodKgPerPersonDay: Number(formData.get('foodKgPerPersonDay')),
    basePowerKWhPerDay: Number(formData.get('basePowerKWhPerDay')),
    solarGenerationKWhPerDay: Number(formData.get('solarGenerationKWhPerDay')),
    recyclerEfficiency: Number(formData.get('recyclerEfficiency')) / 100
  };
}

function renderModelParameterFields(parameters) {
  const fields = [
    { key: 'oxygenLitersPerPersonDay', label: 'Oxygen metabolism', unit: 'L / person-day', step: 1, digits: 0 },
    { key: 'grossWaterLitersPerPersonDay', label: 'Gross water use', unit: 'L / person-day', step: 0.1, digits: 1 },
    { key: 'foodKgPerPersonDay', label: 'Packaged food', unit: 'kg / person-day', step: 0.01, digits: 2 },
    { key: 'basePowerKWhPerDay', label: 'Base habitat load', unit: 'kWh / day · 4 crew', step: 1, digits: 0 },
    { key: 'solarGenerationKWhPerDay', label: 'Solar generation', unit: 'kWh / day · baseline', step: 'any', digits: 1 },
    { key: 'recyclerEfficiency', label: 'Water recovery', unit: '% of gross water', step: 1, digits: 0 }
  ];
  return fields.map(({ key, label, unit, step }) => {
    const limits = MODEL_PARAMETER_RANGES[key];
    const displayedValue = key === 'recyclerEfficiency'
      ? Math.round(Number(parameters[key] ?? DEFAULT_MODEL_PARAMETERS[key]) * 100)
      : Number(parameters[key] ?? DEFAULT_MODEL_PARAMETERS[key]);
    const minimum = key === 'recyclerEfficiency' ? limits.min * 100 : limits.min;
    const maximum = key === 'recyclerEfficiency' ? limits.max * 100 : limits.max;
    return `
      <label class="model-parameter">
        <span>${escapeHTML(label)}</span>
        <span class="model-parameter-input"><input name="${key}" type="number" min="${minimum}" max="${maximum}" step="${step}" value="${displayedValue}" required /><small>${escapeHTML(unit)}</small></span>
        <small class="field-help">Allowed range: ${minimum}–${maximum}</small>
      </label>
    `;
  }).join('');
}

function renderStartingResourceFields(resources) {
  const fields = [
    { key: 'oxygen', label: 'Oxygen', unit: 'L', step: 100 },
    { key: 'water', label: 'Water', unit: 'L', step: 1 },
    { key: 'food', label: 'Food', unit: 'kg', step: 0.5 },
    { key: 'power', label: 'Power reserve', unit: 'kWh', step: 5 },
    { key: 'battery', label: 'Backup battery', unit: 'kWh', step: 5 }
  ];
  return fields.map(({ key, label, unit, step }) => `
    <label class="inventory-input">
      <span>${escapeHTML(label)}</span>
      <span class="model-parameter-input"><input name="initial-${key}" type="number" min="0" max="${RESOURCE_CAPACITIES[key]}" step="${step}" value="${Number(resources[key])}" required /><small>${escapeHTML(unit)}</small></span>
      <small class="field-help">Maximum ${formatNumber(RESOURCE_CAPACITIES[key])} ${escapeHTML(unit)}</small>
    </label>
  `).join('');
}

function renderModelPreview(parameters, crew, difficulty) {
  const needs = getDailyResourceNeeds({
    crew,
    difficulty,
    modelParameters: parameters
  });
  const values = [
    ['Oxygen', `${formatNumber(needs.oxygen, 1)} L/day`],
    ['Water make-up', `${formatNumber(needs.water, 1)} L/day`],
    ['Food', `${formatNumber(needs.food, 2)} kg/day`],
    ['Power demand', `${formatNumber(needs.powerDemand, 1)} kWh/day`],
    ['Solar generation', `${formatNumber(needs.solarGeneration, 1)} kWh/day`]
  ];
  return `<div class="model-preview-heading"><strong>Baseline daily model · ${crew} crew · ${escapeHTML(difficulty)}</strong><span>Before today’s plan and scenario effects</span></div><dl>${values.map(([label, value]) => `<div><dt>${escapeHTML(label)}</dt><dd>${escapeHTML(value)}</dd></div>`).join('')}</dl>`;
}

function getInitialPage() {
  const page = globalThis.location?.hash?.slice(1);
  return VALID_PAGES.has(page) ? page : 'dashboard';
}

function normalizeStoredMission(savedMission) {
  const isCompatible = [2, 3, 4].includes(savedMission?.simulationVersion);
  if (!isCompatible) return null;
  const scenarioSeed = Number(savedMission.scenarioSeed ?? 0);
  const mission = {
    ...savedMission,
    simulationVersion: 4,
    scenarioSeed,
    scenarioSchedule: savedMission.scenarioSchedule ?? createScenarioSchedule(scenarioSeed),
    operationStage: savedMission.operationStage ??
      (['complete', 'failed'].includes(savedMission.status) ? 'complete' : 'briefing'),
    paused: savedMission.paused ?? false,
    astronauts: savedMission.astronauts?.map((astronaut) => {
      const profile = SIMULATION_PROFILE.astronauts.find((member) => member.name === astronaut.name);
      return {
        ...profile,
        ...astronaut,
        skills: { ...profile?.skills, ...astronaut.skills }
      };
    }),
    modelParameters: {
      ...DEFAULT_MODEL_PARAMETERS,
      ...savedMission.modelParameters
    }
  };
  return validateMissionState(mission);
}

function createScenarioSeed() {
  try {
    if (typeof globalThis.crypto?.getRandomValues === 'function') {
      const seed = new Uint32Array(1);
      globalThis.crypto.getRandomValues(seed);
      return seed[0];
    }
  } catch (error) {
    console.warn('Secure random seed unavailable; using a time-derived scenario seed.', error);
  }
  return Date.now() >>> 0;
}

function getSidebarCollapsedPreference() {
  try {
    return globalThis.localStorage?.getItem(SIDEBAR_PREFERENCE_KEY) === 'true';
  } catch (error) {
    console.warn('Sidebar preference could not be read.', error);
    return false;
  }
}

function saveSidebarCollapsedPreference(collapsed) {
  try {
    globalThis.localStorage?.setItem(SIDEBAR_PREFERENCE_KEY, String(collapsed));
  } catch (error) {
    console.warn('Sidebar preference could not be saved.', error);
  }
}

export function createApp(root) {
  let restoredMission = null;
  let restoreError = '';
  try {
    restoredMission = normalizeStoredMission(readStoredMission());
  } catch (error) {
    restoreError = `Saved mission could not be loaded: ${error.message}`;
    console.error(restoreError, error);
  }
  const initialConfig = { ...DEFAULT_CONFIG, scenarioSeed: createScenarioSeed() };
  const appState = {
    screen: getInitialPage(),
    config: {
      days: restoredMission?.duration ?? DEFAULT_CONFIG.days,
      crew: restoredMission?.crew ?? DEFAULT_CONFIG.crew,
      difficulty: restoredMission?.difficulty ?? DEFAULT_CONFIG.difficulty,
      scenarioSeed: restoredMission?.scenarioSeed ?? initialConfig.scenarioSeed,
      initialResources: { ...(restoredMission?.initialResources ?? DEFAULT_CONFIG.initialResources) },
      modelParameters: { ...(restoredMission?.modelParameters ?? DEFAULT_CONFIG.modelParameters) }
    },
    mission: restoredMission ?? createMission(initialConfig),
    report: restoredMission?.report ?? null,
    chart: null,
    toast: restoreError ? { message: `${restoreError} Start a new mission or load a valid saved mission.`, tone: 'error' } : '',
    selectedDecision: 'normal',
    sidebarCollapsed: getSidebarCollapsedPreference(),
    drawerOpen: false
  };

  function navigate(page) {
    if (!VALID_PAGES.has(page)) {
      throw new Error(`Unknown mission page: ${page}`);
    }
    appState.screen = page;
    appState.drawerOpen = false;
    appState.toast = '';
    globalThis.history?.replaceState?.(null, '', `#${page}`);
    render();
  }

  function setToast(message, tone = 'info') {
    appState.toast = message ? { message, tone } : '';
  }

  function persistMission() {
    writeStoredMission(appState.mission);
  }

  function loadSavedMission() {
    try {
      const restored = normalizeStoredMission(readStoredMission());
      if (!restored) throw new Error('No compatible saved mission is available in this browser.');
      writeStoredMission(restored);
      appState.mission = restored;
      appState.config = {
        days: restored.duration,
        crew: restored.crew,
        difficulty: restored.difficulty,
        scenarioSeed: restored.scenarioSeed,
        initialResources: { ...restored.initialResources },
        modelParameters: { ...restored.modelParameters }
      };
      appState.report = restored.report;
      appState.selectedDecision = 'normal';
      appState.screen = 'dashboard';
      setToast('Saved mission loaded from this browser.', 'success');
    } catch (error) {
      setToast(`Saved mission could not be loaded: ${error.message}`, 'error');
    }
    render();
  }

  function setMissionPausedState(paused) {
    try {
      const nextMission = structuredClone(appState.mission);
      setMissionPaused(nextMission, paused);
      writeStoredMission(nextMission);
      appState.mission = nextMission;
      setToast(paused ? 'Mission paused. No mission time advances automatically.' : 'Mission resumed. Progress still requires your explicit action.', 'success');
    } catch (error) {
      setToast(`Mission pacing could not be changed: ${error.message}`, 'error');
    }
    render();
  }

  function advanceOneMissionStep() {
    try {
      const nextMission = structuredClone(appState.mission);
      advanceMissionStep(nextMission);
      writeStoredMission(nextMission);
      appState.mission = nextMission;
      setToast(`Day ${nextMission.day} operations are ready. No resources were consumed by the briefing step.`, 'success');
    } catch (error) {
      setToast(`Mission step could not be completed: ${error.message}`, 'error');
    }
    render();
  }

  function applyEmergencyResponse(responseId) {
    try {
      if (!responseId) throw new Error('Select one response after reviewing its consequences.');
      const nextMission = structuredClone(appState.mission);
      resolveEmergencyChoice(nextMission, responseId);
      writeStoredMission(nextMission);
      appState.mission = nextMission;
      setToast('Response applied. Review the updated systems; the mission day has not advanced.', 'success');
    } catch (error) {
      setToast(`Emergency response could not be applied: ${error.message}`, 'error');
    }
    render();
  }

  function startNewMission(formData) {
    const days = Number(formData.get('days'));
    const crew = Number(formData.get('crew'));
    const difficulty = formData.get('difficulty');
    if (!Number.isInteger(days) || days < 1 || days > 7 || !Number.isInteger(crew) || crew < 1 || crew > 4) {
      setToast('Choose a mission duration from 1 to 7 days and a crew size from 1 to 4.', 'error');
      render();
      return;
    }

    try {
      if (!MISSION_DIFFICULTIES.includes(difficulty)) {
        throw new Error('Choose a supported mission difficulty.');
      }
      const initialResources = Object.fromEntries(
        Object.keys(RESOURCE_CAPACITIES).map((key) => [key, Number(formData.get(`initial-${key}`))])
      );
      const modelParameters = { ...appState.mission.modelParameters };
      const nextConfig = { days, crew, difficulty, scenarioSeed: createScenarioSeed(), initialResources, modelParameters };
      const nextMission = createMission(nextConfig);
      writeStoredMission(nextMission);
      appState.config = nextConfig;
      appState.mission = nextMission;
      appState.report = null;
      appState.selectedDecision = 'normal';
      appState.screen = 'dashboard';
      appState.toast = { message: 'New mission initialized with your configured inventory and model assumptions.', tone: 'success' };
      globalThis.history?.replaceState?.(null, '', '#dashboard');
    } catch (error) {
      setToast(`Mission configuration was not applied: ${error.message}`, 'error');
      appState.screen = 'settings';
    }
    render();
  }

  function applyCurrentModelParameters(formData) {
    try {
      const modelParameters = getModelParameterValues(formData);
      const nextMission = structuredClone(appState.mission);
      updateMissionModelParameters(nextMission, modelParameters);
      writeStoredMission(nextMission);
      appState.mission = nextMission;
      appState.config.modelParameters = { ...modelParameters };
      setToast('Model assumptions updated. The next operation uses these rates; past mission days are unchanged.', 'success');
    } catch (error) {
      setToast(`Model settings were not applied: ${error.message}`, 'error');
    }
    render();
  }

  function completeMissionDay() {
    try {
      const nextMission = structuredClone(appState.mission);
      if (nextMission.emergency) {
        throw new Error('Resolve the active scenario before advancing the mission day.');
      }

      appState.mission = advanceMission(nextMission, appState.selectedDecision);
      appState.report = appState.mission.report;
    } catch (error) {
      setToast(`Mission action could not be completed: ${error.message}`, 'error');
      render();
      return;
    }
    try {
      persistMission();
      setToast(`Day ${appState.mission.history.at(-1)?.day ?? appState.mission.day} complete. Scenario effects and crew condition updated.`, 'success');
    } catch (error) {
      setToast(`Mission day advanced, but progress could not be saved: ${error.message}`, 'error');
    }
    render();
  }

  function resetMission() {
    const confirmed = globalThis.confirm?.('Start a new mission and replace the saved mission in this browser?') ?? true;
    if (!confirmed) return;
    try {
      const nextMission = createMission(appState.config);
      writeStoredMission(nextMission);
      appState.mission = nextMission;
    } catch (error) {
      setToast(`Mission could not be restarted: ${error.message}`, 'error');
      render();
      return;
    }
    appState.report = null;
    appState.selectedDecision = 'normal';
    appState.screen = 'dashboard';
    setToast('Mission reset. A fresh deterministic scenario is ready.', 'success');
    render();
  }

  function renderNavigation(items, activePage) {
    return items.map(({ id, label, icon }) => `
      <button class="nav-link ${activePage === id ? 'active' : ''}" type="button" data-page="${id}"
        aria-current="${activePage === id ? 'page' : 'false'}" title="${escapeHTML(label)}">
        <span class="nav-icon" aria-hidden="true">${icon}</span>
        <span class="nav-label">${escapeHTML(label)}</span>
        ${activePage === id ? '<span class="nav-active-mark" aria-hidden="true"></span>' : ''}
      </button>
    `).join('');
  }

  function renderMissionControls(compact = false) {
    const mission = appState.mission;
    const hasEvent = Boolean(mission.emergency);
    let progressionControl = '';

    if (mission.status !== 'active') {
      progressionControl = '<button class="button button-quiet" type="button" data-page="report">Review mission report</button>';
    } else if (mission.paused) {
      progressionControl = '<button class="button button-primary" type="button" data-action="resume-mission">Resume mission</button>';
    } else if (mission.operationStage === 'briefing' && hasEvent) {
      progressionControl = '<button class="button button-primary" type="button" data-page="emergencies">Review active event</button>';
    } else if (mission.operationStage === 'briefing') {
      progressionControl = `<button class="button button-primary" type="button" data-action="advance-step">Advance one simulation step · Begin Day ${mission.day} <span aria-hidden="true">→</span></button>`;
    } else if (hasEvent) {
      progressionControl = '<button class="button button-primary" type="button" data-page="emergencies">Resolve active event</button>';
    } else {
      progressionControl = '<button class="button button-primary button-advance" type="button" data-action="advance-day">Advance one mission day <span aria-hidden="true">→</span></button>';
    }

    return `
      <section class="panel mission-controls ${compact ? 'mission-controls-compact' : ''}" aria-label="Manual mission time controls">
        <div class="mission-controls-summary">
          <p class="eyebrow">MISSION TIME · MANUAL TURN-BASED CONTROL</p>
          <h2>${mission.status === 'active' ? `Day ${mission.day} · ${mission.operationStage === 'briefing' ? 'Briefing' : 'Operations'}` : 'Mission complete'}</h2>
          <p>No clock or animation advances the simulation. Review each event and explicitly choose when to begin operations or close a mission day.</p>
          <div class="mission-control-status"><span class="tag ${mission.paused ? 'tag-amber' : 'tag-green'}">${mission.paused ? 'PAUSED' : 'MANUAL · READY'}</span><span class="tag tag-blue">STEP ${mission.operationStage === 'briefing' ? 'BRIEFING' : mission.operationStage === 'operations' ? 'OPERATIONS' : 'COMPLETE'}</span></div>
        </div>
        <div class="mission-control-actions">
          ${mission.status === 'active' ? `<button class="button button-quiet" type="button" data-action="${mission.paused ? 'resume-mission' : 'pause-mission'}">${mission.paused ? 'Resume' : 'Pause'}</button>` : ''}
          ${progressionControl}
          <button class="button button-quiet" type="button" data-action="save">Save mission</button>
          <button class="button button-quiet" type="button" data-action="load">Load saved mission</button>
        </div>
      </section>
    `;
  }

  function renderShell(content) {
    const mission = appState.mission;
    const statusClass = mission.phase.toLowerCase();
    return `
      <div class="app-shell ${appState.sidebarCollapsed ? 'sidebar-collapsed' : ''} ${appState.drawerOpen ? 'drawer-open' : ''}">
        <div class="drawer-scrim" data-action="close-drawer" aria-hidden="true"></div>
        <aside class="sidebar" id="mission-navigation" aria-label="Mission navigation">
          <a class="brand-lockup" href="#dashboard" data-page="dashboard" aria-label="LunarBase mission dashboard">
            <span class="brand-mark" aria-hidden="true"><span></span><span></span><span></span></span>
            <span class="brand-name">LUNARBASE<small>MISSION CONTROL</small></span>
          </a>
          <button class="sidebar-collapse" type="button" data-action="toggle-sidebar" aria-label="${appState.sidebarCollapsed ? 'Expand' : 'Collapse'} sidebar">
            <span aria-hidden="true">${appState.sidebarCollapsed ? '›' : '‹'}</span>
            <span class="nav-label">${appState.sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}</span>
          </button>
          <div class="nav-scroll">
            ${[...new Set(NAVIGATION.map((item) => item.group))].map((group) => `
              <p class="nav-group-label">${escapeHTML(group)}</p>
              <nav class="primary-nav" aria-label="${escapeHTML(group)}">${renderNavigation(NAVIGATION.filter((item) => item.group === group), appState.screen)}</nav>
            `).join('')}
          </div>
          <div class="sidebar-footer">
            <div class="sidebar-mode" title="${escapeHTML(SIMULATION_PROFILE.label)}">
              <span class="mode-dot"></span>
              <span class="nav-label"><strong>SIMULATION MODE</strong><small>NASA data not connected</small></span>
            </div>
            <nav class="support-nav" aria-label="Data and support">
              ${renderNavigation(SUPPORT_NAVIGATION, appState.screen)}
            </nav>
            <div class="sidebar-crew"><span class="crew-avatar">LC</span><span class="nav-label"><strong>Flight crew</strong><small>${mission.crew} crew · Day ${mission.day}</small></span></div>
          </div>
        </aside>

        <div class="workspace">
          <header class="top-header">
            <div class="header-left">
              <button class="mobile-menu" type="button" data-action="toggle-drawer" aria-label="${appState.drawerOpen ? 'Close' : 'Open'} mission navigation"
                aria-expanded="${appState.drawerOpen}" aria-controls="mission-navigation"><span></span><span></span><span></span></button>
              <div class="breadcrumb"><span>MISSION CONTROL</span><span class="breadcrumb-divider">/</span><strong>${escapeHTML(TITLES[appState.screen])}</strong></div>
            </div>
            <div class="header-status">
              <div class="header-day"><span>MISSION DAY</span><strong>${String(mission.day).padStart(2, '0')} <i>/ ${String(mission.duration).padStart(2, '0')}</i></strong><small>${mission.paused ? 'PAUSED' : 'MANUAL'}</small></div>
              <span class="status-pill ${escapeHTML(statusClass)}"><span></span>${escapeHTML(mission.phase)}</span>
              <span class="data-mode-pill" aria-label="${escapeHTML(SIMULATION_PROFILE.label)}" title="${escapeHTML(SIMULATION_PROFILE.label)}"><span>SIMULATED DATA</span><b>NOT LIVE NASA DATA</b></span>
            </div>
          </header>
          <main class="main-content" id="main-content" tabindex="-1">
            ${appState.toast ? `<div class="toast toast-${escapeHTML(appState.toast.tone)}" role="status" aria-live="polite"><span>${escapeHTML(appState.toast.message)}</span><button type="button" data-action="dismiss-toast" aria-label="Dismiss message">×</button></div>` : ''}
            ${content}
            <footer class="content-footer">
              <span>${escapeHTML(SIMULATION_PROFILE.label)} · EDUCATIONAL SIMULATOR · NOT FOR FLIGHT OR MEDICAL USE</span>
              <button type="button" data-page="data-source">About this data <span aria-hidden="true">↗</span></button>
            </footer>
          </main>
        </div>
      </div>
    `;
  }

  function renderPageHeading(eyebrow, title, description, actions = '') {
    return `
      <div class="page-heading">
        <div><p class="eyebrow">${escapeHTML(eyebrow)}</p><h1>${escapeHTML(title)}</h1><p class="page-description">${description}</p></div>
        ${actions ? `<div class="heading-actions">${actions}</div>` : ''}
      </div>
    `;
  }

  function renderMetricCard(label, value, unit, meta, tone = 'cyan') {
    return `
      <article class="metric-card metric-${tone}">
        <div class="metric-top"><span>${escapeHTML(label)}</span><span class="metric-symbol" aria-hidden="true">${tone === 'amber' ? '◒' : tone === 'violet' ? '⌁' : '◉'}</span></div>
        <div class="metric-value">${escapeHTML(value)}<small>${escapeHTML(unit)}</small></div>
        <div class="metric-meta">${meta}</div>
      </article>
    `;
  }

  function renderResourceCard(resource) {
    const value = Number(appState.mission.resources[resource.key]);
    const initial = Number(appState.mission.initialResources?.[resource.key] ?? resource.initial);
    const fill = percentage(value, initial);
    const riskClass = fill < 20 ? 'danger' : fill < 40 ? 'warning' : 'healthy';
    return `
      <article class="resource-card">
        <div class="resource-card-head"><span class="resource-name">${escapeHTML(resource.label)}</span><span class="resource-health ${riskClass}">${Math.round(fill)}%</span></div>
        <div class="resource-value">${formatNumber(value)}<small>${escapeHTML(resource.unit)}</small></div>
        <div class="meter" role="progressbar" aria-label="${escapeHTML(resource.label)} remaining" aria-valuemin="0" aria-valuemax="${initial}" aria-valuenow="${Math.round(value)}">
          <span class="meter-fill ${riskClass}" style="width:${fill}%"></span>
        </div>
        <div class="resource-foot"><span>${escapeHTML(resource.note)}</span><span>Initial ${formatNumber(initial)} ${escapeHTML(resource.unit)}</span></div>
      </article>
    `;
  }

  function renderDecisionPlanner(compact = false) {
    const selected = appState.selectedDecision;
    return `
      <section class="panel decision-panel ${compact ? 'decision-compact' : ''}">
        <div class="section-heading"><div><p class="eyebrow">COMMAND DECISION</p><h2>Plan today’s operations</h2></div><span class="tag-outline">${escapeHTML(appState.mission.conditions.scenario.durationDays)} DAY SCENARIO</span></div>
        <p class="section-description">Daily demand responds to activity, water policy, and the active scenario. Choose one operating plan.</p>
        <div class="decision-options">
          ${DAILY_DECISIONS.map((decision) => `
            <label class="decision-choice ${selected === decision.id ? 'selected' : ''}">
              <input type="radio" name="daily-decision" value="${escapeHTML(decision.id)}" ${selected === decision.id ? 'checked' : ''} />
              <span class="decision-choice-copy"><strong>${escapeHTML(decision.label)}</strong><small>${escapeHTML(decision.description)}</small></span>
            </label>
          `).join('')}
        </div>
      </section>
    `;
  }

  function renderScenarioCard() {
    const { scenario } = appState.mission.conditions;
    const event = appState.mission.emergency;
    return `
      <article class="panel scenario-card ${event?.severity === 'High' ? 'scenario-high' : ''}">
        <div class="scenario-head"><div class="scenario-icon" aria-hidden="true">${event?.severity === 'High' ? '!' : '↗'}</div><span class="tag ${event ? 'tag-amber' : 'tag-green'}">${event ? `${escapeHTML(event.severity)} PRIORITY` : 'NOMINAL'}</span></div>
        <p class="eyebrow">DAY ${appState.mission.day} SCENARIO</p>
        <h2>${escapeHTML(scenario.title)}</h2>
        <p>${escapeHTML(scenario.trigger)}</p>
        <div class="scenario-cause"><span>TRIGGER</span><strong>${escapeHTML(scenario.id.replaceAll('-', ' '))}</strong><span>DURATION</span><strong>${scenario.durationDays} operations day</strong></div>
        <button class="text-action" type="button" data-page="${event ? 'emergencies' : 'habitat'}">${event ? 'Open response checklist' : 'View habitat status'} <span aria-hidden="true">→</span></button>
      </article>
    `;
  }

  function renderDashboard() {
    const mission = appState.mission;
    const actions = `
      <button class="button button-primary" type="button" data-page="settings">Configure mission <span aria-hidden="true">↗</span></button>
    `;
    return `
      ${renderPageHeading(`MISSION OVERVIEW · ${mission.day}/${mission.duration}`, 'Mission dashboard', 'A real-time view of crew, habitat reserves, and today’s scheduled scenario.', actions)}
      ${renderMissionControls()}
      <div class="metric-grid">
        ${renderMetricCard('Mission day', `${String(mission.day).padStart(2, '0')} / ${String(mission.duration).padStart(2, '0')}`, 'DAY', `<span class="metric-dot"></span>${escapeHTML(mission.difficulty)} profile`)}
        ${renderMetricCard('Crew condition', `${Math.round(mission.astronauts.reduce((sum, member) => sum + member.health, 0) / mission.crew)}`, '%', 'Average crew health · educational model', 'green')}
        ${renderMetricCard('Radiation risk index', `${Math.round(mission.radiation.level)}`, '/ 100', 'Relative index · not a dose', 'amber')}
        ${renderMetricCard('Mission score', `${mission.score}`, 'PTS', 'Scenario performance indicator', 'violet')}
      </div>

      <div class="dashboard-main-grid">
        <section class="panel resources-panel">
          <div class="section-heading"><div><p class="eyebrow">HABITAT INVENTORY</p><h2>Critical resources</h2></div><button class="text-action" type="button" data-page="life-support">Life support details <span aria-hidden="true">→</span></button></div>
          <div class="resource-grid">${RESOURCE_META.map(renderResourceCard).join('')}</div>
        </section>
        ${renderScenarioCard()}
      </div>

      ${renderDecisionPlanner(true)}

      <section class="panel dashboard-trend">
        <div class="section-heading"><div><p class="eyebrow">MISSION ANALYTICS</p><h2>Resource reserve trend · % of initial inventory</h2></div><button class="text-action" type="button" data-page="analytics">Open analytics <span aria-hidden="true">→</span></button></div>
        <p class="section-description">${escapeHTML(SIMULATION_PROFILE.label)}. Each resource is normalized to its starting inventory; native units appear in the analytics table.</p>
        <div class="chart-wrap"><canvas id="resource-chart" aria-label="Chart of all resource reserves as percentages of starting inventory by mission day"></canvas></div>
      </section>
    `;
  }

  function renderSystemCard(label, value, unit, note, state = 'Nominal') {
    const fill = percentage(value, 100);
    return `
      <article class="system-card">
        <div class="system-card-head"><span class="system-icon" aria-hidden="true">◉</span><span class="tag tag-green">${escapeHTML(state)}</span></div>
        <p class="eyebrow">HABITAT SUBSYSTEM</p><h3>${escapeHTML(label)}</h3>
        <div class="system-value">${formatNumber(value)}<small>${escapeHTML(unit)}</small></div>
        <div class="meter"><span class="meter-fill ${fill < 50 ? 'warning' : 'healthy'}" style="width:${fill}%"></span></div>
        <p class="system-note">${escapeHTML(note)}</p>
      </article>
    `;
  }

  function renderHabitat() {
    const { conditions, systems } = appState.mission;
    return `
      ${renderPageHeading('HABITAT TELEMETRY', 'Habitat systems', 'Monitor environmental controls and equipment condition. Exterior scenario estimates are separate from the crew’s shielded cabin.')}
      <div class="habitat-banner">
        <div class="habitat-illustration" aria-hidden="true"><div class="habitat-moon"></div><div class="habitat-earth"></div><div class="habitat-module"></div><div class="habitat-array"></div><div class="habitat-signal"></div></div>
        <div class="habitat-banner-copy"><span class="tag tag-green"><i></i> PRESSURIZED · NOMINAL</span><h2>Surface habitat · Shackleton Outpost</h2><p>Conceptual four-person habitat state for this classroom mission. This is a schematic illustration, not a modeled lunar base design.</p></div>
        <div class="habitat-banner-day"><span>LOCAL SIM TIME</span><strong>DAY ${String(appState.mission.day).padStart(2, '0')}</strong></div>
      </div>
      <div class="system-grid">
        ${renderSystemCard('Solar array health', systems.solarPanels, '%', `Scenario output ${formatNumber(conditions.solarGeneration, 1)} kWh/day · illustrative 25 kW array`)}
        ${renderSystemCard('Water recycler', systems.recycler, '%', `Current recovery efficiency ${Math.round(conditions.recyclerEfficiency * 100)}% · scenario-based`)}
        ${renderSystemCard('Habitat integrity', systems.habitatIntegrity, '%', 'Illustrative structural status index; not a certified engineering margin')}
        ${renderSystemCard('Battery discharge capability', conditions.batteryDischargeFactor * 100, '%', `${formatNumber(appState.mission.resources.battery)} kWh reserve · ${systems.batteryHealth}% subsystem health`)}
      </div>
      <div class="two-column-grid">
        <section class="panel">
          <div class="section-heading"><div><p class="eyebrow">THERMAL & PRESSURE</p><h2>Cabin control targets</h2></div><span class="tag tag-blue">ASSUMPTION</span></div>
          <div class="data-table">
            <div><span>Cabin pressure</span><strong>${conditions.environment.cabinPressureKPa.toFixed(1)} kPa</strong><small>Illustrative control target</small></div>
            <div><span>Cabin temperature</span><strong>${conditions.environment.cabinTemperatureC} °C</strong><small>Controlled habitat estimate</small></div>
            <div><span>Exterior surface estimate</span><strong>${conditions.environment.surfaceTemperatureC} °C</strong><small>Scenario value only; not experienced cabin temperature</small></div>
            <div><span>Communications</span><strong>${conditions.communicationsAvailable ? 'Available' : 'Interrupted'}</strong><small>Scripted relay condition; one operations period</small></div>
          </div>
        </section>
        <section class="panel">
          <div class="section-heading"><div><p class="eyebrow">SCENARIO STATUS</p><h2>${escapeHTML(conditions.scenario.title)}</h2></div><span class="tag tag-amber">DAY ${appState.mission.day}</span></div>
          <p class="body-copy">${escapeHTML(conditions.scenario.trigger)}</p>
          <div class="data-caption"><span class="info-mark">i</span> Duration: ${conditions.scenario.durationDays} simulated operations day. This deterministic event is for comparison, not a probabilistic forecast.</div>
        </section>
      </div>
    `;
  }

  function renderLifeSupport() {
    const mission = appState.mission;
    const conditions = mission.conditions;
    const needs = getDailyResourceNeeds({
      crew: mission.crew,
      difficulty: mission.difficulty,
      recyclerEfficiency: conditions.recyclerEfficiency,
      recyclerPowerDemand: conditions.recyclerPowerDemand,
      oxygenLeakFraction: conditions.oxygenLeakFraction,
      solarGeneration: conditions.solarGeneration,
      modelParameters: mission.modelParameters
    });
    const rows = [
      ['Oxygen metabolic use', `${formatNumber(needs.oxygen)} L/day`, `${mission.modelParameters.oxygenLitersPerPersonDay} L/person-day illustrative rate`],
      ['Fresh water make-up', `${formatNumber(needs.water, 1)} L/day`, `${formatNumber(needs.waterGross, 1)} L/day gross use; ${Math.round(needs.recyclerEfficiency * 100)}% recovery`],
      ['Packaged food', `${formatNumber(needs.food, 1)} kg/day`, `${mission.modelParameters.foodKgPerPersonDay} kg/person-day illustrative ration assumption`],
      ['Electrical demand', `${formatNumber(needs.powerDemand, 1)} kWh/day`, `${mission.modelParameters.basePowerKWhPerDay} kWh/day nominal four-person habitat load assumption`],
      ['Solar generation', `${formatNumber(needs.solarGeneration, 1)} kWh/day`, `${mission.modelParameters.solarGenerationKWhPerDay} kWh/day baseline; adjusted for scenario and system condition`]
    ];
    return `
      ${renderPageHeading('LIFE SUPPORT · DAILY MASS & ENERGY BALANCE', 'Life support', 'Review the model’s daily consumption and recovery assumptions. Values update with crew activity and scenario conditions.')}
      <div class="notice notice-blue"><span class="info-mark">i</span><p><strong>${escapeHTML(SIMULATION_PROFILE.label)}</strong><br />Rates are educational planning assumptions—not measured spacecraft telemetry or a validated habitat design.</p></div>
      <div class="system-grid life-support-grid">
        ${renderSystemCard('Oxygen reserve', mission.resources.oxygen, 'L', `${formatNumber(needs.oxygen)} L/day baseline metabolic use`, mission.resources.oxygen < 4000 ? 'Reserve low' : 'Nominal')}
        ${renderSystemCard('Water inventory', mission.resources.water, 'L', `${formatNumber(needs.water, 1)} L/day net make-up estimate`, mission.resources.water < 15 ? 'Reserve low' : 'Nominal')}
        ${renderSystemCard('Food inventory', mission.resources.food, 'kg', `${formatNumber(needs.food, 1)} kg/day packaged ration estimate`, mission.resources.food < 3 ? 'Reserve low' : 'Nominal')}
        ${renderSystemCard('Life-support system', mission.systems.lifeSupport, '%', 'Illustrative performance index; failure effects are scenario-based')}
      </div>
      <section class="panel">
        <div class="section-heading"><div><p class="eyebrow">DAILY MODEL INPUTS</p><h2>Resource balance · Day ${mission.day}</h2></div><span class="tag tag-blue">EDUCATIONAL MODEL</span></div>
        <div class="data-table">${rows.map(([label, value, note]) => `<div><span>${escapeHTML(label)}</span><strong>${escapeHTML(value)}</strong><small>${escapeHTML(note)}</small></div>`).join('')}</div>
      </section>
      <div class="two-column-grid">
        <section class="panel"><div class="section-heading"><div><p class="eyebrow">OXYGEN</p><h2>Metabolic demand</h2></div></div><p class="body-copy">Crew activity scales oxygen demand. The scenario’s leak fraction is applied to remaining reserve for the active period. No gas-loop physics, suit operations, or emergency oxygen generation is represented.</p></section>
        <section class="panel"><div class="section-heading"><div><p class="eyebrow">WATER</p><h2>Recovery & losses</h2></div></div><p class="body-copy">Gross water use is split into recovered water and net make-up. Filter malfunction lowers recovery for the scheduled scenario; it does not create water from waste.</p></section>
      </div>
    `;
  }

  function renderCrew() {
    return `
      ${renderPageHeading('CREW HEALTH & PERFORMANCE', 'Astronaut crew', 'A simplified educational model tracks crew health and fatigue. It is not a clinical assessment or medical decision tool.')}
      <div class="crew-summary-strip"><div><span>CREW COMPLEMENT</span><strong>${appState.mission.crew} <small>astronauts</small></strong></div><div><span>AVERAGE HEALTH</span><strong>${Math.round(appState.mission.astronauts.reduce((sum, person) => sum + person.health, 0) / appState.mission.crew)}<small>%</small></strong></div><div><span>AVERAGE FATIGUE</span><strong>${Math.round(appState.mission.astronauts.reduce((sum, person) => sum + person.fatigue, 0) / appState.mission.crew)}<small>%</small></strong></div><div><span>ACTIVE SCENARIO</span><strong>${escapeHTML(appState.mission.conditions.scenario.title)}</strong></div></div>
      <div class="crew-card-grid">
        ${appState.mission.astronauts.map((astronaut, index) => `
          <article class="panel astronaut-profile">
            <div class="astronaut-profile-head"><span class="portrait">${escapeHTML(astronaut.name.split(' ').map((part) => part[0]).join(''))}</span><span class="tag ${astronaut.health < 70 ? 'tag-amber' : 'tag-green'}">${escapeHTML(astronaut.status)}</span></div>
            <p class="eyebrow">CREW MEMBER 0${index + 1}</p><h2>${escapeHTML(astronaut.name)}</h2><p class="crew-role">${escapeHTML(astronaut.role)}</p>
            <p class="body-copy">${escapeHTML(astronaut.profile ?? 'Mission crew member profile unavailable.')}</p>
            <p class="crew-role">Current activity: ${escapeHTML(astronaut.activity ?? 'Monitoring habitat systems')}</p>
            <div class="crew-skills">${Object.keys(astronaut.skills ?? {}).map((skill) => `<span class="tag tag-blue">${escapeHTML(skill.replaceAll(/([A-Z])/g, ' $1'))}</span>`).join('')}</div>
            <div class="crew-measure"><div><span>Health index</span><strong>${Math.round(astronaut.health)}%</strong></div><div class="meter"><span class="meter-fill ${astronaut.health < 70 ? 'warning' : 'healthy'}" style="width:${percentage(astronaut.health, 100)}%"></span></div></div>
            <div class="crew-measure"><div><span>Fatigue index</span><strong>${Math.round(astronaut.fatigue)}%</strong></div><div class="meter"><span class="meter-fill ${astronaut.fatigue > 65 ? 'warning' : 'healthy'}" style="width:${percentage(astronaut.fatigue, 100)}%"></span></div></div>
            <p class="data-caption"><span class="info-mark">i</span> ${escapeHTML(SIMULATION_PROFILE.label)}. Fatigue, activity, resource stress, and the relative radiation index affect this simplified model.</p>
          </article>
        `).join('')}
      </div>
    `;
  }

  function renderRadiation() {
    const mission = appState.mission;
    const radiation = appState.mission.radiation;
    const level = Math.min(100, Math.max(0, radiation.level));
    const band = level >= 70 ? 'Elevated scenario' : level >= 45 ? 'Caution band' : 'Baseline band';
    return `
      ${renderPageHeading('ENVIRONMENTAL HAZARD MONITORING', 'Radiation monitoring', 'Track a scenario-based relative risk index and understand its limitations before choosing a crew response.')}
      ${renderMissionControls(true)}
      <div class="radiation-layout">
        <section class="panel radiation-gauge-panel">
          <div class="section-heading"><div><p class="eyebrow">RELATIVE RISK INDEX</p><h2>${escapeHTML(band)}</h2></div><span class="tag ${level >= 70 ? 'tag-amber' : 'tag-blue'}">SIMULATED</span></div>
          <div class="risk-gauge" style="--risk-sweep:${level}%"><div class="risk-gauge-inner"><span>INDEX</span><strong>${level}</strong><small>/ 100</small></div></div>
          <p class="risk-description">${escapeHTML(radiation.message)}</p>
          <div class="risk-bands"><span><i class="risk-low"></i>Baseline 0–44</span><span><i class="risk-mid"></i>Caution 45–69</span><span><i class="risk-high"></i>Elevated 70–100</span></div>
        </section>
        <section class="panel radiation-context">
          <p class="eyebrow">ACTIVE SCENARIO</p><h2>${escapeHTML(appState.mission.conditions.scenario.title)}</h2><p class="body-copy">${escapeHTML(appState.mission.conditions.scenario.trigger)}</p>
          <div class="notice notice-amber"><span class="info-mark">!</span><p><strong>Not a dose or forecast.</strong> The 0–100 index is a teaching device, not a unit such as mSv, a measurement, or an estimate of actual astronaut exposure. The simplified health response cannot predict medical effects.</p></div>
          <div class="data-caption"><span class="info-mark">i</span> Lunar surface radiation depends on particle spectra, shielding geometry, and mission timing. This model does not resolve those conditions.</div>
        </section>
      </div>
      ${renderDecisionPlanner()}
    `;
  }

  function renderEmergencies() {
    const { mission } = appState;
    const scenario = mission.conditions.scenario;
    const emergency = mission.emergency;
    return `
      ${renderPageHeading('MISSION RESPONSE PROCEDURES', 'Mission emergencies', 'Each event has a stated trigger and duration. Responses affect resources or subsystem state; the schedule is scripted for repeatable learning.')}
      ${emergency ? `
        <section class="panel emergency-briefing">
          <div class="emergency-priority"><span class="warning-symbol" aria-hidden="true">!</span><div><p class="eyebrow">${escapeHTML(emergency.severity)} PRIORITY · DAY ${mission.day}</p><h2>${escapeHTML(emergency.title)}</h2></div><span class="tag tag-amber">ACTION REQUIRED</span></div>
          <p class="body-copy">${escapeHTML(emergency.description)}</p>
          <div class="emergency-meta"><div><span>TRIGGER / CAUSE</span><strong>${escapeHTML(scenario.trigger)}</strong></div><div><span>TIME SENSITIVITY</span><strong>${escapeHTML(emergency.timeSensitivity)}</strong></div><div><span>AFFECTED SYSTEMS</span><strong>${emergency.affectedSystems.map(escapeHTML).join(' · ')}</strong></div><div><span>SCENARIO DURATION</span><strong>${scenario.durationDays} simulated operations day</strong></div></div>
          <p class="data-caption"><span class="info-mark">i</span> ${escapeHTML(emergency.resolutionStatus)}. The flight engineer’s system-troubleshooting specialty can reduce the modeled power cost of a repair response; this skill model is illustrative.</p>
          <div class="decision-options emergency-options">
            ${emergency.options.map((option, index) => `
              <label class="decision-choice">
                <input type="radio" name="emergency-choice" value="${escapeHTML(option.id)}" />
                <span class="decision-choice-copy"><strong>${escapeHTML(option.label)}</strong><small>${escapeHTML(option.result)}</small></span>
                <span class="response-cost">${Object.entries(option.resourceDelta ?? {}).map(([key, value]) => `${value > 0 ? '+' : ''}${value} ${escapeHTML(key)}`).join(' · ') || 'No direct stock change'}</span>
              </label>
            `).join('')}
          </div>
          ${renderDecisionPlanner(true)}
          <div class="notice notice-blue"><span class="info-mark">i</span><p>Applying a response updates the modeled system but does not advance mission time. You can review the result before beginning operations.</p></div>
          <div class="advance-row"><p><strong>Choose a response when ready</strong><span>The day remains at ${mission.day} until you explicitly begin operations and advance it.</span></p><button class="button button-primary" type="button" data-action="apply-response">Apply selected response</button></div>
        </section>
      ` : `
        ${renderMissionControls(true)}
        <section class="panel all-clear-panel"><span class="all-clear-icon" aria-hidden="true">✓</span><p class="eyebrow">NO ACTIVE RESPONSE REQUIRED</p><h2>${escapeHTML(scenario.title)}</h2><p class="body-copy">${escapeHTML(scenario.trigger)}</p><div class="data-caption"><span class="info-mark">i</span> Events follow the stored, reproducible scenario seed. No events progress without explicit commander input.</div><button class="button button-primary" type="button" data-page="dashboard">Return to dashboard</button></section>
      `}
    `;
  }

  function renderMissionLog() {
    const entries = [...appState.mission.timeline].reverse();
    return `
      ${renderPageHeading('MISSION CONTROL RECORD', 'Mission log', 'A timestamped record of scripted scenarios, crew decisions, and day-end updates.')}
      <section class="panel mission-timeline">
        <div class="section-heading"><div><p class="eyebrow">FLIGHT DIRECTOR’S LOG</p><h2>${entries.length} mission events</h2></div><span class="tag tag-blue">DAY ${appState.mission.day} / ${appState.mission.duration}</span></div>
        ${entries.length ? `<ol>${entries.map((entry) => `<li><span class="timeline-marker"></span><div><span class="timeline-day">MISSION DAY ${String(entry.day).padStart(2, '0')}</span><h3>${escapeHTML(entry.title)}</h3><p>${escapeHTML(entry.detail)}</p></div></li>`).join('')}</ol>` : '<p class="empty-note">Mission log is empty.</p>'}
      </section>
    `;
  }

  function renderMissionOverview() {
    const mission = appState.mission;
    const progress = percentage(mission.status === 'complete' ? mission.duration : mission.day - 1, mission.duration);
    const objectives = [
      ['Maintain breathable life support', 'Monitor oxygen, water recovery, and system performance.'],
      ['Protect crew health', 'Balance workload, rest, and the active environmental scenario.'],
      ['Manage finite reserves', 'Compare daily demand and generation before advancing each day.'],
      ['Complete the planned mission', `Review the Day ${mission.day} briefing and proceed only when ready.`]
    ];
    return `
      ${renderPageHeading('MISSION CONTROL · COMMAND SUMMARY', 'Mission overview', 'A concise briefing of current objectives, crew, habitat reserves, and the next manual mission action.')}
      ${renderMissionControls()}
      <section class="panel overview-progress">
        <div class="section-heading"><div><p class="eyebrow">MISSION PROGRESS</p><h2>Day ${mission.day} of ${mission.duration}</h2></div><span class="tag ${mission.status === 'active' ? 'tag-blue' : 'tag-green'}">${escapeHTML(mission.status.toUpperCase())}</span></div>
        <div class="mission-progress-track" role="progressbar" aria-label="Completed mission days" aria-valuemin="0" aria-valuemax="${mission.duration}" aria-valuenow="${mission.history.filter((entry) => entry.label?.endsWith('end')).length}"><span style="width:${progress}%"></span></div>
        <p class="section-description">${mission.history.filter((entry) => entry.label?.endsWith('end')).length} of ${mission.duration} mission days recorded. Every transition is manual; the briefing step does not consume resources.</p>
      </section>
      <div class="overview-grid">
        <section class="panel"><div class="section-heading"><div><p class="eyebrow">COMMAND OBJECTIVES</p><h2>Today’s priorities</h2></div></div><ol class="objective-list">${objectives.map(([title, detail], index) => `<li><span>0${index + 1}</span><div><strong>${escapeHTML(title)}</strong><p>${escapeHTML(detail)}</p></div></li>`).join('')}</ol></section>
        <section class="panel"><div class="section-heading"><div><p class="eyebrow">CURRENT BRIEFING</p><h2>${escapeHTML(mission.conditions.scenario.title)}</h2></div><span class="tag tag-amber">SIMULATED SCENARIO</span></div><p class="body-copy">${escapeHTML(mission.conditions.scenario.trigger)}</p><p class="data-caption"><span class="info-mark">i</span> This is a deterministic educational scenario, not a forecast or live environmental observation.</p><button class="button button-quiet" type="button" data-page="${mission.emergency ? 'emergencies' : 'timeline'}">${mission.emergency ? 'Review event response' : 'View mission timeline'} <span aria-hidden="true">→</span></button></section>
      </div>
      <div class="resource-grid">${RESOURCE_META.map(renderResourceCard).join('')}</div>
    `;
  }

  function renderMissionTimeline() {
    const mission = appState.mission;
    const days = Array.from({ length: mission.duration }, (_, index) => index + 1);
    const completedDays = new Set(mission.history.filter((entry) => entry.label?.endsWith('end')).map((entry) => entry.day));
    const eventLog = mission.timeline;
    return `
      ${renderPageHeading('SEVEN-DAY OPERATIONS PLAN', 'Mission timeline', 'Review completed operations, the current scenario briefing, upcoming scripted conditions, and decisions already recorded. Future events are scenario prompts—not forecasts.')}
      ${renderMissionControls(true)}
      <section class="panel mission-timeline mission-day-list">
        <div class="section-heading"><div><p class="eyebrow">DAY-BY-DAY BRIEFING</p><h2>Mission plan · ${mission.duration} days</h2></div><span class="tag tag-blue">MANUAL PROGRESSION</span></div>
        <ol>${days.map((day) => {
          const scenario = getScenarioForDay(day, mission.scenarioSchedule);
          const isCompleted = completedDays.has(day);
          const isCurrent = day === mission.day && mission.status === 'active';
          const decision = mission.decisions.find((entry) => entry.day === day);
          const phase = isCompleted ? 'Completed' : isCurrent ? mission.operationStage === 'briefing' ? 'Current · briefing' : 'Current · operations' : 'Upcoming';
          return `<li class="mission-day-item ${isCurrent ? 'mission-day-current' : ''} ${isCompleted ? 'mission-day-complete' : ''}">
            <span class="timeline-marker" aria-hidden="true"></span>
            <div class="mission-day-content"><div class="mission-day-heading"><span class="timeline-day">DAY ${String(day).padStart(2, '0')}</span><span class="tag ${isCompleted ? 'tag-green' : isCurrent ? 'tag-amber' : 'tag-muted'}">${phase}</span></div>
              <h3>${escapeHTML(scenario.title)}</h3><p>${escapeHTML(scenario.trigger)}</p>
              <div class="mission-day-meta"><span>Scenario duration: ${scenario.durationDays} operations day</span>${decision ? `<span>Decision: ${escapeHTML(decision.decision)}</span>` : ''}</div>
            </div>
          </li>`;
        }).join('')}</ol>
      </section>
      <section class="panel mission-timeline">
        <div class="section-heading"><div><p class="eyebrow">RECORDED MISSION HISTORY</p><h2>${eventLog.length} events</h2></div><button class="text-action" type="button" data-page="mission-log">Open full mission log <span aria-hidden="true">→</span></button></div>
        ${eventLog.length ? `<ol>${[...eventLog].reverse().map((entry) => `<li><span class="timeline-marker"></span><div><span class="timeline-day">MISSION DAY ${String(entry.day).padStart(2, '0')}</span><h3>${escapeHTML(entry.title)}</h3><p>${escapeHTML(entry.detail)}</p></div></li>`).join('')}</ol>` : '<p class="empty-note">No mission events have been recorded.</p>'}
      </section>
    `;
  }

  function renderResourceManagement(resourceKey) {
    const mission = appState.mission;
    const resource = RESOURCE_META.find((item) => item.key === resourceKey);
    const details = RESOURCE_DETAILS[resourceKey];
    const conditions = mission.conditions;
    const needs = getDailyResourceNeeds({
      crew: mission.crew,
      difficulty: mission.difficulty,
      activityFactor: 1 + mission.astronauts.reduce((sum, person) => sum + person.fatigue, 0) / mission.crew / 400,
      recyclerEfficiency: conditions.recyclerEfficiency,
      recyclerPowerDemand: conditions.recyclerPowerDemand,
      oxygenLeakFraction: conditions.oxygenLeakFraction,
      solarGeneration: conditions.solarGeneration,
      modelParameters: mission.modelParameters
    });
    const grossDemand = {
      oxygen: needs.oxygen + mission.resources.oxygen * needs.oxygenLeakFraction,
      water: needs.water,
      food: needs.food,
      power: needs.powerDemand
    }[resourceKey];
    const netPowerDeficit = Math.max(0, needs.powerDemand - needs.solarGeneration);
    const dailyBalance = resourceKey === 'power'
      ? needs.solarGeneration - needs.powerDemand
      : -grossDemand;
    const currentValue = mission.resources[resourceKey];
    const estimatedDays = grossDemand > 0 ? Math.floor(currentValue / grossDemand) : null;
    const progress = percentage(currentValue, mission.initialResources[resourceKey]);
    return `
      ${renderPageHeading('HABITAT RESOURCE CONTROL', details.title, details.description)}
      <div class="notice notice-blue"><span class="info-mark">i</span><p><strong>${escapeHTML(SIMULATION_PROFILE.label)}</strong><br />All rates are model outputs from documented educational assumptions and the active scenario.</p></div>
      <div class="resource-detail-grid">
        <section class="panel resource-detail-primary"><p class="eyebrow">CURRENT INVENTORY</p><h2>${formatNumber(currentValue, resourceKey === 'water' ? 1 : 0)} <small>${escapeHTML(resource.unit)}</small></h2><div class="meter" role="progressbar" aria-label="${escapeHTML(resource.label)} remaining" aria-valuemin="0" aria-valuemax="${mission.initialResources[resourceKey]}" aria-valuenow="${currentValue}"><span class="meter-fill ${progress < 20 ? 'danger' : progress < 40 ? 'warning' : 'healthy'}" style="width:${progress}%"></span></div><p>${Math.round(progress)}% of configured starting ${escapeHTML(resource.label.toLowerCase())} inventory</p></section>
        <section class="panel resource-detail-stat"><p class="eyebrow">${resourceKey === 'power' ? 'NET ENERGY BALANCE' : 'ESTIMATED DAILY USE'}</p><h2>${resourceKey === 'power' ? `${dailyBalance >= 0 ? '+' : ''}${formatNumber(dailyBalance, 1)} kWh/day` : `${formatNumber(grossDemand, resourceKey === 'food' || resourceKey === 'water' ? 2 : 0)} ${escapeHTML(resource.unit)}/day`}</h2><p>${resourceKey === 'power' ? 'Solar generation minus modeled electrical demand' : `${escapeHTML(SIMULATION_PROFILE.label)} · active scenario included`}</p></section>
        <section class="panel resource-detail-stat"><p class="eyebrow">SIMPLE RESERVE ESTIMATE</p><h2>${resourceKey === 'power' ? `${formatNumber(mission.resources.power + mission.resources.battery, 1)} kWh` : estimatedDays === null ? '—' : `${estimatedDays} days`}</h2><p>${resourceKey === 'power' ? `Power reserve + battery. Current deficit: ${formatNumber(netPowerDeficit, 1)} kWh/day.` : 'Current inventory divided by today’s modeled demand; not a safety guarantee.'}</p></section>
      </div>
      <section class="panel">
        <div class="section-heading"><div><p class="eyebrow">ACTIVE CONDITIONS</p><h2>${escapeHTML(conditions.scenario.title)}</h2></div><span class="tag tag-amber">SCENARIO-BASED</span></div>
        <p class="body-copy">${escapeHTML(conditions.scenario.trigger)}</p>
        <div class="data-table">${resourceKey === 'oxygen'
          ? `<div><span>Metabolic demand</span><strong>${formatNumber(needs.oxygen)} L/day</strong><small>${mission.modelParameters.oxygenLitersPerPersonDay} L/person-day × ${mission.crew} crew, activity-adjusted</small></div><div><span>Scenario leak fraction</span><strong>${formatNumber(needs.oxygenLeakFraction * 100, 1)}%</strong><small>Applied to available reserve for this modeled operations period</small></div>`
          : resourceKey === 'water'
            ? `<div><span>Gross use</span><strong>${formatNumber(needs.waterGross, 1)} L/day</strong><small>${mission.modelParameters.grossWaterLitersPerPersonDay} L/person-day × ${mission.crew} crew</small></div><div><span>Recovery efficiency</span><strong>${Math.round(needs.recyclerEfficiency * 100)}%</strong><small>Effective scenario recovery; make-up estimate also includes illustrative handling losses</small></div>`
            : resourceKey === 'food'
              ? `<div><span>Ration assumption</span><strong>${mission.modelParameters.foodKgPerPersonDay} kg/person-day</strong><small>Packaged food estimate, difficulty-adjusted</small></div><div><span>Crew complement</span><strong>${mission.crew}</strong><small>Current mission crew; no menu or individual nutrition model</small></div>`
              : `<div><span>Solar generation</span><strong>${formatNumber(needs.solarGeneration, 1)} kWh/day</strong><small>Baseline array model adjusted by the active scenario</small></div><div><span>Habitat demand</span><strong>${formatNumber(needs.powerDemand, 1)} kWh/day</strong><small>Illustrative nominal load, crew activity, difficulty, and system loads</small></div>`
        }</div>
        <p class="body-copy">${escapeHTML(details.explanation)}</p>
        <button class="button button-quiet" type="button" data-page="settings">Adjust educational model parameters <span aria-hidden="true">→</span></button>
      </section>
    `;
  }

  function renderCrewHealth() {
    const mission = appState.mission;
    const average = (key) => mission.astronauts.reduce((sum, person) => sum + person[key], 0) / mission.crew;
    return `
      ${renderPageHeading('CREW STATUS & CONDITION', 'Crew health', 'Review the model’s crew health and fatigue indices, including their changes across recorded mission days. These indices are not medical assessments.')}
      <div class="metric-grid">${renderMetricCard('Average health index', Math.round(average('health')), '%', 'Educational status indicator', 'green')}${renderMetricCard('Average fatigue index', Math.round(average('fatigue')), '%', 'Workload/rest teaching model', 'amber')}${renderMetricCard('Crew alerts', mission.astronauts.filter((person) => person.health < 80 || person.fatigue > 65).length, 'MEMBERS', 'Index thresholds only; not clinical alerts', 'violet')}</div>
      <section class="panel">
        <div class="section-heading"><div><p class="eyebrow">INDIVIDUAL CREW STATUS</p><h2>Current crew complement</h2></div><span class="tag tag-amber">NOT MEDICAL DATA</span></div>
        <div class="table-scroll"><table><thead><tr><th>ASTRONAUT</th><th>ROLE</th><th>HEALTH INDEX</th><th>FATIGUE INDEX</th><th>STATUS</th></tr></thead><tbody>${mission.astronauts.map((person) => `<tr><td>${escapeHTML(person.name)}</td><td>${escapeHTML(person.role)}</td><td>${formatNumber(person.health)}%</td><td>${formatNumber(person.fatigue)}%</td><td>${escapeHTML(person.status)}</td></tr>`).join('')}</tbody></table></div>
      </section>
      <section class="panel"><div class="section-heading"><div><p class="eyebrow">CREW HEALTH HISTORY</p><h2>Recorded average health index</h2></div><span class="tag tag-blue">SIMULATED</span></div><div class="chart-wrap chart-large"><canvas id="crew-health-chart" aria-label="Average simulated crew health index by recorded mission day"></canvas></div><div class="table-scroll"><table><thead><tr><th>MISSION RECORD</th><th>DAY</th><th>AVERAGE HEALTH INDEX</th><th>SCENARIO</th></tr></thead><tbody>${mission.history.map((entry) => `<tr><td>${escapeHTML(entry.label ?? 'Mission record')}</td><td>${entry.day}</td><td>${formatNumber(entry.averageCrewHealth ?? 100, 1)}%</td><td>${escapeHTML(entry.scenarioTitle ?? 'Mission start')}</td></tr>`).join('')}</tbody></table></div><p class="data-caption"><span class="info-mark">i</span> The model uses simplified workload, resource-stress, and scenario inputs. It does not predict medical effects or represent individual biological responses.</p></section>
    `;
  }

  function renderMissionDecisions() {
    const mission = appState.mission;
    const decision = DAILY_DECISIONS.find((item) => item.id === appState.selectedDecision) ?? DAILY_DECISIONS[0];
    const needs = getDailyResourceNeeds({
      crew: mission.crew,
      difficulty: mission.difficulty,
      activityFactor: decision.activityFactor,
      waterUseFactor: decision.waterUseFactor,
      powerDemandFactor: decision.powerDemandFactor,
      recyclerEfficiency: mission.conditions.recyclerEfficiency,
      recyclerPowerDemand: mission.conditions.recyclerPowerDemand,
      oxygenLeakFraction: mission.conditions.oxygenLeakFraction,
      solarGeneration: mission.conditions.solarGeneration,
      modelParameters: mission.modelParameters
    });
    const emergencyLink = mission.emergency
      ? '<button class="button button-quiet" type="button" data-page="emergencies">Review event and response options <span aria-hidden="true">→</span></button>'
      : '';
    return `
      ${renderPageHeading('MISSION COMMAND · TRADE-OFF REVIEW', 'Mission decisions', 'Choose an operating plan and compare its modeled resource effects before you manually begin or close the mission day.')}
      ${renderMissionControls()}
      <div class="notice notice-blue"><span class="info-mark">i</span><p>The preview below is a simplified daily estimate. It does not include every later crew, equipment, or emergency-response effect.</p></div>
      ${renderDecisionPlanner()}
      <section class="panel">
        <div class="section-heading"><div><p class="eyebrow">SELECTED PLAN PREVIEW</p><h2>${escapeHTML(decision.label)}</h2></div><span class="tag tag-amber">SIMULATED ESTIMATE</span></div>
        <div class="data-table">
          <div><span>Oxygen demand</span><strong>${formatNumber(needs.oxygen, 1)} L/day</strong><small>Activity-adjusted metabolic estimate${formatNumber(needs.oxygenLeakFraction * 100, 1)}% leak scenario applies to reserve</small></div>
          <div><span>Water make-up</span><strong>${formatNumber(needs.water, 1)} L/day</strong><small>Current recovery efficiency ${Math.round(needs.recyclerEfficiency * 100)}%; selected plan applied</small></div>
          <div><span>Food demand</span><strong>${formatNumber(needs.food, 2)} kg/day</strong><small>Difficulty-adjusted packaged ration estimate</small></div>
          <div><span>Electrical demand</span><strong>${formatNumber(needs.powerDemand, 1)} kWh/day</strong><small>Current scenario solar input ${formatNumber(needs.solarGeneration, 1)} kWh/day</small></div>
          <div><span>Radiation action</span><strong>${decision.radiationReduction ? `Relative index reduction ${decision.radiationReduction}` : 'No direct change'}</strong><small>Dimensionless classroom model only; not a radiation dose</small></div>
        </div>
        ${emergencyLink}
      </section>
    `;
  }

  function renderSurfaceConditions() {
    const mission = appState.mission;
    return `
      ${renderPageHeading('LUNAR ENVIRONMENT · HABITAT CONTEXT', 'Lunar surface conditions', 'Separate the modeled exterior surface scenario from the controlled cabin targets. Archived Diviner observations are explored on the NASA Data Explorer page.')}
      <div class="notice notice-amber"><span class="info-mark">!</span><p><strong>Scenario estimate, not live surface telemetry.</strong> The current exterior temperature value is a scripted educational scenario input. It does not represent a habitat interior reading.</p></div>
      <div class="environment-readings">
        <div><span>Exterior surface temperature · scenario</span><strong>${formatNumber(mission.conditions.environment.surfaceTemperatureC)} °C</strong><em>SIMULATED DATA</em></div>
        <div><span>Cabin temperature target</span><strong>${formatNumber(mission.conditions.environment.cabinTemperatureC, 1)} °C</strong><em>ILLUSTRATIVE ASSUMPTION</em></div>
        <div><span>Cabin pressure target</span><strong>${formatNumber(mission.conditions.environment.cabinPressureKPa, 1)} kPa</strong><em>ILLUSTRATIVE ASSUMPTION</em></div>
      </div>
      <section class="panel"><div class="section-heading"><div><p class="eyebrow">ACTIVE ENVIRONMENTAL SCENARIO</p><h2>${escapeHTML(mission.conditions.scenario.title)}</h2></div><span class="tag tag-blue">DAY ${mission.day}</span></div><p class="body-copy">${escapeHTML(mission.conditions.scenario.trigger)}</p><p class="body-copy">Surface temperature varies substantially with location, time, terrain, and illumination. A surface measurement cannot be treated as an indoor habitat temperature; the cabin values displayed here are example control targets, not telemetry.</p><button class="button button-quiet" type="button" data-page="nasa-explorer">Explore archived NASA observations <span aria-hidden="true">→</span></button></section>
    `;
  }

  function renderSunlightConditions() {
    const mission = appState.mission;
    const schedule = Array.from({ length: mission.duration }, (_, index) => index + 1);
    return `
      ${renderPageHeading('LUNAR ENVIRONMENT · POWER CONTEXT', 'Sunlight and shadow', 'See how the educational scenario schedule changes the modeled solar input. No illumination map or real-time solar forecast is included in this simulation.')}
      <div class="notice notice-blue"><span class="info-mark">i</span><p><strong>${escapeHTML(SIMULATION_PROFILE.label)}</strong><br />The power estimate is an illustrative array-output assumption adjusted by scripted scenario factors. It is not calculated from lunar terrain, date, panel orientation, or live illumination.</p></div>
      <section class="panel"><div class="section-heading"><div><p class="eyebrow">SIMULATED ARRAY OUTPUT</p><h2>Day-by-day solar scenario factors</h2></div><span class="tag tag-amber">ILLUSTRATIVE ASSUMPTION</span></div>
        <div class="table-scroll"><table><thead><tr><th>DAY</th><th>SCENARIO</th><th>MODELED FACTOR</th><th>MODELED GENERATION</th><th>DATA TYPE</th></tr></thead><tbody>${schedule.map((day) => {
          const scenario = getScenarioForDay(day, mission.scenarioSchedule);
          const factor = day === mission.day
            ? mission.conditions.solarGeneration / (mission.modelParameters.solarGenerationKWhPerDay || 1)
            : scenario.solarFactor ?? 1;
          const generation = day === mission.day
            ? mission.conditions.solarGeneration
            : mission.modelParameters.solarGenerationKWhPerDay * factor;
          return `<tr><td>Day ${day}${day === mission.day ? ' · current' : ''}</td><td>${escapeHTML(scenario.title)}</td><td>${formatNumber(factor * 100, 0)}%</td><td>${formatNumber(generation, 1)} kWh/day</td><td>Scenario-based estimate</td></tr>`;
        }).join('')}</tbody></table></div>
        <p class="body-copy">A NASA Goddard Scientific Visualization Studio animation demonstrates how LOLA elevation data and JPL ephemeris support south-pole illumination simulations. It is linked as external educational context; it is not ingested into this mission’s power calculation.</p>
        <a class="button button-quiet" href="https://svs.gsfc.nasa.gov/5027" target="_blank" rel="noreferrer">Open NASA south-pole illumination visualization <span aria-hidden="true">↗</span></a>
      </section>
    `;
  }

  function renderNASAExplorer() {
    return `
      ${renderPageHeading('ARCHIVED SCIENCE · SOURCE-AWARE EXPLORER', 'NASA Data Explorer', 'Browse a locally bundled, historical NASA LRO Diviner surface observation and inspect its source, time coverage, representation, and limits. It does not control habitat calculations.')}
      <div class="notice notice-green"><span class="info-mark">✓</span><p><strong>NASA data successfully integrated: one historical browse image.</strong><br />The mission simulation remains in Simulation Mode. The NASA observation is a real archived surface product, not live or numeric in-habitat data.</p></div>
      <p class="dataset-load-status" data-nasa-image-status role="status">Diviner browse image is bundled locally and will be checked when displayed.</p>
      <section class="panel nasa-observation">
        <div class="section-heading"><div><p class="eyebrow">REAL NASA DATA — HISTORICAL MEASUREMENTS</p><h2>${escapeHTML(NASA_DIVINER_MOSAIC.title)}</h2></div><span class="tag tag-blue">BUNDLED BROWSE IMAGE</span></div>
        <p class="body-copy">This is the actual PDS JPEG browse rendering linked to an underlying derived Diviner data product. The image is bundled locally and will display offline. Numeric pixel measurements are not extracted or used by the simulator.</p>
        <figure class="nasa-figure">
          <a href="${escapeHTML(NASA_DIVINER_MOSAIC.sourceUrl)}" target="_blank" rel="noreferrer"><img data-nasa-image src="${escapeHTML(APP_BASE_PATH)}${escapeHTML(NASA_DIVINER_MOSAIC.localImagePath)}" alt="${escapeHTML(NASA_DIVINER_MOSAIC.localImageAlt)}" loading="lazy" /></a>
          <figcaption>${escapeHTML(NASA_DIVINER_MOSAIC.datasetName)} · NASA Planetary Data System Geosciences Node · <a href="${escapeHTML(NASA_DIVINER_MOSAIC.metadataUrl)}" target="_blank" rel="noreferrer">Open PDS product label</a></figcaption>
        </figure>
        <div class="nasa-metadata-grid">
          <div><span>Mission / instrument</span><strong>Lunar Reconnaissance Orbiter / Diviner Lunar Radiometer Experiment</strong></div>
          <div><span>Measurement</span><strong>Bolometric temperature at midnight; rendered browse product</strong></div>
          <div><span>Collection period</span><strong>${escapeHTML(NASA_DIVINER_MOSAIC.collectionPeriod)}</strong></div>
          <div><span>Spatial coverage</span><strong>${escapeHTML(NASA_DIVINER_MOSAIC.spatialApplicability)}</strong></div>
          <div><span>Units</span><strong>Browse JPEG only; no calibrated numeric table or units are extracted</strong></div>
          <div><span>Use / limitations</span><strong>${escapeHTML(NASA_DIVINER_MOSAIC.limitations)}</strong></div>
        </div>
      </section>
      <section class="panel">
        <div class="section-heading"><div><p class="eyebrow">NASA DATA STATUS</p><h2>Integrated vs. linked sources</h2></div><span class="tag tag-amber">MODE B UNAVAILABLE</span></div>
        <div class="dataset-status-list">
          <div><span class="tag tag-green">INTEGRATED · LOCAL FILE</span><div><h3>LRO Diviner derived browse mosaic</h3><p>Verified PDS label and locally bundled JPEG. Historical lunar-surface context only; not wired into habitat simulation.</p></div></div>
          <div><span class="tag tag-muted">SOURCE LINK · NOT INTEGRATED</span><div><h3>LRO CRaTER archive</h3><p>Official instrument bundle is linked for exploration. No calibrated CRaTER measurements are currently bundled or adapted into the habitat model.</p><a href="https://pds.nasa.gov/ds-view/pds/viewBundle.jsp?identifier=urn%3Anasa%3Apds%3Alro-crater&amp;version=1.6" target="_blank" rel="noreferrer">Open NASA PDS CRaTER bundle <span aria-hidden="true">↗</span></a></div></div>
          <div><span class="tag tag-muted">VISUALIZATION LINK · NOT INTEGRATED</span><div><h3>South-pole illumination / LOLA context</h3><p>NASA SVS describes a 2025–2028 lighting visualization based on LRO LOLA terrain and JPL DE421 ephemeris. Its frame data are not bundled or used for power predictions here.</p><a href="https://svs.gsfc.nasa.gov/5027" target="_blank" rel="noreferrer">Open NASA SVS 5027 source <span aria-hidden="true">↗</span></a></div></div>
        </div>
        <div class="unavailable-reason"><strong>Why NASA Data Mode cannot run the mission</strong><span>Available archive content is surface context, not compatible cabin telemetry, life-support demand, or shielded crew dose. NASA data never replaces simulated mission values.</span></div>
      </section>
    `;
  }

  function renderAnalytics() {
    const history = appState.mission.history;
    const current = appState.mission.resources;
    return `
      ${renderPageHeading('MISSION DATA REVIEW', 'Mission analytics', 'Compare normalized resource trajectories and scenario inputs. Percentage values allow cross-resource trend comparison; source units stay in the table.')}
      <section class="panel analytics-chart-panel">
        <div class="section-heading"><div><p class="eyebrow">RESERVE HISTORY</p><h2>Mission resource trend</h2></div><span class="tag tag-blue">${escapeHTML(SIMULATION_PROFILE.label)}</span></div>
        <p class="section-description">${escapeHTML(SIMULATION_PROFILE.label)}. Charted as percent of starting inventory so each resource remains readable; source units are shown in the table below.</p>
        <div class="chart-wrap chart-large"><canvas id="analytics-chart" aria-label="Simulated resource history by mission day"></canvas></div>
      </section>
      <section class="panel analytics-table-panel">
        <div class="section-heading"><div><p class="eyebrow">DAY-BY-DAY DATA</p><h2>Recorded scenario output</h2></div><span class="tag tag-amber">SCENARIO-BASED ESTIMATE</span></div>
        <div class="table-scroll"><table><thead><tr><th>DAY / PHASE</th><th>OXYGEN · L</th><th>USE · L/DAY</th><th>WATER · L</th><th>MAKE-UP · L/DAY</th><th>FOOD · KG</th><th>USE · KG/DAY</th><th>POWER · KWH</th><th>BATTERY · KWH</th><th>SOLAR · KWH/DAY</th><th>LOAD · KWH/DAY</th><th>RADIATION INDEX</th><th>SCENARIO</th></tr></thead><tbody>
          ${history.map((entry) => `<tr><td>${escapeHTML(entry.label ?? `Day ${String(entry.day).padStart(2, '0')}`)}</td><td>${formatNumber(entry.oxygen)}</td><td>${entry.oxygenUse == null ? '—' : formatNumber(entry.oxygenUse)}</td><td>${formatNumber(entry.water, 1)}</td><td>${entry.waterMakeup == null ? '—' : formatNumber(entry.waterMakeup, 1)}</td><td>${formatNumber(entry.food, 1)}</td><td>${entry.foodUse == null ? '—' : formatNumber(entry.foodUse, 1)}</td><td>${formatNumber(entry.power, 1)}</td><td>${formatNumber(entry.battery, 1)}</td><td>${formatNumber(entry.solarGeneration, 1)}</td><td>${entry.powerDemand == null ? '—' : formatNumber(entry.powerDemand, 1)}</td><td>${formatNumber(entry.radiationIndex ?? 0)}</td><td>${escapeHTML(entry.scenarioTitle ?? 'Mission state')}</td></tr>`).join('')}
        </tbody></table></div>
        <p class="table-footnote">Current reserves: O₂ ${formatNumber(current.oxygen)} L · H₂O ${formatNumber(current.water, 1)} L · provisions ${formatNumber(current.food, 1)} kg · power ${formatNumber(current.power, 1)} kWh.</p>
      </section>
    `;
  }

  function renderReport() {
    const report = appState.report || appState.mission.report || buildMissionReport(appState.mission);
    const hasFinalReport = Boolean(appState.mission.report);
    return `
      ${renderPageHeading('MISSION DEBRIEF', hasFinalReport ? 'Final mission report' : 'Mission progress report', hasFinalReport ? 'Review the outcome, resource balance, and lessons from this simulated mission.' : 'A final assessment is generated after the configured mission duration. Current estimates are available below.')}
      <section class="panel report-hero ${hasFinalReport && report.status === 'Mission Failure' ? 'report-failure' : ''}">
        <div class="report-hero-mark" aria-hidden="true">${hasFinalReport ? '✦' : '◷'}</div><p class="eyebrow">${hasFinalReport ? 'MISSION OUTCOME' : 'IN PROGRESS'}</p><h2>${escapeHTML(hasFinalReport ? report.status : 'Mission underway')}</h2>
        <p>${hasFinalReport ? 'The mission scenario is complete. This score reflects the simulator’s own simplified model.' : `Day ${appState.mission.day} of ${appState.mission.duration} · no final score has been issued.`}</p>
        <div class="report-score"><strong>${hasFinalReport ? report.score : '—'}</strong><span>SIMULATION<br />SCORE</span></div>
      </section>
      <div class="report-stat-grid">
        <div class="report-stat"><span>Days reached</span><strong>${report.dayReached}<small> / ${report.duration}</small></strong></div>
        <div class="report-stat"><span>Crew status</span><strong>${report.astronautStatus.filter((person) => person.health > 0).length}<small> / ${report.astronautStatus.length} well</small></strong></div>
        <div class="report-stat"><span>Data provenance</span><strong>Simulated<small> · not NASA data</small></strong></div>
      </div>
      <section class="panel report-content">
        <div class="section-heading"><div><p class="eyebrow">RESOURCE USE</p><h2>Remaining inventory</h2></div><button class="text-action" type="button" data-page="analytics">Open analytics <span aria-hidden="true">→</span></button></div>
        <div class="report-resource-list">${Object.entries(report.remainingResources).map(([key, value]) => `<div><span>${escapeHTML(key)}</span><strong>${formatNumber(value, 1)} <small>${key === 'oxygen' ? 'L' : key === 'water' ? 'L' : key === 'food' ? 'kg' : 'kWh'}</small></strong></div>`).join('')}</div>
        <div class="report-lessons"><p class="eyebrow">LESSONS LEARNED</p><ul>${report.lessons.map((lesson) => `<li>${escapeHTML(lesson)}</li>`).join('')}</ul></div>
        <p class="data-caption"><span class="info-mark">i</span> ${escapeHTML(report.dataNotice)}. Outcomes are pedagogical only and do not establish real mission safety or feasibility.</p>
      </section>
    `;
  }

  function renderDataSource() {
    const assumptions = SIMULATION_PROFILE.assumptions;
    const nasaAvailable = isNASADataModeAvailable();
    return `
      ${renderPageHeading('DATA PROVENANCE & MODEL TRANSPARENCY', 'Data source & mode', 'The mission remains a local educational simulation. A verified, archived NASA lunar-surface observation is included for scientific context—not as habitat telemetry.')}
      <div class="data-mode-grid">
        <section class="panel data-mode-card active-mode">
          <span class="mode-check">✓</span><span class="tag tag-green">ACTIVE</span><p class="eyebrow">MODE 01</p><h2>Simulation Mode</h2><p>Local, reproducible scenario schedule generated from documented educational assumptions. It runs without a network connection.</p><div class="mode-data-label">${escapeHTML(SIMULATION_PROFILE.label)}</div>
        </section>
        <section class="panel data-mode-card unavailable-mode">
          <span class="tag tag-muted">${nasaAvailable ? 'CONFIGURED' : 'ARCHIVE ONLY'}</span><p class="eyebrow">MODE 02</p><h2>NASA Data Mode</h2><p>NASA’s archived lunar-surface data is available below as a read-only reference. It is not compatible with in-habitat life-support calculations and never replaces simulated mission values.</p><button class="button button-disabled" type="button" disabled aria-disabled="true">Mission telemetry integration · unavailable</button>
          <div class="unavailable-reason"><strong>Why unavailable?</strong><span>The integrated observation measures lunar surface conditions, not a shielded habitat interior, crew dose, or spacecraft system performance. No mission calculations are labeled as NASA data.</span></div>
        </section>
      </div>
      <section class="panel nasa-observation">
        <div class="section-heading"><div><p class="eyebrow">VERIFIED ARCHIVED OBSERVATION · NASA PDS</p><h2>${escapeHTML(NASA_DIVINER_MOSAIC.title)}</h2></div><span class="tag tag-blue">LUNAR SURFACE · NOT LIVE</span></div>
        <p class="body-copy">The Lunar Reconnaissance Orbiter’s Diviner instrument maps lunar surface temperature. This bundled PDS browse image is an archived global mosaic; it is not an in-cabin reading and is not used to calculate mission resources or crew health.</p>
        <figure class="nasa-figure">
          <a href="${escapeHTML(NASA_DIVINER_MOSAIC.sourceUrl)}" target="_blank" rel="noreferrer"><img data-nasa-image src="${escapeHTML(APP_BASE_PATH)}${escapeHTML(NASA_DIVINER_MOSAIC.localImagePath)}" alt="${escapeHTML(NASA_DIVINER_MOSAIC.localImageAlt)}" loading="lazy" /></a>
          <figcaption>${escapeHTML(NASA_DIVINER_MOSAIC.datasetName)} · Source: <a href="${escapeHTML(NASA_DIVINER_MOSAIC.metadataUrl)}" target="_blank" rel="noreferrer">NASA PDS product label</a></figcaption>
        </figure>
        <div class="nasa-metadata-grid">
          <div><span>Instrument</span><strong>LRO Diviner Lunar Radiometer Experiment</strong></div>
          <div><span>Collection period</span><strong>${escapeHTML(NASA_DIVINER_MOSAIC.collectionPeriod)}</strong></div>
          <div><span>Spatial coverage</span><strong>${escapeHTML(NASA_DIVINER_MOSAIC.spatialApplicability)}</strong></div>
          <div><span>Limitations</span><strong>${escapeHTML(NASA_DIVINER_MOSAIC.limitations)}</strong></div>
        </div>
        <a class="button button-quiet nasa-source-link" href="https://pds-geosciences.wustl.edu/missions/lro/diviner.htm" target="_blank" rel="noreferrer">Open the NASA PDS Diviner archive <span aria-hidden="true">↗</span></a>
      </section>
      <section class="panel">
        <div class="section-heading"><div><p class="eyebrow">MODEL CARD</p><h2>Illustrative engineering assumptions</h2></div><span class="tag tag-blue">VERSION 3</span></div>
        <div class="assumption-list">${assumptions.map((assumption, index) => `<div><span class="assumption-index">0${index + 1}</span><p>${escapeHTML(assumption)}</p></div>`).join('')}</div>
      </section>
      <div class="two-column-grid">
      <section class="panel"><p class="eyebrow">DATA CLASSIFICATION</p><h2>Measured vs. modeled</h2><div class="legend-explainer"><div><span class="legend-swatch measured"></span><p><strong>Measured</strong><small>The NASA archive image above is an actual historical lunar-surface observation. It is read-only and not an in-habitat value.</small></p></div><div><span class="legend-swatch simulated"></span><p><strong>Simulated</strong><small>Mission resources, crew condition, and scenario effects are generated by the local educational model.</small></p></div><div><span class="legend-swatch assumption"></span><p><strong>Assumption</strong><small>An illustrative design input that is explicitly identified and documented.</small></p></div></div></section>
        <section class="panel"><p class="eyebrow">FUTURE DATA INTEGRATION</p><h2>Validation before visualization</h2><p class="body-copy">The application separates scenario generation, external-data adaptation, validation, mission calculations, and rendering. A verified dataset must be relevant to the specific variable; lunar surface measurements do not directly describe conditions inside a shielded habitat.</p></section>
      </div>
    `;
  }

  function renderSettings() {
    return `
      ${renderPageHeading('MISSION CONFIGURATION', 'Settings', 'Adjust the active simulation rates and resource inventory. Active model settings affect upcoming operations; new mission settings replace current progress.')}
      <div class="settings-grid">
        <form class="panel config-form" id="mission-config">
          <div class="section-heading"><div><p class="eyebrow">MISSION PROFILE</p><h2>Scenario setup</h2></div><span class="tag tag-blue">SIMULATION MODE</span></div>
          <label>Mission duration <span class="input-with-unit"><input name="days" type="number" min="1" max="7" step="1" value="${appState.mission.duration}" required /><small>days · maximum 7</small></span></label>
          <label>Crew size <span class="input-with-unit"><input name="crew" type="number" min="1" max="4" step="1" value="${appState.mission.crew}" required /><small>astronauts · maximum 4</small></span></label>
          <label>Mission difficulty <select name="difficulty">${MISSION_DIFFICULTIES.map((difficulty) => `<option value="${escapeHTML(difficulty)}" ${appState.mission.difficulty === difficulty ? 'selected' : ''}>${escapeHTML(difficulty)}</option>`).join('')}</select><small>Difficulty scales modeled resource demand and radiation index.</small></label>
          <div class="config-inventory"><p class="eyebrow">STARTING INVENTORY · CONFIGURABLE</p>${renderStartingResourceFields(appState.mission.initialResources)}</div>
          <button class="button button-primary" type="submit">Launch new mission <span aria-hidden="true">→</span></button>
        </form>
        <div class="settings-aside">
          <form class="panel config-form model-controls-form" id="live-model-config">
            <div class="section-heading"><div><p class="eyebrow">ACTIVE SIMULATION · DAY ${appState.mission.day}</p><h2>Mission model controls</h2></div><span class="tag tag-green">EDITABLE</span></div>
            <p class="section-description">These assumptions drive the next day’s resource balance. Applying them preserves the mission’s past records.</p>
            <div class="model-parameter-grid">${renderModelParameterFields(appState.mission.modelParameters ?? DEFAULT_MODEL_PARAMETERS)}</div>
            <div class="model-preview" id="model-preview" aria-live="polite">${renderModelPreview(appState.mission.modelParameters, appState.mission.crew, appState.mission.difficulty)}</div>
            <button class="button button-primary" type="submit">Apply to active mission</button>
          </form>
          <aside class="panel settings-side-note"><p class="eyebrow">CURRENT MISSION</p><h2>Day ${appState.mission.day} of ${appState.mission.duration}</h2><p class="body-copy">Current mission progress is stored in this browser. Starting another mission replaces that saved state.</p><button class="button button-quiet" type="button" data-action="save">Save current progress</button><button class="button button-quiet" type="button" data-action="load">Load saved mission</button><button class="button button-danger" type="button" data-action="reset-mission">Restart current mission</button></aside>
        </div>
      </div>
      <section class="panel preferences-panel"><div class="section-heading"><div><p class="eyebrow">DISPLAY</p><h2>Navigation preferences</h2></div></div><div class="preference-row"><div><strong>Compact sidebar</strong><p>Collapse the navigation to icon-only mode on wider screens.</p></div><button class="button button-quiet" type="button" data-action="toggle-sidebar">${appState.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}</button></div></section>
    `;
  }

  function renderHelp() {
    return `
      ${renderPageHeading('LUNARBASE · MISSION SURVIVAL', 'Help & about', 'A browser-based educational lunar habitat survival simulator for learning how mission decisions interact with life-support resources.')}
      <section class="panel about-hero"><span class="about-mark" aria-hidden="true">LB</span><div><p class="eyebrow">EDUCATIONAL SIMULATOR</p><h2>Decisions have consequences.<br />Models have limitations.</h2><p>This application is a teaching tool—not an engineering design, operational forecast, or medical system.</p></div></section>
      <div class="help-grid">
        <section class="panel"><p class="eyebrow">01 · OPERATE</p><h2>Manage one simulated day at a time</h2><p class="body-copy">Review reserves, the day’s scenario trigger, and the crew state. Select an operating plan; where an event is active, choose a response. Confirm to apply the model and advance.</p></section>
        <section class="panel"><p class="eyebrow">02 · INTERPRET</p><h2>Keep units and data type in view</h2><p class="body-copy">Oxygen and water are liters; food is kilograms; energy reserves are kilowatt-hours. Radiation is a relative, dimensionless index—not dose. Visuals are explicitly labeled simulated or illustrative.</p></section>
        <section class="panel"><p class="eyebrow">03 · COMPARE</p><h2>Reproducible scenario schedule</h2><p class="body-copy">A stored mission seed selects a reproducible order of scripted scenarios, so a saved mission replays consistently while a new mission can present a different event sequence. This is not a probability model, environmental forecast, or live feed.</p></section>
        <section class="panel"><p class="eyebrow">04 · LIMITATIONS</p><h2>Not for real mission planning</h2><p class="body-copy">The model omits detailed orbital geometry, habitat shielding, resource processing chemistry, individual medical variability, and certified equipment specifications. Consult verified technical sources for real decisions.</p></section>
      </div>
      <section class="panel help-links"><div class="section-heading"><div><p class="eyebrow">LEARN MORE ABOUT THIS BUILD</p><h2>Transparency and assumptions</h2></div><button class="button button-primary" type="button" data-page="data-source">Open data model <span aria-hidden="true">→</span></button></div><p class="body-copy">No NASA API response, dataset name, or live measurement is represented in the application.</p></section>
    `;
  }

  function renderCurrentPage() {
    switch (appState.screen) {
      case 'overview': return renderMissionOverview();
      case 'dashboard': return renderDashboard();
      case 'timeline': return renderMissionTimeline();
      case 'habitat': return renderHabitat();
      case 'life-support': return renderLifeSupport();
      case 'oxygen':
      case 'water':
      case 'food':
      case 'power': return renderResourceManagement(appState.screen);
      case 'crew': return renderCrew();
      case 'profiles': return renderCrew();
      case 'crew-health': return renderCrewHealth();
      case 'surface': return renderSurfaceConditions();
      case 'radiation': return renderRadiation();
      case 'sunlight': return renderSunlightConditions();
      case 'nasa-explorer': return renderNASAExplorer();
      case 'emergencies': return renderEmergencies();
      case 'decisions': return renderMissionDecisions();
      case 'mission-log': return renderMissionLog();
      case 'analytics': return renderAnalytics();
      case 'report': return renderReport();
      case 'data-source': return renderDataSource();
      case 'settings': return renderSettings();
      case 'help': return renderHelp();
      default: throw new Error(`No page renderer is registered for "${appState.screen}".`);
    }
  }

  function drawChart() {
    if (appState.chart) {
      appState.chart.destroy();
      appState.chart = null;
    }
    const chartIds = {
      dashboard: 'resource-chart',
      analytics: 'analytics-chart',
      'crew-health': 'crew-health-chart'
    };
    const canvas = document.getElementById(chartIds[appState.screen]);
    if (!canvas) return;

    const history = appState.mission.history;
    if (appState.screen === 'crew-health') {
      appState.chart = new Chart(canvas, {
        type: 'line',
        data: {
          labels: history.map((entry) => entry.label ?? `Day ${entry.day}`),
          datasets: [{
            label: 'Average crew health index (%)',
            data: history.map((entry) => entry.averageCrewHealth ?? 100),
            borderColor: '#59d695',
            backgroundColor: '#59d69518',
            borderWidth: 2,
            pointRadius: 3,
            tension: 0.25,
            fill: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#b7c5cf', font: { size: 12 } } },
            tooltip: { backgroundColor: '#0c1a28', borderColor: '#23384b', borderWidth: 1, titleColor: '#eef7fb', bodyColor: '#d0dbe2' }
          },
          scales: {
            x: { ticks: { color: '#b0bfca', font: { size: 12 } }, grid: { color: 'rgba(126,154,179,.12)' } },
            y: { min: 0, max: 100, ticks: { color: '#b0bfca', callback: (value) => `${value}%` }, grid: { color: 'rgba(126,154,179,.14)' } }
          }
        }
      });
      return;
    }

    const colors = ['#56d8e7', '#f4b75f', '#9d8aff', '#59d695', '#e3a9c5'];
    const datasets = RESOURCE_META.map((resource, index) => ({
      label: `${resource.label} (% of initial)`,
      data: history.map((entry) => percentage(
        entry[resource.key],
        appState.mission.initialResources?.[resource.key] ?? resource.initial
      )),
      borderColor: colors[index],
      backgroundColor: `${colors[index]}18`,
      borderWidth: 2,
      pointRadius: 3,
      pointHoverRadius: 5,
      tension: 0.28,
      fill: false
    }));
    appState.chart = new Chart(canvas, {
      type: 'line',
      data: { labels: history.map((entry) => entry.label ?? `Day ${entry.day}`), datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { position: 'bottom', labels: { color: '#b7c5cf', font: { size: 12, weight: 500 }, usePointStyle: true, pointStyle: 'circle', boxWidth: 9, padding: 18 } },
          tooltip: { backgroundColor: '#0c1a28', borderColor: '#23384b', borderWidth: 1, titleColor: '#eef7fb', bodyColor: '#d0dbe2', titleFont: { size: 14 }, bodyFont: { size: 13 } }
        },
        scales: {
          x: { ticks: { color: '#b0bfca', font: { size: 12 } }, grid: { color: 'rgba(126,154,179,.12)' }, border: { display: false } },
          y: { beginAtZero: true, max: 100, ticks: { color: '#b0bfca', font: { size: 12 }, callback: (value) => `${value}%` }, grid: { color: 'rgba(126,154,179,.14)' }, border: { display: false } }
        }
      }
    });
  }

  function render() {
    root.innerHTML = renderShell(renderCurrentPage());
    root.querySelectorAll('[data-nasa-image]').forEach((image) => {
      image.addEventListener('load', () => {
        const status = root.querySelector('[data-nasa-image-status]');
        if (status) status.textContent = 'Diviner browse image loaded from the locally bundled PDS product.';
      }, { once: true });
      image.addEventListener('error', () => {
        const status = root.querySelector('[data-nasa-image-status]');
        if (status) status.textContent = 'The bundled NASA image failed to load. Mission simulation remains available in Simulation Mode; no substitute data is shown.';
      }, { once: true });
    });
    drawChart();
  }

  root.addEventListener('click', (event) => {
    const target = event.target;
    const pageButton = target.closest?.('[data-page]');
    if (pageButton) {
      event.preventDefault();
      navigate(pageButton.dataset.page);
      return;
    }

    const actionButton = target.closest?.('[data-action]');
    if (!actionButton) return;
    const { action } = actionButton.dataset;

    if (action === 'toggle-sidebar') {
      appState.sidebarCollapsed = !appState.sidebarCollapsed;
      saveSidebarCollapsedPreference(appState.sidebarCollapsed);
      render();
    } else if (action === 'toggle-drawer') {
      appState.drawerOpen = !appState.drawerOpen;
      render();
      if (appState.drawerOpen) root.querySelector('.nav-link.active')?.focus();
    } else if (action === 'close-drawer') {
      appState.drawerOpen = false;
      render();
    } else if (action === 'save') {
      try {
        persistMission();
        setToast('Mission progress saved in this browser.', 'success');
      } catch (error) {
        setToast(`Mission could not be saved: ${error.message}`, 'error');
      }
      render();
    } else if (action === 'load') {
      loadSavedMission();
    } else if (action === 'pause-mission') {
      setMissionPausedState(true);
    } else if (action === 'resume-mission') {
      setMissionPausedState(false);
    } else if (action === 'advance-step') {
      advanceOneMissionStep();
    } else if (action === 'reset-mission') {
      resetMission();
    } else if (action === 'advance-day') {
      completeMissionDay();
    } else if (action === 'apply-response') {
      const selectedResponse = root.querySelector('input[name="emergency-choice"]:checked')?.value ?? null;
      applyEmergencyResponse(selectedResponse);
    } else if (action === 'dismiss-toast') {
      setToast('');
      render();
    }
  });

  root.addEventListener('change', (event) => {
    if (event.target.matches('input[name="daily-decision"]')) {
      appState.selectedDecision = event.target.value;
      root.querySelectorAll('.decision-choice').forEach((choice) => choice.classList.toggle(
        'selected',
        choice.querySelector('input[name="daily-decision"]')?.checked ?? false
      ));
    } else if (event.target.matches('input[name="emergency-choice"]')) {
      root.querySelectorAll('.emergency-options .decision-choice').forEach((choice) => choice.classList.toggle(
        'selected',
        choice.querySelector('input[name="emergency-choice"]')?.checked ?? false
      ));
    }
  });

  root.addEventListener('input', (event) => {
    if (!event.target.closest?.('#live-model-config')) return;
    const form = root.querySelector('#live-model-config');
    const preview = root.querySelector('#model-preview');
    if (!form?.checkValidity() || !preview) return;
    const modelParameters = getModelParameterValues(new FormData(form));
    preview.innerHTML = renderModelPreview(modelParameters, appState.mission.crew, appState.mission.difficulty);
  });

  root.addEventListener('submit', (event) => {
    if (!event.target.matches('#mission-config, #live-model-config')) return;
    event.preventDefault();
    if (event.target.matches('#mission-config')) {
      startNewMission(new FormData(event.target));
    } else {
      applyCurrentModelParameters(new FormData(event.target));
    }
  });

  globalThis.addEventListener?.('hashchange', () => {
    const page = globalThis.location?.hash?.slice(1);
    if (VALID_PAGES.has(page) && page !== appState.screen) navigate(page);
  });
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && appState.drawerOpen) {
      appState.drawerOpen = false;
      render();
    }
  });

  render();
}
