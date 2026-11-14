/**
 * NASA RadLab Radiation Dosimetry API Client
 * Retrieves authentic radiation dosimetry records from NASA's Open Science Data Repository RadLab portal.
 *
 * Official NASA Endpoint:
 * https://visualization.osdr.nasa.gov/radlab/api/
 *
 * Query Syntax:
 * - format=json (required for JSON responses)
 * - spacecraft, instrument, query parameters
 *
 * Documented Rate Units:
 * - absorbed_dose_rate: μGy/hour
 * - dose_equivalent_rate: μSv/hour
 *
 * Scientific Integrity Rules:
 * - Preserve native hourly rates (μGy/hour, μSv/hour) without presenting unintegrated hourly reads as observed daily totals.
 * - Calculate 24-hour quiet baselines (rate × 24h) with explicit documentation of the integration method.
 * - Enforce strict classification:
 *   * Live RadLab API records -> REAL_NASA_DATA
 *   * Curated ISS / MSL flight records -> LITERATURE_BENCHMARK
 *   * Chang'e 4 Lunar Lander -> External International Measurement (Kiel / CNSA)
 * - Safe handling of empty, malformed, and failed responses.
 */

import { fetchJson, ApiError } from './apiClient.js';
import { getCachedData, setCachedData } from '../cacheService.js';
import { DATA_CATEGORIES, createProvenanceRecord } from '../provenance.js';
import { RADLAB_DOSIMETRY_RECORDS, RADIATION_BENCHMARK_SCALE } from '../curated/radlabRecords.js';

export const RADLAB_BASE_URL = 'https://visualization.osdr.nasa.gov/radlab/api/';
const CACHE_KEY = 'radlab_dosimetry_records_v2';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Builds the official RadLab API query URL with format=json and optional filter parameters.
 * @param {Object} [params={}] Query filters (spacecraft, instrument, query, etc.)
 * @returns {string} Formatted query URL
 */
export function buildRadLabQueryUrl(params = {}) {
  const url = new URL(RADLAB_BASE_URL);
  url.searchParams.set('format', 'json');

  if (params.spacecraft) url.searchParams.set('spacecraft', String(params.spacecraft).trim());
  if (params.instrument) url.searchParams.set('instrument', String(params.instrument).trim());
  if (params.query) url.searchParams.set('query', String(params.query).trim());

  return url.toString();
}

/**
 * Parses a single raw record from the official RadLab API.
 * Preserves native rate units (μGy/hour, μSv/hour) and provides justified 24h reference baselines.
 *
 * @param {Object} raw Raw record object from NASA RadLab API
 * @param {number} [index=0] Record sequence index for ID fallback
 * @returns {Object|null} Normalized telemetry record or null if invalid
 */
export function parseRadLabRecord(raw, index = 0) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  // Parse absorbed_dose_rate (native μGy/hour)
  const rawAbsorbed = raw.absorbed_dose_rate ?? raw.absorbedDoseRateUGyHour ?? raw.absorbedDoseRate;
  const numAbsorbed = rawAbsorbed != null ? Number(rawAbsorbed) : null;
  const validAbsorbed =
    numAbsorbed !== null && !Number.isNaN(numAbsorbed) && Number.isFinite(numAbsorbed) && numAbsorbed >= 0;

  // Parse dose_equivalent_rate (native μSv/hour)
  const rawDoseEq = raw.dose_equivalent_rate ?? raw.doseEquivalentRateUSvHour ?? raw.doseEquivalentRate;
  const numDoseEq = rawDoseEq != null ? Number(rawDoseEq) : null;
  const validDoseEq =
    numDoseEq !== null && !Number.isNaN(numDoseEq) && Number.isFinite(numDoseEq) && numDoseEq >= 0;

  // If neither rate is valid, reject as malformed
  if (!validAbsorbed && !validDoseEq) {
    return null;
  }

  const absorbedHour = validAbsorbed ? numAbsorbed : 0;
  const doseEqHour = validDoseEq ? numDoseEq : 0;

  // Justified nominal 24-hour quiet reference baseline (hourly rate * 24h)
  const absorbedDay = Number((absorbedHour * 24).toFixed(2));
  const doseEqDay = Number((doseEqHour * 24).toFixed(2));

  const qualityFactor =
    raw.quality_factor != null
      ? Number(raw.quality_factor)
      : absorbedHour > 0 && doseEqHour > 0
        ? Number((doseEqHour / absorbedHour).toFixed(2))
        : null;

  const timestamp = raw.timestamp || raw.date || raw.time || new Date().toISOString();
  const spacecraft = raw.spacecraft || raw.mission || 'NASA Flight Investigation';
  const instrument = raw.instrument || raw.detector || 'NASA Dosimeter';

  return {
    recordId: raw.id || raw.recordId || `RADLAB-LIVE-${index + 1}`,
    instrument,
    spacecraft,
    mission: spacecraft,
    detectorLocation: raw.detector_location || raw.detectorLocation || raw.location || 'Flight Detector',
    detectorType: raw.detector_type || raw.detectorType || 'Silicon Semiconductor / TEPC',
    timestamp,
    observationDate:
      typeof timestamp === 'string' ? timestamp.slice(0, 10) : new Date().toISOString().slice(0, 10),
    category: DATA_CATEGORIES.REAL_NASA_DATA,
    classificationLabel: 'Official NASA RadLab Telemetry Record',
    source: 'NASA OSDR RadLab Data API',
    sourceUrl: RADLAB_BASE_URL,
    environment: raw.environment || `${spacecraft} Orbit / Environment`,
    measurements: {
      absorbedDoseRateUGyHour: absorbedHour,
      doseEquivalentRateUSvHour: doseEqHour,
      absorbedDoseRateUGyDay: absorbedDay,
      doseEquivalentRateUSvDay: doseEqDay,
      qualityFactorQ: qualityFactor && !Number.isNaN(qualityFactor) ? qualityFactor : null
    },
    units: {
      absorbedDoseRateUGyHour: 'μGy/hour (Native NASA RadLab telemetry)',
      doseEquivalentRateUSvHour: 'μSv/hour (Native NASA RadLab telemetry)',
      absorbedDoseRateUGyDay: 'μGy/day (24h quiet reference extrapolation: rate × 24h)',
      doseEquivalentRateUSvDay: 'μSv/day (24h quiet reference extrapolation: rate × 24h)',
      qualityFactorQ: 'dimensionless'
    },
    integrationMethod:
      'Native NASA RadLab telemetry fields are recorded in hourly units (μGy/hour, μSv/hour). 24-hour values are calculated as nominal quiet period reference baselines (rate × 24h). Actual orbital rates vary with orbital inclination, altitude, solar cycle, and South Atlantic Anomaly (SAA) passages.',
    scientificSignificance:
      raw.description || `Measured ionizing radiation field aboard ${spacecraft} via ${instrument}.`,
    limitations:
      'Physical spaceflight detector telemetry. Must not be equated to interior lunar habitat exposure without accounting for 1.5+ meters of regolith shielding and radiation transport physics (e.g. HZETRN).'
  };
}

/**
 * Safely extracts an array of records from various RadLab response envelopes.
 * @param {any} json Parsed JSON payload
 * @returns {Array<Object>}
 */
function extractRecordsArray(json) {
  if (Array.isArray(json)) return json;
  if (json && typeof json === 'object') {
    if (Array.isArray(json.records)) return json.records;
    if (Array.isArray(json.data)) return json.data;
    if (Array.isArray(json.results)) return json.results;
  }
  return [];
}

/**
 * Retrieves radiation dosimetry records from NASA RadLab or verified curated benchmarks.
 *
 * @param {Object} [options={}] Fetch configuration
 * @param {boolean} [options.offlineOnly=false] Bypass network and return curated records
 * @param {boolean} [options.forceRefresh=false] Bypass cache
 * @param {number} [options.timeoutMs=6000] Request timeout
 * @param {Function} [options.fetchFn] Custom fetch implementation for testing
 * @param {Object} [options.params] Query parameters for RadLab API
 * @returns {Promise<Object>} Object containing records, benchmarks, errorNotice, dataSource, and provenance
 */
export async function getRadLabDosimetryData(options = {}) {
  const cached = getCachedData(CACHE_KEY);
  if (cached && !options.forceRefresh) {
    return {
      ...cached.data,
      isCached: true,
      cachedAt: cached.cachedAt
    };
  }

  let errorNotice = null;
  let liveRecords = [];
  let dataSource = 'curated_nasa_archive';

  if (!options.offlineOnly) {
    const requestUrl = buildRadLabQueryUrl(options.params || {});
    try {
      const json = await fetchJson(requestUrl, {
        timeoutMs: options.timeoutMs ?? 6000,
        fetchFn: options.fetchFn
      });

      const rawItems = extractRecordsArray(json);
      if (rawItems.length > 0) {
        liveRecords = rawItems
          .map((item, idx) => parseRadLabRecord(item, idx))
          .filter((rec) => rec !== null);

        if (liveRecords.length > 0) {
          dataSource = 'live_nasa_api';
        }
      }
    } catch (err) {
      errorNotice = {
        message: err.message,
        errorType: err instanceof ApiError ? err.errorType : 'FETCH_ERROR',
        status: err.status ?? null
      };
      dataSource = 'curated_nasa_archive';
    }
  }

  const isLive = dataSource === 'live_nasa_api';
  const records = isLive && liveRecords.length > 0 ? liveRecords : [...RADLAB_DOSIMETRY_RECORDS];

  const provenance = isLive
    ? createProvenanceRecord({
        datasetName: 'NASA RadLab Space Radiation Dosimetry Repository',
        source: 'NASA Open Science Data Repository (OSDR) & Space Radiation Analysis Group (SRAG)',
        sourceUrl: RADLAB_BASE_URL,
        retrievalTimestamp: new Date().toISOString(),
        collectionPeriod: 'Active flight sensor telemetry',
        spatialApplicability: 'Flight detector locations (Low Earth Orbit, Deep Space transit)',
        temporalApplicability: 'Sensor query observation timestamps',
        units: {
          absorbedDoseRateUGyHour: 'μGy/hour (Microgray per hour, native RadLab field)',
          doseEquivalentRateUSvHour: 'μSv/hour (Microsievert per hour, native RadLab field)',
          absorbedDoseRateUGyDay: 'μGy/day (24h quiet reference extrapolation)',
          doseEquivalentRateUSvDay: 'μSv/day (24h quiet reference extrapolation)'
        },
        description:
          'Physical radiation dosimetry telemetry retrieved from the official NASA RadLab Data API, measuring absorbed dose rate and dose equivalent rate in native hourly units.',
        limitations:
          'Physical spaceflight detector telemetry. Not a direct measurement of interior lunar habitat dose without regolith shielding and radiation transport modeling.',
        category: DATA_CATEGORIES.REAL_NASA_DATA
      })
    : createProvenanceRecord({
        datasetName: 'NASA RadLab Dosimetry Catalog & Peer-Reviewed Literature Benchmarks',
        source: 'NASA OSDR RadLab, SRAG, MSL RAD SwRI Team, and Kiel University / CNSA',
        sourceUrl: RADLAB_BASE_URL,
        retrievalTimestamp: new Date().toISOString(),
        collectionPeriod: '2012 to 2019 measured missions (ISS, MSL RAD, Lunar Surface benchmark)',
        spatialApplicability:
          "Low Earth Orbit (ISS Columbus and Service Modules), Interplanetary Cruise (MSL), Mars Surface (Gale Crater), and Lunar Surface (Chang'e 4)",
        temporalApplicability: 'Flight sensor observation periods during solar quiet baselines',
        units: {
          absorbedDoseRateUGyHour: 'μGy/hour (Microgray per hour, native RadLab unit)',
          doseEquivalentRateUSvHour: 'μSv/hour (Microsievert per hour, native RadLab unit)',
          absorbedDoseRateUGyDay: 'μGy/day (24h quiet reference extrapolation)',
          doseEquivalentRateUSvDay: 'μSv/day (24h quiet reference extrapolation)'
        },
        description:
          "Curated space radiation dosimetry records compiled from NASA RadLab specifications, peer-reviewed literature (ISS SRAG, MSL RAD), and international lunar surface measurements (Chang'e 4 LND).",
        limitations:
          'Curated literature-derived benchmarks and external international observations. ISS and Mars measurements do not represent direct lunar habitat conditions.',
        category: DATA_CATEGORIES.LITERATURE_BENCHMARK
      });

  const result = {
    records,
    benchmarks: RADIATION_BENCHMARK_SCALE,
    errorNotice,
    dataSource,
    provenance
  };

  setCachedData(CACHE_KEY, result, CACHE_TTL_MS);
  return result;
}

/**
 * Returns the radiation benchmark scale.
 * @returns {Array<Object>}
 */
export function getRadiationBenchmarks() {
  return [...RADIATION_BENCHMARK_SCALE];
}
