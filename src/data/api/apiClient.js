/**
 * Unified Resilient API Client
 * Provides timeout control, detailed error classification (CORS, Rate Limit, Network, HTTP),
 * and supports custom fetch injection for headless unit testing.
 */

export const API_ERROR_TYPES = Object.freeze({
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  CORS_OR_BLOCKED: 'CORS_OR_BLOCKED',
  RATE_LIMITED: 'RATE_LIMITED',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  NOT_FOUND: 'NOT_FOUND',
  SERVER_ERROR: 'SERVER_ERROR',
  INVALID_RESPONSE: 'INVALID_RESPONSE'
});

export class ApiError extends Error {
  constructor(message, errorType, status = null, details = null) {
    super(message);
    this.name = 'ApiError';
    this.errorType = errorType;
    this.status = status;
    this.details = details;
  }
}

/**
 * Executes a resilient HTTP request.
 * @param {string} url Request URL
 * @param {Object} options Options including timeoutMs, headers, fetchFn
 * @returns {Promise<any>} Parsed JSON response
 */
export async function fetchJson(url, options = {}) {
  const {
    timeoutMs = 8000,
    headers = {},
    fetchFn = typeof fetch === 'function' ? fetch : null
  } = options;

  if (!fetchFn) {
    throw new ApiError('Fetch API is not available in the current runtime.', API_ERROR_TYPES.NETWORK_ERROR);
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const fetchOptions = {
      headers: {
        Accept: 'application/json',
        ...headers
      },
      signal: controller?.signal
    };

    const response = await fetchFn(url, fetchOptions);

    if (!response.ok) {
      if (response.status === 429) {
        throw new ApiError(
          'NASA API rate limit exceeded (HTTP 429). Please wait before retrying or provide a personal NASA API key.',
          API_ERROR_TYPES.RATE_LIMITED,
          429
        );
      }
      if (response.status === 403) {
        throw new ApiError(
          'NASA API access denied (HTTP 403). The API key may be invalid or quota exhausted.',
          API_ERROR_TYPES.AUTH_REQUIRED,
          403
        );
      }
      if (response.status === 404) {
        throw new ApiError(
          `Requested NASA resource not found (HTTP 404): ${url}`,
          API_ERROR_TYPES.NOT_FOUND,
          404
        );
      }
      if (response.status >= 500) {
        throw new ApiError(
          `NASA server returned an error (HTTP ${response.status}). The service may be undergoing maintenance.`,
          API_ERROR_TYPES.SERVER_ERROR,
          response.status
        );
      }
      throw new ApiError(
        `NASA API request failed with status ${response.status}: ${response.statusText}`,
        API_ERROR_TYPES.NETWORK_ERROR,
        response.status
      );
    }

    const text = await response.text();
    if (!text || !text.trim()) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch (parseError) {
      throw new ApiError(
        'Failed to parse NASA API response as JSON.',
        API_ERROR_TYPES.INVALID_RESPONSE,
        response.status,
        parseError.message
      );
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error.name === 'AbortError') {
      throw new ApiError(
        `Request to NASA API timed out after ${timeoutMs}ms. Check your connection or offline cache.`,
        API_ERROR_TYPES.TIMEOUT
      );
    }

    // In browsers, a TypeError during fetch usually means network offline or CORS failure
    const isCorsOrOffline = error.name === 'TypeError' || error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError');
    if (isCorsOrOffline) {
      throw new ApiError(
        'Unable to connect to NASA API. This may be caused by network unavailability or browser CORS security policies. The application will use verified offline records.',
        API_ERROR_TYPES.CORS_OR_BLOCKED,
        null,
        error.message
      );
    }

    throw new ApiError(
      `Unexpected network error: ${error.message}`,
      API_ERROR_TYPES.NETWORK_ERROR,
      null,
      error.message
    );
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
