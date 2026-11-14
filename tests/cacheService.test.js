import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getCachedData,
  setCachedData,
  removeCachedData,
  clearAllNasaCache
} from '../src/data/cacheService.js';

test('cacheService stores, retrieves, and clears cached data', () => {
  clearAllNasaCache();

  setCachedData('test_key', { foo: 'bar' }, 5000);
  const hit = getCachedData('test_key');
  assert.ok(hit);
  assert.equal(hit.data.foo, 'bar');
  assert.equal(hit.isStale, false);

  removeCachedData('test_key');
  assert.equal(getCachedData('test_key'), null);
});

test('cacheService respects TTL expiration', () => {
  setCachedData('expiring_key', { test: true }, -100); // Expired immediately

  const nullResult = getCachedData('expiring_key', false);
  assert.equal(nullResult, null);

  const staleResult = getCachedData('expiring_key', true);
  assert.ok(staleResult);
  assert.equal(staleResult.isStale, true);
  assert.equal(staleResult.data.test, true);
});
