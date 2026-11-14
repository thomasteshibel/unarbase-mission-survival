import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchJson, ApiError, API_ERROR_TYPES } from '../src/data/api/apiClient.js';

test('fetchJson successfully parses JSON response', async () => {
  const mockFetch = async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ message: 'success', value: 42 })
  });

  const res = await fetchJson('https://api.nasa.gov/test', { fetchFn: mockFetch });
  assert.equal(res.message, 'success');
  assert.equal(res.value, 42);
});

test('fetchJson classifies HTTP 429 rate limit correctly', async () => {
  const mockFetch = async () => ({
    ok: false,
    status: 429,
    statusText: 'Too Many Requests'
  });

  await assert.rejects(
    async () => fetchJson('https://api.nasa.gov/DONKI/FLR', { fetchFn: mockFetch }),
    (err) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.errorType, API_ERROR_TYPES.RATE_LIMITED);
      assert.equal(err.status, 429);
      assert.match(err.message, /rate limit/);
      return true;
    }
  );
});

test('fetchJson classifies HTTP 403 authorization failure correctly', async () => {
  const mockFetch = async () => ({
    ok: false,
    status: 403,
    statusText: 'Forbidden'
  });

  await assert.rejects(
    async () => fetchJson('https://api.nasa.gov/DONKI/FLR', { fetchFn: mockFetch }),
    (err) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.errorType, API_ERROR_TYPES.AUTH_REQUIRED);
      assert.equal(err.status, 403);
      return true;
    }
  );
});

test('fetchJson classifies HTTP 404 not found correctly', async () => {
  const mockFetch = async () => ({
    ok: false,
    status: 404,
    statusText: 'Not Found'
  });

  await assert.rejects(
    async () => fetchJson('https://api.nasa.gov/missing', { fetchFn: mockFetch }),
    (err) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.errorType, API_ERROR_TYPES.NOT_FOUND);
      assert.equal(err.status, 404);
      return true;
    }
  );
});

test('fetchJson classifies HTTP 500 server error correctly', async () => {
  const mockFetch = async () => ({
    ok: false,
    status: 503,
    statusText: 'Service Unavailable'
  });

  await assert.rejects(
    async () => fetchJson('https://api.nasa.gov/DONKI/FLR', { fetchFn: mockFetch }),
    (err) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.errorType, API_ERROR_TYPES.SERVER_ERROR);
      assert.equal(err.status, 503);
      return true;
    }
  );
});

test('fetchJson handles malformed JSON response', async () => {
  const mockFetch = async () => ({
    ok: true,
    status: 200,
    text: async () => '<html>Internal Server Error Page</html>'
  });

  await assert.rejects(
    async () => fetchJson('https://api.nasa.gov/test', { fetchFn: mockFetch }),
    (err) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.errorType, API_ERROR_TYPES.INVALID_RESPONSE);
      return true;
    }
  );
});

test('fetchJson classifies network/CORS failure correctly', async () => {
  const mockFetch = async () => {
    throw new TypeError('Failed to fetch');
  };

  await assert.rejects(
    async () => fetchJson('https://api.nasa.gov/test', { fetchFn: mockFetch }),
    (err) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.errorType, API_ERROR_TYPES.CORS_OR_BLOCKED);
      return true;
    }
  );
});
