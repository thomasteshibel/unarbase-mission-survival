import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DATA_CATEGORIES,
  CATEGORY_BADGES,
  createProvenanceRecord,
  validateProvenance
} from '../src/data/provenance.js';

test('provenance categories define strict 3-tier classification', () => {
  assert.equal(DATA_CATEGORIES.REAL_NASA_DATA, 'REAL_NASA_DATA');
  assert.equal(DATA_CATEGORIES.RESEARCH_EVIDENCE, 'RESEARCH_EVIDENCE');
  assert.equal(DATA_CATEGORIES.SIMULATED_DATA, 'SIMULATED_DATA');

  for (const cat of Object.values(DATA_CATEGORIES)) {
    assert.ok(CATEGORY_BADGES[cat]);
    assert.ok(CATEGORY_BADGES[cat].label);
    assert.ok(CATEGORY_BADGES[cat].tagClass);
    assert.ok(CATEGORY_BADGES[cat].description);
  }
});

test('createProvenanceRecord creates and validates a complete metadata record', () => {
  const record = createProvenanceRecord({
    datasetName: 'Test Lunar Dataset',
    source: 'NASA Planetary Data System',
    sourceUrl: 'https://pds.nasa.gov/test-dataset',
    collectionPeriod: '2024-01-01 to 2024-06-01',
    spatialApplicability: 'Lunar South Pole Shackleton Crater',
    units: { temperature: 'K', pressure: 'Pa' },
    description: 'Calibrated radiometric measurements.',
    limitations: 'Surface observation only; not in-habitat telemetry.',
    category: DATA_CATEGORIES.REAL_NASA_DATA
  });

  assert.equal(record.datasetName, 'Test Lunar Dataset');
  assert.equal(record.category, DATA_CATEGORIES.REAL_NASA_DATA);
  assert.equal(record.units.temperature, 'K');
  assert.ok(record.retrievalTimestamp);
});

test('validateProvenance rejects missing required fields', () => {
  assert.throws(
    () => validateProvenance({}),
    /Provenance record is missing required fields/
  );

  assert.throws(
    () =>
      validateProvenance({
        datasetName: 'Incomplete',
        source: 'NASA',
        sourceUrl: 'https://nasa.gov'
      }),
    /Provenance record is missing required fields/
  );
});

test('validateProvenance rejects non-HTTPS URLs and invalid categories', () => {
  const validBase = {
    datasetName: 'Dataset',
    source: 'NASA',
    sourceUrl: 'https://nasa.gov/data',
    retrievalTimestamp: '2026-11-14T00:00:00Z',
    collectionPeriod: '2024',
    spatialApplicability: 'Lunar Surface',
    temporalApplicability: '2024',
    units: { count: 'scalar' },
    description: 'Description',
    limitations: 'Limitations',
    category: DATA_CATEGORIES.REAL_NASA_DATA
  };

  assert.throws(
    () => validateProvenance({ ...validBase, sourceUrl: 'http://insecure.nasa.gov' }),
    /must use HTTPS/
  );

  assert.throws(
    () => validateProvenance({ ...validBase, category: 'UNVERIFIED_DATA' }),
    /Invalid data category/
  );
});
