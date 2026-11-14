/**
 * NASA OSDR (Open Science Data Repository) API Client
 * Retrieves spaceflight biology studies and metadata, with caching,
 * error handling, and curated fallback studies.
 */

import { fetchJson, ApiError } from './apiClient.js';
import { getCachedData, setCachedData } from '../cacheService.js';
import { DATA_CATEGORIES, createProvenanceRecord } from '../provenance.js';
import { CURATED_OSDR_STUDIES } from '../curated/osdrStudies.js';

const OSDR_BASE_URL = 'https://osdr.nasa.gov/osdr/data/search';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Searches NASA OSDR for space biology studies.
 * @param {string} query Search term (e.g. 'bone', 'muscle', 'radiation', 'sleep', 'immune')
 * @param {Object} options Optional fetch overrides
 * @returns {Promise<Object>} Search result with studies, source info, and provenance
 */
export async function searchOSDRStudies(query = '', options = {}) {
  const normalizedQuery = (query || '').trim().toLowerCase();
  const cacheKey = `osdr_search_v2_${normalizedQuery || 'all'}`;

  // Check cache first
  const cached = getCachedData(cacheKey);
  if (cached && !options.forceRefresh) {
    return {
      ...cached.data,
      isCached: true,
      cachedAt: cached.cachedAt
    };
  }

  let liveStudies = [];
  let errorNotice = null;
  let dataSource = 'live';

  // Attempt live API query if query is provided
  if (normalizedQuery && !options.offlineOnly) {
    try {
      const searchUrl = `${OSDR_BASE_URL}?term=${encodeURIComponent(normalizedQuery)}&size=10`;
      const json = await fetchJson(searchUrl, {
        timeoutMs: options.timeoutMs ?? 7000,
        fetchFn: options.fetchFn
      });

      if (json && json.hits && Array.isArray(json.hits.hits)) {
        liveStudies = json.hits.hits.map((hit) => {
          const source = hit._source || {};
          const accession = source.Accession || source.identifier || hit._id || 'OSD-UNKNOWN';
          const title = source.Study_Title || source.title || 'Untitled Space Biology Study';
          const organism = source.organism || (Array.isArray(source.Organisms) ? source.Organisms.join(', ') : 'Unspecified organism');
          const description = source.Study_Description || source.description || 'No description provided in NASA OSDR record.';

          return {
            accession,
            title,
            organism,
            category: DATA_CATEGORIES.RESEARCH_EVIDENCE,
            domain: source.Study_Factor_Type || 'Space Biology & Human Health',
            mission: source.Mission || 'NASA Flight/Ground Investigation',
            collectionPeriod: source.releaseDate || 'Archived Study',
            spatialApplicability: 'NASA Spaceflight or Ground Simulation',
            sourceUrl: `https://osdr.nasa.gov/bio/repo/data/studies/${accession}`,
            publication: source.Journal_Article || 'NASA Open Science Data Repository',
            keyFindings: description.slice(0, 320) + (description.length > 320 ? '...' : ''),
            astronautRelevance: 'This study provides empirical baseline data on biological responses to spaceflight stressors. Consult the full publication for peer-reviewed medical and operational countermeasure guidance.',
            limitations: 'Laboratory and flight experimental metadata. Research findings must not be directly treated as individual crew medical diagnoses.',
            keywords: [normalizedQuery]
          };
        });
      }
    } catch (err) {
      errorNotice = {
        message: err.message,
        errorType: err instanceof ApiError ? err.errorType : 'FETCH_ERROR',
        status: err.status ?? null
      };
      dataSource = 'curated_fallback';
    }
  }

  // Filter curated studies based on query
  const matchingCurated = CURATED_OSDR_STUDIES.filter((study) => {
    if (!normalizedQuery) return true;
    return (
      study.accession.toLowerCase().includes(normalizedQuery) ||
      study.title.toLowerCase().includes(normalizedQuery) ||
      study.domain.toLowerCase().includes(normalizedQuery) ||
      study.organism.toLowerCase().includes(normalizedQuery) ||
      study.keywords.some((k) => k.toLowerCase().includes(normalizedQuery))
    );
  });

  // Combine results: curated studies are given precedence for scientific rigor, plus any live hits
  const combined = [...matchingCurated];
  for (const live of liveStudies) {
    if (!combined.some((s) => s.accession === live.accession)) {
      combined.push(live);
    }
  }

  const result = {
    query: normalizedQuery,
    totalHits: combined.length,
    studies: combined,
    errorNotice,
    dataSource: liveStudies.length > 0 ? 'live_nasa_api' : 'curated_nasa_archive',
    provenance: createProvenanceRecord({
      datasetName: 'NASA Open Science Data Repository (OSDR) Space Biology Research',
      source: 'NASA Biological and Physical Sciences (BPS) Division',
      sourceUrl: 'https://osdr.nasa.gov/bio/repo/',
      retrievalTimestamp: new Date().toISOString(),
      collectionPeriod: '2012 to 2024 archived flight and ground experiments',
      spatialApplicability: 'Low Earth Orbit (ISS) and ground analog laboratories',
      temporalApplicability: 'Archived peer-reviewed flight investigations',
      units: { accession: 'string identifier', hits: 'count' },
      description: 'Peer-reviewed space biology datasets investigating musculoskeletal, immune, circadian, and genomic adaptations to microgravity and space radiation.',
      limitations: 'Research findings describe model organisms or specific flight cohorts; they do not represent real-time physiological measurements of the fictional LunarBase crew.',
      category: DATA_CATEGORIES.RESEARCH_EVIDENCE
    })
  };

  // Cache result
  setCachedData(cacheKey, result, CACHE_TTL_MS);

  return result;
}

/**
 * Retrieves a single OSDR study by accession identifier.
 * @param {string} accession e.g. 'OSD-379'
 * @returns {Object|null}
 */
export function getCuratedStudyByAccession(accession) {
  if (!accession) return null;
  const match = CURATED_OSDR_STUDIES.find(
    (s) => s.accession.toLowerCase() === accession.trim().toLowerCase()
  );
  return match ? { ...match } : null;
}
