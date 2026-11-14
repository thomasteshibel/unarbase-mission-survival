/**
 * NASA Data Explorer View
 *
 * Provides an interactive, source-aware research center across 5 comprehensive modules:
 * 1. Space Weather & Solar Events (DONKI)
 * 2. Space Biology & Astronaut Health (OSDR)
 * 3. Space Radiation Dosimetry (RadLab)
 * 4. Lunar Surface Environment (LRO Diviner & SVS 5027)
 * 5. Scientific Integrity & Provenance Guide
 */

import { escapeHTML } from '../utils/formatting.js';
import { DATA_CATEGORIES, CATEGORY_BADGES } from '../data/provenance.js';
import { NASA_DIVINER_MOSAIC } from '../data/nasaDataCatalog.js';
import { VISUAL_ASSETS } from '../data/visualAssetCatalog.js';

const EXPLORER_TABS = [
  { id: 'donki', label: 'Space Weather (DONKI)', icon: '☼', badge: 'OBSERVATIONS' },
  { id: 'osdr', label: 'Space Biology (OSDR)', icon: '♧', badge: 'STUDIES' },
  { id: 'radlab', label: 'Radiation Dosimetry (RadLab)', icon: '◉', badge: 'MEASUREMENTS' },
  { id: 'surface', label: 'Lunar Environment (LRO)', icon: '◒', badge: 'SURFACE' },
  { id: 'provenance', label: 'Scientific Integrity Guide', icon: '◈', badge: 'STANDARDS' }
];

function renderProvenanceBox(provenance) {
  if (!provenance) return '';
  const badge = CATEGORY_BADGES[provenance.category] || CATEGORY_BADGES.REAL_NASA_DATA;
  return `
    <div class="provenance-box">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span class="eyebrow" style="margin: 0;">DATA PROVENANCE & SCIENTIFIC RECORD</span>
        <span class="tag ${badge.tagClass}">${escapeHTML(badge.label)}</span>
      </div>
      <div class="provenance-grid">
        <div><span>Dataset / Product</span><strong>${escapeHTML(provenance.datasetName)}</strong></div>
        <div><span>Official Source</span><strong>${escapeHTML(provenance.source)}</strong></div>
        <div><span>Retrieval Timestamp</span><strong>${escapeHTML(provenance.retrievalTimestamp)}</strong></div>
        <div><span>Collection Period</span><strong>${escapeHTML(provenance.collectionPeriod)}</strong></div>
        <div><span>Spatial Applicability</span><strong>${escapeHTML(provenance.spatialApplicability)}</strong></div>
        <div><span>Temporal Applicability</span><strong>${escapeHTML(provenance.temporalApplicability)}</strong></div>
      </div>
      <div style="margin-top: 10px; font-size: 11px; color: #8ea2b1; line-height: 1.5;">
        <p style="margin: 0 0 4px;"><strong>Scientific Description:</strong> ${escapeHTML(provenance.description)}</p>
        <p style="margin: 0 0 6px;"><strong>Known Limitations:</strong> ${escapeHTML(provenance.limitations)}</p>
        <a href="${escapeHTML(provenance.sourceUrl)}" target="_blank" rel="noreferrer" style="color: #88dce5; text-decoration: underline; font-family: 'DM Mono', monospace; font-size: 10px;">
          Access Official NASA Source Archive <span aria-hidden="true">↗</span>
        </a>
      </div>
    </div>
  `;
}

/**
 * Tab 1: NASA DONKI Space Weather View
 */
function renderDonkiTab(donkiState, appBasePath) {
  const data = donkiState.data;
  const error = donkiState.errorNotice;
  const isLoading = donkiState.loading;
  const eventType = donkiState.eventType || 'all';

  const flares = data?.flares || [];
  const cmes = data?.cme || [];
  const seps = data?.sep || [];
  const gsts = data?.geomagneticStorms || [];

  const showFlares = eventType === 'all' || eventType === 'FLR';
  const showCmes = eventType === 'all' || eventType === 'CME';
  const showSeps = eventType === 'all' || eventType === 'SEP';
  const showGsts = eventType === 'all' || eventType === 'GST';

  return `
    <div class="notice notice-green" style="margin-bottom: 16px;">
      <span class="info-mark">✓</span>
      <p>
        <strong>REAL NASA DATA — SPACE WEATHER OBSERVATIONS ACTIVE</strong><br />
        Displaying authenticated heliophysics event records from NASA DONKI and NOAA SWPC.
        ${data?.dataSource === 'live_nasa_api' ? 'Retrieved via live NASA Open API query.' : 'Currently displaying verified offline historical records (May 2024 Solar Superstorm).'}
      </p>
    </div>

    ${
      error
        ? `
      <div class="notice notice-amber" style="margin-bottom: 16px;">
        <span class="info-mark">!</span>
        <p><strong>NASA API Status Notice (${escapeHTML(error.errorType)}):</strong> ${escapeHTML(error.message)}</p>
      </div>
    `
        : ''
    }

    <!-- Toolbar for DONKI queries -->
    <div class="explorer-toolbar">
      <div class="explorer-toolbar-group">
        <label for="donki-event-filter" style="font-size: 10px; font-family: 'DM Mono', monospace; color: #8ba0b1;">EVENT TYPE:</label>
        <select id="donki-event-filter" class="explorer-select" data-donki-filter>
          <option value="all" ${eventType === 'all' ? 'selected' : ''}>All Space Weather Events</option>
          <option value="FLR" ${eventType === 'FLR' ? 'selected' : ''}>Solar Flares (FLR)</option>
          <option value="CME" ${eventType === 'CME' ? 'selected' : ''}>Coronal Mass Ejections (CME)</option>
          <option value="SEP" ${eventType === 'SEP' ? 'selected' : ''}>Solar Energetic Particles (SEP)</option>
          <option value="GST" ${eventType === 'GST' ? 'selected' : ''}>Geomagnetic Storms (GST)</option>
        </select>

        <span style="font-size: 10px; font-family: 'DM Mono', monospace; color: #6e8496;">KEY: ${donkiState.apiKeyType || 'DEMO_KEY'}</span>
      </div>

      <div class="explorer-toolbar-group">
        <button type="button" class="explorer-btn" data-action="fetch-donki" ${isLoading ? 'disabled' : ''}>
          ${isLoading ? 'Connecting to NASA...' : '↺ Query NASA DONKI API'}
        </button>
        <button type="button" class="explorer-btn" data-action="reset-donki" style="background: rgba(150,170,190,.08); border-color: var(--line); color: #a4bbc7;">
          Load May 2024 Superstorm
        </button>
      </div>
    </div>

    <!-- Educational Callout on Solar Weather vs Lunar Base Shielding -->
    <div class="explorer-callout callout-amber" style="margin-bottom: 18px;">
      <strong>SCIENTIFIC INTEGRITY & HABITAT SHIELDING BOUNDARY:</strong>
      A solar flare emits X-rays at the speed of light (~8.3 min travel time), while a CME drives a magnetized shockwave arriving in 1–3 days.
      High-energy protons (SEPs) pose an acute hazard to unshielded astronauts on lunar EVAs, requiring immediate retreat to habitat storm shelters (an educational design concept modeled after proposed lunar habitat shielding).
      However, space weather in the heliosphere does NOT automatically dictate cabin radiation dose inside a properly shielded lunar habitat.
    </div>

    <!-- Cards Grid -->
    <div class="explorer-cards-grid">
      ${
        showFlares
          ? flares
              .map(
                (flare) => `
        <article class="explorer-data-card">
          <div class="explorer-data-card-header">
            <div>
              <span class="eyebrow">SOLAR FLARE · CLASS ${escapeHTML(flare.classType)}</span>
              <h3>${escapeHTML(flare.flrID)}</h3>
            </div>
            <span class="tag tag-amber">${escapeHTML(flare.classType)}</span>
          </div>
          <div class="explorer-meta-kv">
            <span>Peak Time</span><strong>${escapeHTML(flare.peakTime || flare.beginTime)}</strong>
            <span>Active Region</span><strong>AR ${escapeHTML(flare.activeRegionNum || 'Center')}</strong>
            <span>Location</span><strong>${escapeHTML(flare.sourceLocation || 'Solar Disk')}</strong>
            <span>Detectors</span><strong>${escapeHTML(flare.instruments || 'GOES-16 EXIS')}</strong>
          </div>
          <p style="font-size: 11px; line-height: 1.5; color: #c4d4de; margin: 0 0 10px;">${escapeHTML(flare.scientificExplanation)}</p>
          <div class="explorer-callout">
            <strong>LUNAR MISSION OPERATIONAL IMPLICATION:</strong>
            ${escapeHTML(flare.lunarRelevance)}
          </div>
        </article>
      `
              )
              .join('')
          : ''
      }

      ${
        showCmes
          ? cmes
              .map(
                (cme) => `
        <article class="explorer-data-card">
          <div class="explorer-data-card-header">
            <div>
              <span class="eyebrow">CORONAL MASS EJECTION</span>
              <h3>${escapeHTML(cme.activityID)}</h3>
            </div>
            <span class="tag tag-blue">${cme.speedKmS ? `${escapeHTML(cme.speedKmS)} km/s` : 'HALO CME'}</span>
          </div>
          <div class="explorer-meta-kv">
            <span>Start Time</span><strong>${escapeHTML(cme.startTime)}</strong>
            <span>Speed</span><strong>${cme.speedKmS ? `${escapeHTML(cme.speedKmS)} km/s` : 'Model Pending'}</strong>
            <span>Instruments</span><strong>${escapeHTML(cme.instruments)}</strong>
            <span>Simulation</span><strong>${escapeHTML(cme.modelType || 'SOHO / WSA-ENLIL')}</strong>
          </div>
          <p style="font-size: 11px; line-height: 1.5; color: #c4d4de; margin: 0 0 10px;">${escapeHTML(cme.scientificExplanation)}</p>
          <div class="explorer-callout">
            <strong>LUNAR MISSION OPERATIONAL IMPLICATION:</strong>
            ${escapeHTML(cme.lunarRelevance)}
          </div>
        </article>
      `
              )
              .join('')
          : ''
      }

      ${
        showSeps
          ? seps
              .map(
                (sep) => `
        <article class="explorer-data-card" style="border-color: rgba(240,182,96,.3);">
          <div class="explorer-data-card-header">
            <div>
              <span class="eyebrow" style="color: var(--amber);">SOLAR ENERGETIC PROTON EVENT</span>
              <h3>${escapeHTML(sep.sepID)}</h3>
            </div>
            <span class="tag tag-amber">CRITICAL EVA HAZARD</span>
          </div>
          <div class="explorer-meta-kv">
            <span>Event Time</span><strong>${escapeHTML(sep.eventTime)}</strong>
            <span>Flux Level</span><strong>${escapeHTML(sep.fluxThreshold)}</strong>
            <span>Detectors</span><strong>${escapeHTML(sep.instruments)}</strong>
            <span>Linked Flare</span><strong>${escapeHTML(sep.linkedEvents?.join(', ') || 'Coronal Shock')}</strong>
          </div>
          <p style="font-size: 11px; line-height: 1.5; color: #c4d4de; margin: 0 0 10px;">${escapeHTML(sep.scientificExplanation)}</p>
          <div class="explorer-callout callout-amber">
            <strong>ASTRONAUT SAFETY PROTOCOL:</strong>
            ${escapeHTML(sep.lunarRelevance)}
          </div>
        </article>
      `
              )
              .join('')
          : ''
      }

      ${
        showGsts
          ? gsts
              .map(
                (gst) => `
        <article class="explorer-data-card">
          <div class="explorer-data-card-header">
            <div>
              <span class="eyebrow">GEOMAGNETIC STORM DISTURBANCE</span>
              <h3>${escapeHTML(gst.gstID)}</h3>
            </div>
            <span class="tag tag-blue">Kp ${escapeHTML(gst.peakKpIndex ?? 'Extreme')}</span>
          </div>
          <div class="explorer-meta-kv">
            <span>Observed Time</span><strong>${escapeHTML(gst.startTime)}</strong>
            <span>NOAA Storm Scale</span><strong>${escapeHTML(gst.stormLevel || 'G5 Extreme')}</strong>
            <span>Monitored By</span><strong>${escapeHTML(gst.observedBy)}</strong>
          </div>
          <p style="font-size: 11px; line-height: 1.5; color: #c4d4de; margin: 0 0 10px;">${escapeHTML(gst.scientificExplanation)}</p>
          <div class="explorer-callout">
            <strong>CONTRAST LESSON (EARTH VS MOON):</strong>
            ${escapeHTML(gst.lunarRelevance)}
          </div>
        </article>
      `
              )
              .join('')
          : ''
      }
    </div>

    ${renderProvenanceBox(data?.provenance)}
  `;
}

/**
 * Tab 2: NASA OSDR Space Biology View
 */
function renderOsdrTab(osdrState) {
  const data = osdrState.data;
  const error = osdrState.errorNotice;
  const isLoading = osdrState.loading;
  const studies = data?.studies || [];
  const currentQuery = osdrState.query || '';

  const quickTags = [
    { label: 'All Records', value: '' },
    { label: 'Muscle (OSD-665)', value: 'muscle' },
    { label: 'Liver (OSD-379)', value: 'liver' },
    { label: 'Regeneration (OS-452)', value: 'regeneration' },
    { label: 'Endocrine/Immune (OSD-566)', value: 'adrenal' },
    { label: 'Plant Biology (OSD-120)', value: 'arabidopsis' }
  ];

  return `
    <div class="notice notice-green" style="margin-bottom: 16px;">
      <span class="info-mark">✓</span>
      <p>
        <strong>RESEARCH EVIDENCE — NASA OPEN SCIENCE DATA REPOSITORY & LSDA</strong><br />
        Displaying peer-reviewed flight investigations and biological multi-omics datasets archived in NASA OSDR and the NASA Life Sciences Data Archive (LSDA).
        These records document real rodent and plant spaceflight biological adaptations to microgravity and space radiation, providing the empirical baseline for mission planning.
      </p>
    </div>

    ${
      error
        ? `
      <div class="notice notice-amber" style="margin-bottom: 16px;">
        <span class="info-mark">!</span>
        <p><strong>NASA OSDR Search Status (${escapeHTML(error.errorType)}):</strong> ${escapeHTML(error.message)}</p>
      </div>
    `
        : ''
    }

    <!-- Search & Quick Filters -->
    <div class="explorer-toolbar">
      <div class="explorer-toolbar-group" style="flex: 1;">
        <input
          type="text"
          class="explorer-search-input"
          placeholder="Search NASA space biology (e.g. muscle, liver, regeneration, plant)..."
          value="${escapeHTML(currentQuery)}"
          data-osdr-search-input
        />
        <button type="button" class="explorer-btn" data-action="search-osdr" ${isLoading ? 'disabled' : ''}>
          ${isLoading ? 'Searching OSDR...' : '🔍 Search NASA Studies'}
        </button>
      </div>

      <div class="explorer-toolbar-group">
        ${quickTags
          .map(
            (t) => `
          <button type="button" class="explorer-tab-btn ${currentQuery === t.value ? 'active' : ''}" style="padding: 5px 10px; font-size: 10px;" data-osdr-tag="${escapeHTML(t.value)}">
            ${escapeHTML(t.label)}
          </button>
        `
          )
          .join('')}
      </div>
    </div>

    <!-- Educational Callout -->
    <div class="explorer-callout callout-purple" style="margin-bottom: 18px;">
      <strong>RESEARCH EVIDENCE INTEGRITY PRINCIPLE:</strong>
      These scientific records represent published spaceflight experiments.
      They provide the empirical scientific justification for astronaut exercise countermeasures, ECLSS water recycling targets, and habitat lighting schedules.
      Under strict scientific data integrity rules, research study metadata is NEVER treated as real-time physiological telemetry for fictional crew members.
    </div>

    <!-- Studies Grid -->
    <div class="explorer-cards-grid">
      ${
        studies.length === 0
          ? `
        <div style="grid-column: 1 / -1; padding: 24px; text-align: center; color: #8ea2b1;">
          <p>No NASA space biology records matched your query "${escapeHTML(currentQuery)}". Try searching for "muscle", "liver", "regeneration", or "plant".</p>
          <button type="button" class="explorer-btn" data-osdr-tag="">Reset to All Curated Studies</button>
        </div>
      `
          : studies
              .map(
                (study) => `
        <article class="explorer-data-card" style="border-top: 3px solid #ba93f5;">
          <div class="explorer-data-card-header">
            <div>
              <span class="eyebrow" style="color: #c4a7f7;">${escapeHTML(study.domain)}</span>
              <h3>${escapeHTML(study.title)}</h3>
            </div>
            <span class="tag ${study.verificationStatus === 'STUDY_UNAVAILABLE_ON_PORTAL' ? 'tag-amber' : 'tag-purple'}">
              ${escapeHTML(study.accession)}
            </span>
          </div>

          ${
            study.availability
              ? `
            <div class="notice notice-amber" style="margin: 8px 0; padding: 6px 10px; font-size: 10px; line-height: 1.4;">
              <span class="info-mark">!</span>
              <p><strong>Portal Status:</strong> ${escapeHTML(study.availability)}</p>
            </div>
          `
              : ''
          }

          <div class="explorer-meta-kv">
            <span>${study.identifierType === 'NASA_EXPERIMENT_IDENTIFIER' ? 'Experiment ID' : 'Study Accession'}</span><strong>${escapeHTML(study.accession)}</strong>
            <span>Record Type</span><strong>${study.identifierType === 'NASA_EXPERIMENT_IDENTIFIER' ? 'NASA Experiment Identifier' : 'NASA OSDR Study Accession'}</strong>
            <span>Target Organism</span><strong>${escapeHTML(study.organism)}</strong>
            <span>Tissue / Specimen</span><strong>${escapeHTML(study.tissue || 'Not specified')}</strong>
            <span>Mission / Payload</span><strong>${escapeHTML(study.mission)}</strong>
            <span>Verification Status</span><strong style="color: ${study.verificationStatus === 'STUDY_UNAVAILABLE_ON_PORTAL' ? '#ebbd71' : '#88dce5'};">${escapeHTML(study.verificationStatus || 'VERIFIED')}</strong>
          </div>

          <p style="font-size: 11px; line-height: 1.5; color: #c4d4de; margin: 0 0 10px;">
            <strong>Key Findings:</strong> ${escapeHTML(study.keyFindings)}
          </p>

          <div class="explorer-callout callout-purple">
            <strong>ASTRONAUT COUNTERMEASURE RELEVANCE:</strong>
            ${escapeHTML(study.astronautRelevance)}
          </div>

          <div style="margin-top: 10px; font-size: 10px; color: #7f95a5; line-height: 1.4;">
            <em>Limitations: ${escapeHTML(study.limitations)}</em>
          </div>

          <div style="margin-top: 12px; display: flex; justify-content: flex-end;">
            <a href="${escapeHTML(study.sourceUrl)}" target="_blank" rel="noreferrer" class="explorer-btn" style="text-decoration: none; ${study.verificationStatus === 'STUDY_UNAVAILABLE_ON_PORTAL' ? 'border-color: rgba(240,182,96,.4); color: #ebbd71;' : ''}">
              ${study.identifierType === 'NASA_EXPERIMENT_IDENTIFIER' ? 'Open in NASA Life Sciences Archive (LSDA) ↗' : study.verificationStatus === 'STUDY_UNAVAILABLE_ON_PORTAL' ? 'Check Status on NASA OSDR Portal ↗' : 'Open in NASA OSDR Repository ↗'}
            </a>
          </div>
        </article>
      `
              )
              .join('')
      }
    </div>

    ${renderProvenanceBox(data?.provenance)}
  `;
}

/**
 * Tab 3: NASA RadLab Radiation Dosimetry View
 */
function renderRadlabTab(radlabState) {
  const data = radlabState.data;
  const records = data?.records || [];
  const benchmarks = data?.benchmarks || [];

  return `
    <div class="notice notice-green" style="margin-bottom: 16px;">
      <span class="info-mark">✓</span>
      <p>
        <strong>SPACE RADIATION DOSIMETRY & BENCHMARKS</strong><br />
        Displaying authentic ionizing radiation measurements from the official NASA RadLab API alongside peer-reviewed literature benchmarks (ISS, MSL RAD) and international lunar surface data (Chang'e 4 / Kiel University).
        ${data?.dataSource === 'live_nasa_api' ? 'Active telemetry retrieved from official NASA RadLab API.' : 'Curated peer-reviewed flight archives loaded with full provenance.'}
      </p>
    </div>

    <!-- Educational Callout on Units & Scientific Rigor -->
    <div class="explorer-callout" style="margin-bottom: 18px;">
      <strong>PHYSICAL DOSIMETRY VS. SIMULATOR RISK INDEX:</strong><br />
      • <strong>Units & Physical Meaning:</strong> <em>Absorbed dose</em> (measured in μGy, where 1 mGy = 1,000 μGy) represents physical energy deposited per unit mass (Joules/kg). <em>Dose equivalent</em> (measured in μSv, where 1 mSv = 1,000 μSv) weights absorbed dose by particle quality factor <em>Q</em> to reflect biological damage to human tissue.<br />
      • <strong>Authentic Lunar Surface Dosimetry:</strong> The Chang'e 4 Lunar Lander Neutrons and Dosimetry (LND) experiment (Zhang et al., <em>Sci. Adv.</em> 2020, DOI: 10.1126/sciadv.aaz1334) measured a total absorbed dose rate in silicon of <strong>13.2 ± 1 μGy/hour</strong> and a GCR charged-particle dose-equivalent rate converted to water of <strong>57.1 ± 10.6 μSv/hour</strong>. The 1.37 mSv/day figure is a <strong>24-hour arithmetic extrapolation</strong> (57.1 × 24h), not a measured daily cumulative total. The unshielded lunar surface does <strong>not</strong> have an equivalent dose of 0.3–0.5 mSv/day (which conflates absorbed dose in mGy with equivalent dose in mSv, or applies only to heavily shielded habitats).<br />
      • <strong>Data Provenance:</strong> Chang'e 4 LND is an <em>external international measurement</em> (CNSA / Kiel University), presented alongside NASA RadLab telemetry for scientific comparison.<br />
      • <strong>Habitat Shielding:</strong> Orbital (ISS) and planetary measurements cannot be applied as interior habitat doses without validated particle transport models. Habitat regolith berming concepts are educational engineering models.
    </div>

    <!-- Radiation Benchmark Scale Table -->
    <section class="panel" style="margin-bottom: 20px;">
      <div class="section-heading">
        <div>
          <p class="eyebrow">ENVIRONMENTAL COMPARISON</p>
          <h2>Space Radiation Benchmark Scale</h2>
        </div>
        <span class="tag tag-blue">SI EQUIVALENT DOSES</span>
      </div>
      <p class="section-description">
        Compare the physical dose equivalent rate across different planetary and spaceflight environments.
        Notice that an unshielded astronaut on the lunar surface receives ~1,370 μSv/day (57.1 μSv/hour = 1.37 mSv/day)—nearly 2,000 times higher than Earth sea level!
      </p>

      <div class="table-scroll">
        <table class="benchmark-table">
          <thead>
            <tr>
              <th>ENVIRONMENT / MISSION</th>
              <th>HOURLY RATE (μSv/h)</th>
              <th>DOSE EQUIVALENT (μSv/DAY)</th>
              <th>ANNUALIZED (mSv/YR)</th>
              <th>PRIMARY SHIELDING MECHANISM</th>
              <th>PHYSICAL CONTEXT</th>
            </tr>
          </thead>
          <tbody>
            ${benchmarks
              .map(
                (b) => `
              <tr class="${b.location.includes('Lunar Surface') ? 'benchmark-highlight' : ''}">
                <td><strong>${escapeHTML(b.location)}</strong></td>
                <td><strong style="font-family: 'DM Mono', monospace;">${escapeHTML(b.doseEquivalentRateUSvHour)}</strong> μSv/h</td>
                <td><strong style="font-family: 'DM Mono', monospace;">${escapeHTML(b.doseEquivalentRateUSvDay)}</strong> μSv/day</td>
                <td>${escapeHTML(b.mSvPerYear)}</td>
                <td>${escapeHTML(b.shielding)}</td>
                <td>${escapeHTML(b.description)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
      <p class="data-caption" style="margin-top: 10px;">
        <span class="info-mark">i</span>
        <strong>Junior Astronaut Note on Extrapolations:</strong>
        Annualized values (such as 500.2 mSv/year for the unshielded lunar surface) are continuous-exposure arithmetic extrapolations (daily rate × 365) assuming constant quiet conditions. They do <em>not</em> represent an observed full year of Chang'e 4 surface operations. Actual annual exposure fluctuates with solar cycle progression and acute space weather events.
      </p>
    </section>

    <!-- Specific Dosimetry Records Grid -->
    <div class="explorer-cards-grid">
      ${records
        .map(
          (rec) => `
        <article class="explorer-data-card">
          <div class="explorer-data-card-header">
            <div>
              <span class="eyebrow">${escapeHTML(rec.detectorLocation)}</span>
              <h3>${escapeHTML(rec.instrument)}</h3>
            </div>
            <span class="tag ${rec.category === DATA_CATEGORIES.REAL_NASA_DATA ? 'tag-blue' : 'tag-outline'}">
              ${escapeHTML(rec.classificationLabel || (rec.category === DATA_CATEGORIES.REAL_NASA_DATA ? 'REAL NASA DATA' : 'LITERATURE BENCHMARK'))}
            </span>
          </div>

          <div class="explorer-meta-kv">
            <span>Mission / Vehicle</span><strong>${escapeHTML(rec.mission)}</strong>
            <span>Detector Type</span><strong>${escapeHTML(rec.detectorType)}</strong>
            <span>Observation Date</span><strong>${escapeHTML(rec.observationDate || rec.timestamp)}</strong>
            <span>Environment</span><strong>${escapeHTML(rec.environment)}</strong>
            <span>Native Absorbed Rate</span><strong>${escapeHTML(rec.measurements?.absorbedDoseRateUGyHour)} μGy/hour</strong>
            <span>Native Dose Eq Rate</span><strong>${escapeHTML(rec.measurements?.doseEquivalentRateUSvHour)} μSv/hour</strong>
            <span>24h Reference Absorbed</span><strong>${escapeHTML(rec.measurements?.absorbedDoseRateUGyDay)} μGy/day (24h ref)</strong>
            <span>24h Reference Dose Eq</span><strong>${escapeHTML(rec.measurements?.doseEquivalentRateUSvDay)} μSv/day (24h ref)</strong>
            ${rec.measurements?.qualityFactorQ ? `<span>Quality Factor Q</span><strong>${escapeHTML(rec.measurements.qualityFactorQ)}</strong>` : ''}
          </div>

          <p style="font-size: 11px; line-height: 1.5; color: #c4d4de; margin: 0 0 10px;">
            ${escapeHTML(rec.scientificSignificance)}
          </p>

          ${
            rec.integrationMethod
              ? `<div style="margin-bottom: 8px; font-size: 10px; color: #8ba0b1; font-family: 'DM Mono', monospace; line-height: 1.4;">
                  <strong>Integration Method:</strong> ${escapeHTML(rec.integrationMethod)}
                </div>`
              : ''
          }

          <div class="explorer-callout">
            <strong>SCIENTIFIC LIMITATION:</strong>
            ${escapeHTML(rec.limitations)}
          </div>
        </article>
      `
        )
        .join('')}
    </div>

    ${renderProvenanceBox(data?.provenance)}
  `;
}

/**
 * Tab 4: Lunar Surface Environment View (Diviner & SVS 5027)
 */
function renderSurfaceTab(appBasePath) {
  return `
    <div class="notice notice-green" style="margin-bottom: 16px;">
      <span class="info-mark">✓</span>
      <p>
        <strong>REAL NASA DATA — ARCHIVED LUNAR SURFACE OBSERVATIONS</strong><br />
        Displaying verified NASA Planetary Data System (PDS) LRO Diviner bolometric surface temperature mosaic
        and NASA Goddard Scientific Visualization Studio (SVS 5027) illumination data.
      </p>
    </div>

    <section class="panel nasa-observation">
      <div class="section-heading">
        <div>
          <p class="eyebrow">REAL NASA DATA — HISTORICAL OBSERVATION</p>
          <h2>${escapeHTML(NASA_DIVINER_MOSAIC.title)}</h2>
        </div>
        <span class="tag tag-blue">PDS BROWSE IMAGE</span>
      </div>
      <p class="body-copy">
        This is the actual PDS JPEG browse rendering linked to derived Diviner data products.
        The image is bundled locally and displays offline.
        In strict adherence to scientific data integrity, numeric pixel values are NOT extracted or treated as quantitative cabin temperatures.
      </p>
      <figure class="nasa-figure">
        <a href="${escapeHTML(NASA_DIVINER_MOSAIC.sourceUrl)}" target="_blank" rel="noreferrer">
          <img data-nasa-image src="${escapeHTML(appBasePath)}${escapeHTML(NASA_DIVINER_MOSAIC.localImagePath)}" alt="${escapeHTML(NASA_DIVINER_MOSAIC.localImageAlt)}" loading="lazy" />
        </a>
        <figcaption>
          ${escapeHTML(NASA_DIVINER_MOSAIC.datasetName)} · NASA Planetary Data System Geosciences Node ·
          <a href="${escapeHTML(NASA_DIVINER_MOSAIC.metadataUrl)}" target="_blank" rel="noreferrer">Open PDS product label ↗</a>
        </figcaption>
      </figure>

      <div class="nasa-metadata-grid">
        <div><span>Mission / Instrument</span><strong>Lunar Reconnaissance Orbiter / Diviner Lunar Radiometer</strong></div>
        <div><span>Measurement</span><strong>Bolometric temperature at midnight (browse rendering)</strong></div>
        <div><span>Collection Period</span><strong>${escapeHTML(NASA_DIVINER_MOSAIC.collectionPeriod)}</strong></div>
        <div><span>Spatial Coverage</span><strong>${escapeHTML(NASA_DIVINER_MOSAIC.spatialApplicability)}</strong></div>
        <div><span>Units</span><strong>Browse JPEG only; calibrated numerical tables require separate PDS bundle extraction</strong></div>
        <div><span>Use & Limitations</span><strong>${escapeHTML(NASA_DIVINER_MOSAIC.limitations)}</strong></div>
      </div>
    </section>

    <!-- South Pole Illumination Context -->
    <section class="panel" style="margin-top: 16px;">
      <div class="section-heading">
        <div>
          <p class="eyebrow">TERRAIN & SOLAR POWER CONTEXT</p>
          <h2>NASA SVS 5027 — Lunar South Pole Illumination</h2>
        </div>
        <span class="tag tag-blue">SVS VISUALIZATION</span>
      </div>
      <p class="body-copy">
        NASA Scientific Visualization Studio entry 5027 models lighting conditions at the Moon's South Pole (to 80°S) between 2025 and 2028
        using LRO LOLA topography and JPL DE421 planetary ephemeris.
      </p>
      <div class="explorer-callout">
        <strong>CRITICAL LUNAR POWER PRINCIPLE:</strong>
        Because of the Moon's tiny axial tilt (1.54°), sunlight skims horizontally across polar crater rims.
        Elevated ridges can receive over 80% sunlight across the lunar year, while adjacent crater bottoms (such as Shackleton) remain in permanent shadow (PSRs) at 27–40 Kelvin, trapping water ice volatiles.
        This visualization provides valuable terrain context, but is not converted into a real-time electrical power forecast.
      </div>
      <div style="margin-top: 12px;">
        <a href="https://svs.gsfc.nasa.gov/5027" target="_blank" rel="noreferrer" class="explorer-btn" style="text-decoration: none;">
          Explore NASA SVS 5027 Source Archive ↗
        </a>
      </div>
    </section>
  `;
}

/**
 * Tab 5: Scientific Integrity & Provenance Guide View
 */
function renderProvenanceGuideTab() {
  return `
    <div class="notice notice-green" style="margin-bottom: 16px;">
      <span class="info-mark">✓</span>
      <p>
        <strong>SCIENTIFIC INTEGRITY & NASA DATA ARCHITECTURE STANDARDS</strong><br />
        LunarBase adheres to rigorous scientific transparency standards for the NASA Space Apps Challenge 2026.
        All information is separated into three distinct, non-overlapping categories.
      </p>
    </div>

    <div class="explorer-cards-grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
      <!-- Tier 1 -->
      <article class="explorer-data-card" style="border-top: 3px solid var(--blue);">
        <div class="explorer-data-card-header">
          <div>
            <span class="eyebrow">TIER 1 CLASSIFICATION</span>
            <h3>REAL NASA DATA</h3>
          </div>
          <span class="tag tag-blue">OBSERVATIONS</span>
        </div>
        <p style="font-size: 11px; line-height: 1.6; color: #c4d4de;">
          Actual physical telemetry and observations gathered by NASA missions, spacecraft sensors, and ground stations.
        </p>
        <div class="explorer-callout">
          <strong>Examples in LunarBase:</strong>
          • NASA DONKI solar flare records from GOES satellites.<br />
          • NASA RadLab radiation dosimetry from ISS Liulin-6R and MSL RAD.<br />
          • NASA LRO Diviner midnight thermal surface mosaic from PDS.
        </div>
      </article>

      <!-- Tier 2 -->
      <article class="explorer-data-card" style="border-top: 3px solid #ba93f5;">
        <div class="explorer-data-card-header">
          <div>
            <span class="eyebrow">TIER 2 CLASSIFICATION</span>
            <h3>RESEARCH EVIDENCE</h3>
          </div>
          <span class="tag tag-purple">NASA STUDIES</span>
        </div>
        <p style="font-size: 11px; line-height: 1.6; color: #c4d4de;">
          Peer-reviewed scientific publications, spaceflight biology experiments, and multi-omics datasets.
        </p>
        <div class="explorer-callout callout-purple">
          <strong>Examples in LunarBase:</strong>
          • NASA OSDR studies (OSD-379, OSD-452) on rodent muscle/bone loss.<br />
          • Human astronaut immune dysregulation findings (OSD-665).<br />
          • Spaceflight circadian phase shifts and melatonin regulation (OSD-566).
        </div>
      </article>

      <!-- Tier 3 -->
      <article class="explorer-data-card" style="border-top: 3px solid var(--amber);">
        <div class="explorer-data-card-header">
          <div>
            <span class="eyebrow">TIER 3 CLASSIFICATION</span>
            <h3>SIMULATED DATA</h3>
          </div>
          <span class="tag tag-amber">MISSION MODEL</span>
        </div>
        <p style="font-size: 11px; line-height: 1.6; color: #c4d4de;">
          Interactive educational values generated by our mission engine using documented engineering assumptions.
        </p>
        <div class="explorer-callout callout-amber">
          <strong>Examples in LunarBase:</strong>
          • Habitat oxygen reserve (20,000 L) and daily crew consumption (588 L/day).<br />
          • Water recycler efficiency (90%) and power balances.<br />
          • Simplified relative radiation risk index (0–100 scale).
        </div>
      </article>
    </div>

    <!-- Security & Key Disclosure -->
    <section class="panel" style="margin-top: 20px;">
      <div class="section-heading">
        <div>
          <p class="eyebrow">CLIENT-SIDE ARCHITECTURE & SECURITY</p>
          <h2>API Key Security & Deployment Disclosure</h2>
        </div>
        <span class="tag tag-amber">PUBLIC CLIENT</span>
      </div>
      <div style="font-size: 11px; line-height: 1.65; color: #a4bbc7;">
        <p>
          <strong>Static Website Architecture:</strong> LunarBase is deployed as a static client-side web application hosted on GitHub Pages.
          Browser requests to <code>api.nasa.gov</code> are made directly from the client using CORS headers supported by NASA Open APIs.
        </p>
        <p>
          <strong>Transparent Key Handling:</strong> By default, the application uses NASA's public <code>DEMO_KEY</code> (rate-limited per IP).
          Users can optionally provide their own personal API key in Settings.
          We explicitly disclose: <strong>Browser-side API keys are stored in localStorage and are visible to anyone inspecting developer tools. Never enter a sensitive, private, or production cloud credential.</strong>
        </p>
        <p>
          <strong>100% Offline Capability:</strong> If network connectivity is lost, if NASA servers are undergoing maintenance, or if rate limits are reached,
          the application gracefully falls back to authentic, verified NASA records with full provenance.
          The test suite and trainer never crash due to network unavailability.
        </p>
      </div>
    </section>
  `;
}

/**
 * Main NASA Data Explorer View Renderer
 */
export function renderNASAExplorerView(appState, appBasePath = '/') {
  const activeTab = appState.explorerTab || 'donki';

  return `
    <header class="page-heading">
      <div>
        <p class="eyebrow">NASA OPEN DATA INTEGRATION · SCIENTIFIC RESEARCH CENTER</p>
        <h1>NASA Data Explorer</h1>
        <p class="page-description">
          Explore genuine NASA datasets across space weather (DONKI), space biology (OSDR), radiation dosimetry (RadLab), and lunar surface observations (LRO Diviner).
          Each record maintains complete source provenance, units, and clear labeling between real observations and educational simulation.
        </p>
      </div>
    </header>

    <!-- Explorer Navigation Tabs -->
    <nav class="explorer-tabs" aria-label="NASA Data Explorer categories">
      ${EXPLORER_TABS.map(
        (tab) => `
        <button
          type="button"
          class="explorer-tab-btn ${activeTab === tab.id ? 'active' : ''}"
          data-explorer-tab="${escapeHTML(tab.id)}"
        >
          <span>${escapeHTML(tab.icon)}</span>
          <strong>${escapeHTML(tab.label)}</strong>
        </button>
      `
      ).join('')}
    </nav>

    <!-- Tab Content -->
    ${
      activeTab === 'donki'
        ? renderDonkiTab(appState.donkiState, appBasePath)
        : activeTab === 'osdr'
          ? renderOsdrTab(appState.osdrState)
          : activeTab === 'radlab'
            ? renderRadlabTab(appState.radlabState)
            : activeTab === 'surface'
              ? renderSurfaceTab(appBasePath)
              : renderProvenanceGuideTab()
    }
  `;
}
