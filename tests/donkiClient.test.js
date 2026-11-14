import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getSpaceWeatherData,
  getNasaApiKey,
  setNasaApiKey
} from '../src/data/api/donkiClient.js';
import { DATA_CATEGORIES } from '../src/data/provenance.js';

test('getSpaceWeatherData returns authentic curated records when offline', async () => {
  const result = await getSpaceWeatherData({ offlineOnly: true });

  assert.ok(result);
  assert.equal(result.dataSource, 'curated_nasa_archive');
  assert.ok(result.flares.length > 0);
  assert.ok(result.cme.length > 0);
  assert.ok(result.sep.length > 0);
  assert.ok(result.geomagneticStorms.length > 0);

  // Validate solar flare data properties
  const x87Flare = result.flares.find((f) => f.classType === 'X8.7');
  assert.ok(x87Flare);
  assert.equal(x87Flare.category, DATA_CATEGORIES.REAL_NASA_DATA);
  assert.ok(x87Flare.instruments);
  assert.ok(x87Flare.scientificExplanation);
  assert.ok(x87Flare.lunarRelevance);

  // Validate provenance
  assert.equal(result.provenance.category, DATA_CATEGORIES.REAL_NASA_DATA);
  assert.match(result.provenance.sourceUrl, /^https:\/\//);
  assert.match(result.provenance.limitations, /do NOT represent the radiation dose inside a shielded lunar habitat/i);
});

test('getNasaApiKey defaults to DEMO_KEY and stores custom key', () => {
  assert.equal(getNasaApiKey(), 'DEMO_KEY');

  setNasaApiKey('TEST_KEY_12345');
  assert.equal(getNasaApiKey(), 'TEST_KEY_12345');

  // Reset to default
  setNasaApiKey('');
  assert.equal(getNasaApiKey(), 'DEMO_KEY');
});

test('getSpaceWeatherData handles mock live API response', async () => {
  const mockFetch = async (url) => {
    if (url.includes('FLR')) {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify([
            {
              flrID: '2024-05-14T17:10:00-FLR-001',
              beginTime: '2024-05-14T16:51:00Z',
              peakTime: '2024-05-14T17:10:00Z',
              endTime: '2024-05-14T17:28:00Z',
              classType: 'X8.7',
              sourceLocation: 'S18W89',
              activeRegionNum: 13664,
              link: 'https://ccmc.gsfc.nasa.gov/tools/DONKI/'
            }
          ])
      };
    }
    return {
      ok: true,
      status: 200,
      text: async () => '[]'
    };
  };

  const result = await getSpaceWeatherData({
    fetchFn: mockFetch,
    forceRefresh: true,
    eventType: 'FLR'
  });

  assert.equal(result.dataSource, 'live_nasa_api');
  assert.equal(result.flares.length, 1);
  assert.equal(result.flares[0].classType, 'X8.7');
  assert.equal(result.flares[0].category, DATA_CATEGORIES.REAL_NASA_DATA);
});

test('getSpaceWeatherData falls back to curated archive on API error', async () => {
  const failingFetch = async () => ({
    ok: false,
    status: 429,
    statusText: 'Rate Limit'
  });

  const result = await getSpaceWeatherData({
    fetchFn: failingFetch,
    forceRefresh: true,
    eventType: 'FLR'
  });

  assert.equal(result.dataSource, 'curated_nasa_archive');
  assert.ok(result.errorNotice);
  assert.equal(result.errorNotice.errorType, 'RATE_LIMITED');
  assert.ok(result.flares.length > 0);
});
