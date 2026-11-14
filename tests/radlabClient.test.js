import assert from 'node:assert/strict';
import test from 'node:test';
import {
  RADLAB_BASE_URL,
  buildRadLabQueryUrl,
  parseRadLabRecord,
  getRadLabDosimetryData,
  getRadiationBenchmarks
} from '../src/data/api/radlabClient.js';
import { DATA_CATEGORIES } from '../src/data/provenance.js';

test('buildRadLabQueryUrl constructs official endpoint with format=json and query parameters', () => {
  const defaultUrl = buildRadLabQueryUrl();
  assert.ok(defaultUrl.startsWith(RADLAB_BASE_URL));
  assert.ok(defaultUrl.includes('format=json'));

  const filteredUrl = buildRadLabQueryUrl({
    spacecraft: 'ISS',
    instrument: 'DosTel',
    query: '(spacecraft=ISS)'
  });
  assert.ok(filteredUrl.includes('format=json'));
  assert.ok(filteredUrl.includes('spacecraft=ISS'));
  assert.ok(filteredUrl.includes('instrument=DosTel'));
  assert.ok(filteredUrl.includes('query=%28spacecraft%3DISS%29'));
});

test('parseRadLabRecord preserves native hourly units and calculates justified 24h quiet baselines', () => {
  const officialMock = {
    id: 'RADLAB-REC-001',
    spacecraft: 'ISS',
    instrument: 'DosTel',
    detector_location: 'Columbus Module',
    detector_type: 'Silicon Semiconductor',
    timestamp: '2024-05-10T12:00:00Z',
    absorbed_dose_rate: 9.5,
    dose_equivalent_rate: 19.2,
    quality_factor: 2.02,
    description: 'Measured during quiet orbital pass outside SAA'
  };

  const parsed = parseRadLabRecord(officialMock, 0);
  assert.ok(parsed);
  assert.equal(parsed.recordId, 'RADLAB-REC-001');
  assert.equal(parsed.instrument, 'DosTel');
  assert.equal(parsed.spacecraft, 'ISS');
  assert.equal(parsed.category, DATA_CATEGORIES.REAL_NASA_DATA);
  assert.equal(parsed.classificationLabel, 'Official NASA RadLab Telemetry Record');

  // Verify native hourly rate preservation
  assert.equal(parsed.measurements.absorbedDoseRateUGyHour, 9.5);
  assert.equal(parsed.measurements.doseEquivalentRateUSvHour, 19.2);
  assert.ok(parsed.units.absorbedDoseRateUGyHour.includes('μGy/hour'));
  assert.ok(parsed.units.doseEquivalentRateUSvHour.includes('μSv/hour'));

  // Verify justified 24h quiet reference extrapolation (rate * 24h)
  assert.equal(parsed.measurements.absorbedDoseRateUGyDay, 228.0);
  assert.equal(parsed.measurements.doseEquivalentRateUSvDay, 460.8);
  assert.ok(parsed.units.absorbedDoseRateUGyDay.includes('24h quiet reference'));
  assert.ok(parsed.integrationMethod.includes('nominal quiet period reference baselines'));
});

test('parseRadLabRecord handles missing fields and rejects invalid/malformed records safely', () => {
  // Safe handling of minimal fields
  const minimal = {
    absorbed_dose_rate: 10.0,
    dose_equivalent_rate: 20.0
  };
  const parsedMinimal = parseRadLabRecord(minimal, 5);
  assert.ok(parsedMinimal);
  assert.equal(parsedMinimal.recordId, 'RADLAB-LIVE-6');
  assert.equal(parsedMinimal.instrument, 'NASA Dosimeter');
  assert.equal(parsedMinimal.measurements.absorbedDoseRateUGyHour, 10.0);
  assert.equal(parsedMinimal.measurements.doseEquivalentRateUSvHour, 20.0);

  // Rejection of invalid / empty / non-numeric records
  assert.equal(parseRadLabRecord(null), null);
  assert.equal(parseRadLabRecord(undefined), null);
  assert.equal(parseRadLabRecord('invalid string'), null);
  assert.equal(parseRadLabRecord([]), null);
  assert.equal(parseRadLabRecord({}), null);
  assert.equal(parseRadLabRecord({ absorbed_dose_rate: -5.0, dose_equivalent_rate: -1.0 }), null);
  assert.equal(parseRadLabRecord({ absorbed_dose_rate: 'not_a_number' }), null);
});

test('getRadLabDosimetryData returns peer-reviewed curated benchmarks in offline mode', async () => {
  const result = await getRadLabDosimetryData({ offlineOnly: true, forceRefresh: true });

  assert.ok(result);
  assert.equal(result.dataSource, 'curated_nasa_archive');
  assert.ok(result.records.length >= 4);

  // Curated records must be classified as LITERATURE_BENCHMARK
  for (const rec of result.records) {
    assert.ok(rec.recordId);
    assert.ok(rec.instrument);
    assert.ok(rec.mission);
    assert.ok(rec.detectorLocation);
    assert.equal(rec.category, DATA_CATEGORIES.LITERATURE_BENCHMARK);
    assert.ok(rec.measurements.absorbedDoseRateUGyHour > 0);
    assert.ok(rec.measurements.doseEquivalentRateUSvHour > 0);
    assert.ok(rec.measurements.absorbedDoseRateUGyDay > 0);
    assert.ok(rec.measurements.doseEquivalentRateUSvDay > 0);
    assert.ok(rec.units.absorbedDoseRateUGyHour.includes('μGy/hour'));
    assert.ok(rec.units.doseEquivalentRateUSvHour.includes('μSv/hour'));
    assert.ok(rec.scientificSignificance);
    assert.ok(rec.limitations);
  }

  assert.equal(result.provenance.category, DATA_CATEGORIES.LITERATURE_BENCHMARK);
  assert.ok(result.provenance.sourceUrl.startsWith('https://visualization.osdr.nasa.gov/radlab/api/'));
});

test('getRadLabDosimetryData handles mock live official RadLab API response', async () => {
  const mockFetch = async () => ({
    ok: true,
    status: 200,
    text: async () =>
      JSON.stringify([
        {
          id: 'RADLAB-LIVE-001',
          instrument: 'DosTel-1',
          spacecraft: 'ISS',
          detector_location: 'Columbus Starboard',
          detector_type: 'Silicon Pixel Detector',
          timestamp: '2024-05-14T08:00:00Z',
          absorbed_dose_rate: 11.2,
          dose_equivalent_rate: 22.8,
          description: 'Measured during May 2024 space weather storm'
        }
      ])
  });

  const result = await getRadLabDosimetryData({
    fetchFn: mockFetch,
    forceRefresh: true
  });

  assert.equal(result.dataSource, 'live_nasa_api');
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].recordId, 'RADLAB-LIVE-001');
  assert.equal(result.records[0].category, DATA_CATEGORIES.REAL_NASA_DATA);
  assert.equal(result.records[0].measurements.absorbedDoseRateUGyHour, 11.2);
  assert.equal(result.records[0].measurements.doseEquivalentRateUSvHour, 22.8);
  assert.equal(result.records[0].measurements.absorbedDoseRateUGyDay, 268.8);
  assert.equal(result.records[0].measurements.doseEquivalentRateUSvDay, 547.2);
  assert.equal(result.provenance.category, DATA_CATEGORIES.REAL_NASA_DATA);
});

test('getRadLabDosimetryData falls back cleanly on network or timeout errors', async () => {
  const failingFetch = async () => {
    throw new Error('NASA RadLab endpoint connection timed out');
  };

  const result = await getRadLabDosimetryData({
    fetchFn: failingFetch,
    forceRefresh: true
  });

  assert.equal(result.dataSource, 'curated_nasa_archive');
  assert.ok(result.records.length >= 4);
  assert.ok(result.errorNotice);
  assert.ok(result.errorNotice.message.includes('timed out'));
  assert.equal(result.provenance.category, DATA_CATEGORIES.LITERATURE_BENCHMARK);
});

test('getRadiationBenchmarks returns comparative environmental scale with verified gradient', () => {
  const benchmarks = getRadiationBenchmarks();
  assert.ok(benchmarks.length >= 6);

  const earth = benchmarks.find((b) => b.location.includes('Earth Sea Level'));
  const iss = benchmarks.find((b) => b.location.includes('ISS Shielded Interior'));
  const lunar = benchmarks.find((b) => b.location.includes('Lunar Surface'));
  const deepSpace = benchmarks.find((b) => b.location.includes('Deep Space'));

  assert.ok(earth);
  assert.ok(iss);
  assert.ok(lunar);
  assert.ok(deepSpace);

  // Gradient: Earth < ISS < Lunar Surface < Deep Space
  assert.ok(earth.doseEquivalentRateUSvHour < iss.doseEquivalentRateUSvHour);
  assert.ok(iss.doseEquivalentRateUSvHour < lunar.doseEquivalentRateUSvHour);
  assert.ok(lunar.doseEquivalentRateUSvHour < deepSpace.doseEquivalentRateUSvHour);

  assert.ok(earth.doseEquivalentRateUSvDay < iss.doseEquivalentRateUSvDay);
  assert.ok(iss.doseEquivalentRateUSvDay < lunar.doseEquivalentRateUSvDay);
  assert.ok(lunar.doseEquivalentRateUSvDay < deepSpace.doseEquivalentRateUSvDay);
});

test('Chang e 4 LND record adheres to Zhang et al. 2020 citation, DOI 10.1126/sciadv.aaz1334, and units', async () => {
  const result = await getRadLabDosimetryData({ offlineOnly: true });
  const lnd = result.records.find((r) => r.recordId === 'RADLAB-LUNAR-SURFACE-LND');

  assert.ok(lnd, 'Chang e 4 LND record must exist in curated archive');
  assert.ok(lnd.source.includes('Zhang et al.'));
  assert.ok(lnd.sourceUrl.includes('10.1126/sciadv.aaz1334'));
  assert.equal(lnd.measurements.absorbedDoseRateUGyHour, 13.2);
  assert.equal(lnd.measurements.doseEquivalentRateUSvHour, 57.1);
  assert.equal(lnd.measurements.absorbedDoseRateUGyDay, 316.8);
  assert.equal(lnd.measurements.doseEquivalentRateUSvDay, 1370.4);
  assert.equal(lnd.category, DATA_CATEGORIES.LITERATURE_BENCHMARK);
  assert.ok(lnd.limitations.includes('NOT a NASA instrument in RadLab'));
  assert.ok(lnd.limitations.includes('unshielded lunar surface does NOT have a 0.3–0.5 mSv/day dose equivalent'));
  assert.ok(lnd.units.absorbedDoseRateUGyHour.includes('total absorbed dose rate in silicon'));
  assert.ok(lnd.units.doseEquivalentRateUSvHour.includes('GCR charged-particle dose-equivalent rate converted to water'));
  assert.ok(lnd.units.doseEquivalentRateUSvDay.includes('24h arithmetic extrapolation'));
  assert.ok(lnd.limitations.includes('continuous-exposure arithmetic extrapolation'));
});
