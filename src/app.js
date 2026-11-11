import Chart from 'chart.js/auto';
import { DEFAULT_CONFIG, MISSION_DIFFICULTIES, SIMULATION_PROFILE } from './data/simulationConfig.js';
import { dataConfig, isNASADataModeAvailable } from './data/dataConfig.js';
import { readStoredMission, writeStoredMission, clearStoredMission } from './services/storageService.js';
import {
  advanceMission,
  buildMissionReport,
  createMission,
  DAILY_DECISIONS,
  resolveEmergencyChoice
} from './simulation/missionEngine.js';
import { getDailyResourceNeeds } from './simulation/resourceSystem.js';

const NAVIGATION = [
  { id: 'dashboard', label: 'Mission Dashboard', icon: '▦', group: 'Operations' },
  { id: 'habitat', label: 'Habitat Systems', icon: '⌂', group: 'Operations' },
  { id: 'life-support', label: 'Life Support', icon: '◉', group: 'Operations' },
  { id: 'crew', label: 'Astronaut Crew', icon: '♙', group: 'Operations' },
  { id: 'radiation', label: 'Radiation Monitoring', icon: '◌', group: 'Operations' },
  { id: 'emergencies', label: 'Mission Emergencies', icon: '△', group: 'Mission' },
  { id: 'mission-log', label: 'Mission Log', icon: '≡', group: 'Mission' },
  { id: 'analytics', label: 'Mission Analytics', icon: '⌁', group: 'Mission' },
  { id: 'report', label: 'Final Mission Report', icon: '▤', group: 'Mission' }
];

const SUPPORT_NAVIGATION = [
  { id: 'data-source', label: 'Data Source', icon: '◈' },
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

const TITLES = Object.fromEntries([...NAVIGATION, ...SUPPORT_NAVIGATION].map(({ id, label }) => [id, label]));
const VALID_PAGES = new Set(Object.keys(TITLES));

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

function getInitialPage() {
  const page = globalThis.location?.hash?.slice(1);
  return VALID_PAGES.has(page) ? page : 'dashboard';
}

export function createApp(root) {
  const savedMission = readStoredMission();
  const isCompatibleSave = savedMission?.simulationVersion === 2;
  const appState = {
    screen: getInitialPage(),
    config: { ...DEFAULT_CONFIG, initialResources: { ...DEFAULT_CONFIG.initialResources } },
    mission: isCompatibleSave ? savedMission : createMission(DEFAULT_CONFIG),
    report: isCompatibleSave ? savedMission.report : null,
    chart: null,
    toast: '',
    selectedDecision: 'normal',
    sidebarCollapsed: false,
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

  function startNewMission(formData) {
    const days = Number(formData.get('days'));
    const crew = Number(formData.get('crew'));
    const difficulty = formData.get('difficulty');
    if (!Number.isInteger(days) || days < 1 || days > 7 || !Number.isInteger(crew) || crew < 1 || crew > 4) {
      setToast('Choose a mission duration from 1 to 7 days and a crew size from 1 to 4.', 'error');
      render();
      return;
    }

    appState.config = {
      days,
      crew,
      difficulty: MISSION_DIFFICULTIES.includes(difficulty) ? difficulty : 'Standard',
      initialResources: { ...DEFAULT_CONFIG.initialResources }
    };
    appState.mission = createMission(appState.config);
    appState.report = null;
    appState.selectedDecision = 'normal';
    appState.screen = 'dashboard';
    appState.toast = { message: 'New mission initialized. All values are simulated.', tone: 'success' };
    globalThis.history?.replaceState?.(null, '', '#dashboard');
    try {
      persistMission();
    } catch (error) {
      setToast(`New mission started, but progress could not be saved: ${error.message}`, 'error');
    }
    render();
  }

  function completeMissionDay(responseId = null) {
    try {
      if (appState.mission.emergency) {
        if (!responseId) {
          throw new Error('Choose a response to the active scenario before advancing the mission.');
        }
        resolveEmergencyChoice(appState.mission, responseId);
      }

      appState.mission = advanceMission(appState.mission, appState.selectedDecision);
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
    const confirmed = globalThis.confirm?.('Start a new mission and clear the saved mission in this browser?') ?? true;
    if (!confirmed) return;
    try {
      clearStoredMission();
    } catch (error) {
      setToast(`Mission could not be reset: ${error.message}`, 'error');
      render();
      return;
    }
    appState.mission = createMission(appState.config);
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
            <p class="nav-group-label">OPERATIONS</p>
            <nav class="primary-nav">${renderNavigation(NAVIGATION.filter((item) => item.group === 'Operations'), appState.screen)}</nav>
            <p class="nav-group-label">MISSION</p>
            <nav class="primary-nav">${renderNavigation(NAVIGATION.filter((item) => item.group === 'Mission'), appState.screen)}</nav>
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
              <div class="header-day"><span>MISSION DAY</span><strong>${String(mission.day).padStart(2, '0')} <i>/ ${String(mission.duration).padStart(2, '0')}</i></strong></div>
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
      <button class="button button-quiet" type="button" data-action="save">Save mission</button>
      <button class="button button-primary" type="button" data-page="settings">Configure mission <span aria-hidden="true">↗</span></button>
    `;
    return `
      ${renderPageHeading(`MISSION OVERVIEW · ${mission.day}/${mission.duration}`, 'Mission dashboard', 'A real-time view of crew, habitat reserves, and today’s scheduled scenario.', actions)}
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
      <div class="advance-row">
        <p><strong>${mission.status === 'active' ? 'Confirm the day’s plan' : 'Mission progression paused'}</strong><span>${mission.status === 'active' ? mission.emergency ? 'A response is also required for today’s active scenario.' : 'Mission resources update once per simulated day.' : 'Review the mission outcome or configure another mission.'}</span></p>
        <button class="button button-primary button-advance" type="button" ${mission.status !== 'active' ? 'data-page="report"' : mission.emergency ? 'data-page="emergencies"' : 'data-action="advance-day"'}>
          ${mission.status !== 'active' ? 'View mission report' : mission.emergency ? 'Review scenario response' : 'Advance one mission day'} <span aria-hidden="true">→</span>
        </button>
      </div>

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
      solarGeneration: conditions.solarGeneration
    });
    const rows = [
      ['Oxygen metabolic use', `${formatNumber(needs.oxygen)} L/day`, '0.84 kg per person-day, converted at about 700 L/kg (STP)'],
      ['Fresh water make-up', `${formatNumber(needs.water, 1)} L/day`, `${formatNumber(needs.waterGross, 1)} L/day gross use; ${Math.round(needs.recyclerEfficiency * 100)}% baseline recovery`],
      ['Packaged food', `${formatNumber(needs.food, 1)} kg/day`, '0.62 kg per person-day illustrative ration assumption'],
      ['Electrical demand', `${formatNumber(needs.powerDemand, 1)} kWh/day`, '84 kWh/day nominal four-person habitat load assumption'],
      ['Solar generation', `${formatNumber(needs.solarGeneration, 1)} kWh/day`, 'Array output adjusted for scenario and system condition']
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
      <div class="advance-row"><p><strong>Apply today’s selected protection plan</strong><span>The selected plan changes modeled activity, demand, and relative risk.</span></p><button class="button button-primary button-advance" type="button" ${mission.status !== 'active' ? 'data-page="report"' : mission.emergency ? 'data-page="emergencies"' : 'data-action="advance-day"'}>${mission.status !== 'active' ? 'View mission report' : mission.emergency ? 'Review scenario response' : 'Apply plan & advance'} <span aria-hidden="true">→</span></button></div>
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
          <div class="emergency-meta"><div><span>TRIGGER</span><strong>${escapeHTML(scenario.trigger)}</strong></div><div><span>SCENARIO DURATION</span><strong>${scenario.durationDays} simulated operations day</strong></div></div>
          <div class="decision-options emergency-options">
            ${emergency.options.map((option, index) => `
              <label class="decision-choice ${index === 0 ? 'selected' : ''}">
                <input type="radio" name="emergency-choice" value="${escapeHTML(option.id)}" ${index === 0 ? 'checked' : ''} />
                <span class="decision-choice-copy"><strong>${escapeHTML(option.label)}</strong><small>${escapeHTML(option.result)}</small></span>
                <span class="response-cost">${Object.entries(option.resourceDelta ?? {}).map(([key, value]) => `${value > 0 ? '+' : ''}${value} ${escapeHTML(key)}`).join(' · ') || 'No direct stock change'}</span>
              </label>
            `).join('')}
          </div>
          ${renderDecisionPlanner(true)}
          <div class="advance-row"><p><strong>Response and daily plan apply together</strong><span>Review the consequences, then confirm to advance the simulation.</span></p><button class="button button-primary button-advance" type="button" data-action="respond-advance">Confirm response & advance <span aria-hidden="true">→</span></button></div>
        </section>
      ` : `
        <section class="panel all-clear-panel"><span class="all-clear-icon" aria-hidden="true">✓</span><p class="eyebrow">NO ACTIVE RESPONSE REQUIRED</p><h2>${escapeHTML(scenario.title)}</h2><p class="body-copy">${escapeHTML(scenario.trigger)}</p><div class="data-caption"><span class="info-mark">i</span> This is a deterministic educational scenario schedule. No event was randomly generated.</div><button class="button button-primary" type="button" data-page="dashboard">Return to dashboard</button></section>
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
      ${renderPageHeading('DATA PROVENANCE & MODEL TRANSPARENCY', 'Data source & mode', 'See what is measured, simulated, and assumed. LunarBase has not connected to any NASA dataset.')}
      <div class="data-mode-grid">
        <section class="panel data-mode-card active-mode">
          <span class="mode-check">✓</span><span class="tag tag-green">ACTIVE</span><p class="eyebrow">MODE 01</p><h2>Simulation Mode</h2><p>Deterministic, local scenario schedule generated from documented educational assumptions. It runs without a network connection.</p><div class="mode-data-label">${escapeHTML(SIMULATION_PROFILE.label)}</div>
        </section>
        <section class="panel data-mode-card unavailable-mode">
          <span class="tag tag-muted">${nasaAvailable ? 'CONFIGURED' : 'UNAVAILABLE'}</span><p class="eyebrow">MODE 02</p><h2>NASA Data Mode</h2><p>No compatible, verified external dataset has been integrated. Selecting an inactive mode never switches or relabels simulation output.</p><button class="button ${nasaAvailable ? 'button-quiet' : 'button-disabled'}" type="button" ${nasaAvailable ? '' : 'disabled aria-disabled="true"'}>NASA Data Mode · ${nasaAvailable ? 'configured' : 'not configured'}</button>
          <div class="unavailable-reason"><strong>Why unavailable?</strong><span>No compatible, verified dataset is configured. A source, collection period, spatial applicability, units, limitations, and validation are required before external data can be used.</span></div>
        </section>
      </div>
      <section class="panel">
        <div class="section-heading"><div><p class="eyebrow">MODEL CARD</p><h2>Illustrative engineering assumptions</h2></div><span class="tag tag-blue">VERSION 2</span></div>
        <div class="assumption-list">${assumptions.map((assumption, index) => `<div><span class="assumption-index">0${index + 1}</span><p>${escapeHTML(assumption)}</p></div>`).join('')}</div>
      </section>
      <div class="two-column-grid">
        <section class="panel"><p class="eyebrow">DATA CLASSIFICATION</p><h2>Measured vs. modeled</h2><div class="legend-explainer"><div><span class="legend-swatch measured"></span><p><strong>Measured</strong><small>Observed by an instrument or published source. None is used in this build.</small></p></div><div><span class="legend-swatch simulated"></span><p><strong>Simulated</strong><small>Deterministic model output used to demonstrate cause and effect.</small></p></div><div><span class="legend-swatch assumption"></span><p><strong>Assumption</strong><small>An illustrative design input that is explicitly identified and documented.</small></p></div></div></section>
        <section class="panel"><p class="eyebrow">FUTURE DATA INTEGRATION</p><h2>Validation before visualization</h2><p class="body-copy">The application separates scenario generation, external-data adaptation, validation, mission calculations, and rendering. A verified dataset must be relevant to the specific variable; lunar surface measurements do not directly describe conditions inside a shielded habitat.</p></section>
      </div>
    `;
  }

  function renderSettings() {
    return `
      ${renderPageHeading('MISSION CONFIGURATION', 'Settings', 'Configure a new educational mission. Launching it replaces the currently saved mission in this browser.')}
      <div class="settings-grid">
        <form class="panel config-form" id="mission-config">
          <div class="section-heading"><div><p class="eyebrow">MISSION PROFILE</p><h2>Scenario setup</h2></div><span class="tag tag-blue">SIMULATION MODE</span></div>
          <label>Mission duration <span class="input-with-unit"><input name="days" type="number" min="1" max="7" step="1" value="${appState.mission.duration}" required /><small>days · maximum 7</small></span></label>
          <label>Crew size <span class="input-with-unit"><input name="crew" type="number" min="1" max="4" step="1" value="${appState.mission.crew}" required /><small>astronauts · maximum 4</small></span></label>
          <label>Mission difficulty <select name="difficulty">${MISSION_DIFFICULTIES.map((difficulty) => `<option value="${escapeHTML(difficulty)}" ${appState.mission.difficulty === difficulty ? 'selected' : ''}>${escapeHTML(difficulty)}</option>`).join('')}</select><small>Difficulty scales modeled resource demand and radiation index.</small></label>
          <div class="config-inventory"><p class="eyebrow">STARTING INVENTORY · SIMULATED</p><span>Oxygen 20,000 L</span><span>Water 110 L</span><span>Food 22 kg</span><span>Power 360 kWh</span><span>Battery 260 kWh</span></div>
          <button class="button button-primary" type="submit">Launch new mission <span aria-hidden="true">→</span></button>
        </form>
        <aside class="panel settings-side-note"><p class="eyebrow">CURRENT MISSION</p><h2>Day ${appState.mission.day} of ${appState.mission.duration}</h2><p class="body-copy">Current mission progress is stored in this browser. Starting another mission replaces that saved state.</p><button class="button button-quiet" type="button" data-action="save">Save current progress</button><button class="button button-danger" type="button" data-action="reset-mission">Reset current mission</button></aside>
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
        <section class="panel"><p class="eyebrow">03 · COMPARE</p><h2>Repeatable scenario schedule</h2><p class="body-copy">The same mission day uses the same scripted scenario so learners can compare response choices. This schedule is not a probability model, environmental forecast, or live feed.</p></section>
        <section class="panel"><p class="eyebrow">04 · LIMITATIONS</p><h2>Not for real mission planning</h2><p class="body-copy">The model omits detailed orbital geometry, habitat shielding, resource processing chemistry, individual medical variability, and certified equipment specifications. Consult verified technical sources for real decisions.</p></section>
      </div>
      <section class="panel help-links"><div class="section-heading"><div><p class="eyebrow">LEARN MORE ABOUT THIS BUILD</p><h2>Transparency and assumptions</h2></div><button class="button button-primary" type="button" data-page="data-source">Open data model <span aria-hidden="true">→</span></button></div><p class="body-copy">No NASA API response, dataset name, or live measurement is represented in the application.</p></section>
    `;
  }

  function renderCurrentPage() {
    switch (appState.screen) {
      case 'dashboard': return renderDashboard();
      case 'habitat': return renderHabitat();
      case 'life-support': return renderLifeSupport();
      case 'crew': return renderCrew();
      case 'radiation': return renderRadiation();
      case 'emergencies': return renderEmergencies();
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
    const canvas = document.getElementById(appState.screen === 'analytics' ? 'analytics-chart' : 'resource-chart');
    if (!canvas || !['dashboard', 'analytics'].includes(appState.screen)) return;

    const history = appState.mission.history;
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
    } else if (action === 'reset-mission') {
      resetMission();
    } else if (action === 'advance-day') {
      completeMissionDay();
    } else if (action === 'respond-advance') {
      const selectedResponse = root.querySelector('input[name="emergency-choice"]:checked')?.value ?? null;
      completeMissionDay(selectedResponse);
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

  root.addEventListener('submit', (event) => {
    if (!event.target.matches('#mission-config')) return;
    event.preventDefault();
    startNewMission(new FormData(event.target));
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
