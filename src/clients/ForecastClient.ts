/**
 * ForecastClient — HTTP client for the Open-Meteo Forecast API.
 *
 * Responsibilities:
 *  - Build the request URL with latitude, longitude and the required
 *    `current` variables.
 *  - Enforce a 10-second timeout via AbortController + setTimeout.
 *  - Return the raw `Response` on success, or throw on network / timeout
 *    errors (higher layers map those to typed ForecastError values).
 *
 * Requirements: 3.1, 3.3
 */

const FORECAST_BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const TIMEOUT_MS = 10_000;

/**
 * Variables requested from the `current` block of the Forecast API.
 * Using the modern parameter names (relative_humidity_2m with underscore).
 */
const CURRENT_VARIABLES = 'temperature_2m,relative_humidity_2m,precipitation';

export interface ForecastClientDeps {
  /** Injected fetch implementation — defaults to globalThis.fetch. */
  fetchFn?: typeof fetch;
}

export class ForecastClient {
  private readonly fetchFn: typeof fetch;

  constructor(deps: ForecastClientDeps = {}) {
    this.fetchFn = deps.fetchFn ?? globalThis.fetch.bind(globalThis);
  }

  /**
   * Build the Forecast API URL for the given coordinates.
   *
   * The resulting URL always includes:
   *   - `latitude`  (passed through as-is)
   *   - `longitude` (passed through as-is)
   *   - `current`   with temperature_2m, relative_humidity_2m, precipitation
   */
  buildUrl(latitude: number, longitude: number): string {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current: CURRENT_VARIABLES,
    });
    return `${FORECAST_BASE_URL}?${params.toString()}`;
  }

  /**
   * Fetch the current weather forecast for the given coordinates.
   *
   * @param latitude  Geographic latitude in [-90, 90].
   * @param longitude Geographic longitude in [-180, 180].
   * @returns The raw `Response` object from the Forecast API.
   * @throws  An `Error` whose `name` is `'TimeoutError'` when the request
   *          exceeds 10 seconds, or a network-level `Error` on fetch failure.
   */
  async fetchForecast(latitude: number, longitude: number): Promise<Response> {
    const url = this.buildUrl(latitude, longitude);
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
          `Forecast API request timed out after ${TIMEOUT_MS}ms`
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
