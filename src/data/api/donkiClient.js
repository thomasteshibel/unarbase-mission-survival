/**
 * NASA DONKI (Space Weather Database Of Notifications, Knowledge, Information) API Client
 *
 * Integrates Solar Flares, Coronal Mass Ejections, Solar Energetic Particles, and Geomagnetic Storms.
 *
 * Security & Key Management:
 * - Uses DEMO_KEY by default (rate-limited by IP on api.nasa.gov).
 * - Allows user to provide an optional custom NASA API key stored in browser localStorage.
 * - Explicit disclosure: Browser-stored keys are NOT secret and are visible in developer tools.
 * - Always falls back gracefully to curated historical NASA records when offline or rate-limited.
 */

import { fetchJson, ApiError } from './apiClient.js';
import { getCachedData, setCachedData } from '../cacheService.js';
import { DATA_CATEGORIES, createProvenanceRecord } from '../provenance.js';
import { CURATED_DONKI_SPACE_WEATHER } from '../curated/donkiEvents.js';

const DONKI_BASE_URL = 'https://api.nasa.gov/DONKI/';
const API_KEY_STORAGE_KEY = 'lunarbase_nasa_api_key_v1';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

let inMemoryApiKey = null;

/**
 * Returns the currently active NASA API key.
 * Defaults to 'DEMO_KEY'.
 */
export function getNasaApiKey() {
  if (inMemoryApiKey) {
    return inMemoryApiKey;
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(API_KEY_STORAGE_KEY);
      if (stored && stored.trim()) {
        return stored.trim();
      }
    }
  } catch {}
  return 'DEMO_KEY';
}

/**
 * Stores a custom user NASA API key.
 * @param {string} key
 */
export function setNasaApiKey(key) {
  inMemoryApiKey = key && key.trim() && key.trim() !== 'DEMO_KEY' ? key.trim() : null;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (!key || !key.trim() || key.trim() === 'DEMO_KEY') {
        window.localStorage.removeItem(API_KEY_STORAGE_KEY);
      } else {
        window.localStorage.setItem(API_KEY_STORAGE_KEY, key.trim());
      }
    }
  } catch {}
}

/**
 * Retrieves space weather records across solar flares, CMEs, SEPs, and GSTs.
 * @param {Object} options Options including startDate, endDate, eventType, forceRefresh, fetchFn
 * @returns {Promise<Object>} Space weather dataset with provenance and error details
 */
export async function getSpaceWeatherData(options = {}) {
  const apiKey = options.apiKey || getNasaApiKey();
  const startDate = options.startDate || '2024-05-01';
  const endDate = options.endDate || '2024-05-20';
  const eventType = options.eventType || 'all'; // 'all' | 'FLR' | 'CME' | 'SEP' | 'GST'

  const cacheKey = `donki_${eventType}_${startDate}_${endDate}`;
  const cached = getCachedData(cacheKey);

  if (cached && !options.forceRefresh) {
    return {
      ...cached.data,
      isCached: true,
      cachedAt: cached.cachedAt
    };
  }

  let liveData = {
    flares: [],
    cme: [],
    sep: [],
    geomagneticStorms: []
  };
  let errorNotice = null;
  let dataSource = 'curated_nasa_archive';

  if (!options.offlineOnly) {
    try {
      const endpoints = [];
      if (eventType === 'all' || eventType === 'FLR') {
        endpoints.push({
          type: 'flares',
          url: `${DONKI_BASE_URL}FLR?startDate=${startDate}&endDate=${endDate}&api_key=${encodeURIComponent(apiKey)}`
        });
      }
      if (eventType === 'all' || eventType === 'CME') {
        endpoints.push({
          type: 'cme',
          url: `${DONKI_BASE_URL}CME?startDate=${startDate}&endDate=${endDate}&api_key=${encodeURIComponent(apiKey)}`
        });
      }
      if (eventType === 'all' || eventType === 'SEP') {
        endpoints.push({
          type: 'sep',
          url: `${DONKI_BASE_URL}SEP?startDate=${startDate}&endDate=${endDate}&api_key=${encodeURIComponent(apiKey)}`
        });
      }
      if (eventType === 'all' || eventType === 'GST') {
        endpoints.push({
          type: 'geomagneticStorms',
          url: `${DONKI_BASE_URL}GST?startDate=${startDate}&endDate=${endDate}&api_key=${encodeURIComponent(apiKey)}`
        });
      }

      const results = await Promise.allSettled(
        endpoints.map(async (ep) => {
          const json = await fetchJson(ep.url, {
            timeoutMs: options.timeoutMs ?? 7000,
            fetchFn: options.fetchFn
          });
          return { type: ep.type, data: json };
        })
      );

      let anySuccess = false;
      for (const res of results) {
        if (res.status === 'fulfilled' && Array.isArray(res.value.data)) {
          anySuccess = true;
          const { type, data } = res.value;

          if (type === 'flares') {
            liveData.flares = data.slice(0, 15).map((f) => ({
              flrID: f.flrID || 'UNKNOWN-FLR',
              beginTime: f.beginTime,
              peakTime: f.peakTime,
              endTime: f.endTime,
              classType: f.classType || 'Unclassified',
              sourceLocation: f.sourceLocation || 'Unspecified',
              activeRegionNum: f.activeRegionNum || null,
              instruments: f.instruments ? f.instruments.map((i) => i.displayName).join(', ') : 'GOES',
              link: f.link || 'https://ccmc.gsfc.nasa.gov/tools/DONKI/',
              category: DATA_CATEGORIES.REAL_NASA_DATA,
              scientificExplanation: `Solar flare of class ${f.classType || 'Unknown'} observed by NASA/NOAA heliophysics assets.`,
              lunarRelevance: 'Prompt electromagnetic emission. Warns of impending CME and high-energy particle acceleration.'
            }));
          } else if (type === 'cme') {
            liveData.cme = data.slice(0, 10).map((c) => ({
              activityID: c.activityID,
              startTime: c.startTime,
              sourceLocation: c.sourceLocation,
              note: c.note || 'Coronal Mass Ejection detected by coronagraph imagery.',
              instruments: c.instruments ? c.instruments.map((i) => i.displayName).join(', ') : 'SOHO / STEREO',
              speedKmS: c.cmeAnalyses?.[0]?.speed || null,
              halfAngleDeg: c.cmeAnalyses?.[0]?.halfAngle || null,
              isEarthMoonDirected: c.cmeAnalyses?.[0]?.isMostAccurate || false,
              category: DATA_CATEGORIES.REAL_NASA_DATA,
              scientificExplanation: 'Massive ejection of magnetized solar plasma and coronal material into interplanetary space.',
              lunarRelevance: 'CME plasma streams compress interplanetary magnetic fields; unprotected lunar surface habitats face direct plasma bombardment.'
            }));
          } else if (type === 'sep') {
            liveData.sep = data.slice(0, 8).map((s) => ({
              sepID: s.sepID,
              eventTime: s.eventTime,
              fluxThreshold: 'Solar energetic proton flux threshold exceeded',
              instruments: s.instruments ? s.instruments.map((i) => i.displayName).join(', ') : 'GOES / SEISS',
              linkedEvents: s.linkedEvents ? s.linkedEvents.map((e) => e.activityID) : [],
              category: DATA_CATEGORIES.REAL_NASA_DATA,
              scientificExplanation: 'Relativistic solar protons accelerated by flare and CME shockwaves.',
              lunarRelevance: 'Severe acute radiation danger to unshielded astronauts on EVA or in lunar rovers.'
            }));
          } else if (type === 'geomagneticStorms') {
            liveData.geomagneticStorms = data.slice(0, 8).map((g) => ({
              gstID: g.gstID,
              startTime: g.startTime,
              peakKpIndex: g.allKpIndex ? Math.max(...g.allKpIndex.map((k) => k.kpIndex || 0), 0) : null,
              stormLevel: 'Geomagnetic storm disturbance index (Earth)',
              observedBy: 'NOAA SWPC',
              category: DATA_CATEGORIES.REAL_NASA_DATA,
              scientificExplanation: 'Coupling of solar wind plasma with Earth’s magnetosphere.',
              lunarRelevance: 'Contrast reference: The Moon has no global magnetosphere to trap plasma, so solar wind impacts the lunar regolith directly.'
            }));
          }
        }
      }

      if (anySuccess) {
        dataSource = 'live_nasa_api';
      } else {
        const rejected = results.find((r) => r.status === 'rejected');
        if (rejected) {
          errorNotice = {
            message: rejected.reason.message,
            errorType: rejected.reason instanceof ApiError ? rejected.reason.errorType : 'FETCH_ERROR',
            status: rejected.reason.status ?? null
          };
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

  // Use curated data if live data is empty
  const hasLiveFlares = liveData.flares.length > 0;
  const hasLiveCme = liveData.cme.length > 0;
  const hasLiveSep = liveData.sep.length > 0;
  const hasLiveGst = liveData.geomagneticStorms.length > 0;

  const finalFlares = hasLiveFlares ? liveData.flares : [...CURATED_DONKI_SPACE_WEATHER.flares];
  const finalCme = hasLiveCme ? liveData.cme : [...CURATED_DONKI_SPACE_WEATHER.cme];
  const finalSep = hasLiveSep ? liveData.sep : [...CURATED_DONKI_SPACE_WEATHER.sep];
  const finalGst = hasLiveGst ? liveData.geomagneticStorms : [...CURATED_DONKI_SPACE_WEATHER.geomagneticStorms];

  const result = {
    flares: finalFlares,
    cme: finalCme,
    sep: finalSep,
    geomagneticStorms: finalGst,
    errorNotice,
    dataSource,
    apiKeyType: apiKey === 'DEMO_KEY' ? 'DEMO_KEY' : 'CUSTOM_KEY',
    provenance: createProvenanceRecord({
      datasetName: 'NASA Space Weather Database Of Notifications, Knowledge, Information (DONKI)',
      source: 'NASA Community Coordinated Modeling Center (CCMC) & Space Weather Prediction Center (NOAA)',
      sourceUrl: 'https://ccmc.gsfc.nasa.gov/tools/DONKI/',
      retrievalTimestamp: new Date().toISOString(),
      collectionPeriod: `${startDate} to ${endDate}`,
      spatialApplicability: 'Sun-Earth-Moon Heliospheric System (1 AU)',
      temporalApplicability: 'Real-time observation alerts and modeled heliospheric simulations',
      units: {
        flareClass: 'GOES X-ray peak flux (W/m²: X >= 1e-4, M >= 1e-5, C >= 1e-6)',
        cmeSpeed: 'km/s (Kilometers per second)',
        kpIndex: '0.0 to 9.0 planetary geomagnetic disturbance index',
        sepFlux: 'pfu (protons/(cm²·s·sr))'
      },
      description: 'Heliophysics records of solar flares, coronal mass ejections, solar energetic particle storms, and planetary geomagnetic disturbances.',
      limitations: 'Events describe space weather in the heliosphere and at 1 AU. They do NOT represent the radiation dose inside a shielded lunar habitat. Regolith shielding and habitat geometry dramatically alter indoor radiation levels.',
      category: DATA_CATEGORIES.REAL_NASA_DATA
    })
  };

  setCachedData(cacheKey, result, CACHE_TTL_MS);
  return result;
}
