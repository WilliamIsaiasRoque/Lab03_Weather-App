/**
 * ForecastService — Application-layer service for fetching weather forecasts.
 *
 * Responsibilities:
 *  - Call ForecastClient with the supplied coordinates.
 *  - Verify the HTTP response status (non-2xx → SERVICE_ERROR).
 *  - Parse the response JSON (parse failure → INVALID_RESPONSE).
 *  - Validate that all required meteorological fields are present and numeric;
 *    any missing or null field → INCOMPLETE_DATA.
 *  - Map the raw API response to a WeatherData value object without any
 *    numeric transformation (formatting belongs to the presentation layer).
 *  - Translate network errors and timeout errors into typed ForecastError
 *    values so that callers never need to catch raw exceptions.
 *
 * Requirements: 3.2, 3.3, 3.4, 3.5, 5.2, 5.4, 5.5
 */

import { ForecastClient } from '../clients/ForecastClient';
import type { ForecastResult, WeatherData } from '../types/index';

/** Shape of the `current` block returned by the Open-Meteo Forecast API. */
interface ForecastApiCurrent {
  temperature_2m?: number | null;
  relative_humidity_2m?: number | null;
  precipitation?: number | null;
  [key: string]: unknown;
}

/** Top-level shape of the Forecast API JSON response. */
interface ForecastApiResponse {
  current?: ForecastApiCurrent | null;
  [key: string]: unknown;
}

export interface ForecastServiceDeps {
  /** Injected ForecastClient — defaults to a new instance. */
  client?: ForecastClient;
}

export class ForecastService {
  private readonly client: ForecastClient;

  constructor(deps: ForecastServiceDeps = {}) {
    this.client = deps.client ?? new ForecastClient();
  }

  /**
   * Fetch and parse the current weather forecast for the given coordinates.
   *
   * @param lat Geographic latitude in [-90, 90].
   * @param lon Geographic longitude in [-180, 180].
   * @returns A typed ForecastResult — never throws.
   */
  async getForecast(lat: number, lon: number): Promise<ForecastResult> {
    let response: Response;

    // ── Network / timeout errors ──────────────────────────────────────────
    try {
      response = await this.client.fetchForecast(lat, lon);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'TimeoutError') {
        return { success: false, error: { type: 'TIMEOUT' } };
      }
      return { success: false, error: { type: 'NETWORK_ERROR' } };
    }

    // ── HTTP non-2xx ──────────────────────────────────────────────────────
    if (!response.ok) {
      return {
        success: false,
        error: { type: 'SERVICE_ERROR', statusCode: response.status },
      };
    }

    // ── JSON parsing ──────────────────────────────────────────────────────
    let parsed: ForecastApiResponse;
    try {
      parsed = (await response.json()) as ForecastApiResponse;
    } catch {
      return { success: false, error: { type: 'INVALID_RESPONSE' } };
    }

    // ── Structural validation ─────────────────────────────────────────────
    const current = parsed?.current;

    if (current == null || typeof current !== 'object') {
      return { success: false, error: { type: 'INVALID_RESPONSE' } };
    }

    const { temperature_2m, relative_humidity_2m, precipitation } = current;

    // All three fields must be present and numeric (not null / undefined).
    if (
      typeof temperature_2m !== 'number' ||
      typeof relative_humidity_2m !== 'number' ||
      typeof precipitation !== 'number'
    ) {
      // Distinguish between a structurally invalid payload and a valid
      // payload with missing meteorological data.
      // If the `current` block is present but fields are simply absent or
      // null, that is an INCOMPLETE_DATA condition (Requirement 3.5).
      // We only fall through to INVALID_RESPONSE when `current` itself is
      // not an object — handled above.
      return { success: false, error: { type: 'INCOMPLETE_DATA' } };
    }

    // ── Happy path — map to WeatherData without transformation ────────────
    const weatherData: WeatherData = {
      temperature: temperature_2m,
      humidity: relative_humidity_2m,
      precipitation: precipitation,
    };

    return { success: true, data: weatherData };
  }
}
