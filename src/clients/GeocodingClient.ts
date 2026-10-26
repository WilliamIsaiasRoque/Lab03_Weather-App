/**
 * GeocodingClient — HTTP client for the Open-Meteo Geocoding API.
 *
 * Responsibilities:
 *  - Build the request URL with the city name (URL-encoded) and `count=1`.
 *  - Enforce a 10-second timeout via AbortController + setTimeout.
 *  - Return the raw `Response` on success, or throw on network / timeout
 *    errors (higher layers map those to typed GeocodingError values).
 *
 * Requirements: 2.1, 2.4
 */

const GEOCODING_BASE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const TIMEOUT_MS = 10_000;

export interface GeocodingClientDeps {
  /** Injected fetch implementation — defaults to globalThis.fetch. */
  fetchFn?: typeof fetch;
}

export class GeocodingClient {
  private readonly fetchFn: typeof fetch;

  constructor(deps: GeocodingClientDeps = {}) {
    this.fetchFn = deps.fetchFn ?? globalThis.fetch.bind(globalThis);
  }

  /**
   * Build the Geocoding API URL for the given city name.
   *
   * The resulting URL always includes:
   *   - `name`  (URL-encoded via URLSearchParams)
   *   - `count` fixed to `1` (we only need the top result)
   */
  buildUrl(cityName: string): string {
    const params = new URLSearchParams({
      name: cityName,
      count: '1',
    });
    return `${GEOCODING_BASE_URL}?${params.toString()}`;
  }

  /**
   * Fetch geocoding results for the given city name.
   *
   * @param cityName The city name to search for (URL-encoding is handled internally).
   * @returns The raw `Response` object from the Geocoding API.
   * @throws  An `Error` whose `name` is `'TimeoutError'` when the request
   *          exceeds 10 seconds, or a network-level `Error` on fetch failure.
   */
  async fetchGeocoding(cityName: string): Promise<Response> {
    const url = this.buildUrl(cityName);
    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, TIMEOUT_MS);

    try {
      const response = await this.fetchFn(url, {
        signal: controller.signal,
      });
      return response;
    } catch (err: unknown) {
      // AbortController fires a DOMException with name 'AbortError';
      // re-throw as a named TimeoutError so callers can distinguish it.
      if (err instanceof Error && err.name === 'AbortError') {
        const timeoutError = new Error(
          `Geocoding API request timed out after ${TIMEOUT_MS}ms`
        );
        timeoutError.name = 'TimeoutError';
        throw timeoutError;
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
