/**
 * GeocodingService — Business logic layer for geocoding city names.
 *
 * Responsibilities:
 *  - Call GeocodingClient with the given city name.
 *  - Validate the HTTP response status.
 *  - Parse and validate the JSON body.
 *  - Map the first result to a Coordinates object without any value transformation.
 *  - Return typed discriminated-union results (GeocodingResult).
 *
 * Requirements: 2.2, 2.3, 2.4, 2.6, 5.1, 5.4, 5.5
 */

import { GeocodingClient } from '../clients/GeocodingClient.js';
import type {
  Coordinates,
  GeocodingResult,
} from '../types/index.js';

// ---------------------------------------------------------------------------
// Raw API response shape (internal, not exported)
// ---------------------------------------------------------------------------

interface GeocodingApiResult {
  id?: number;
  name?: string;
  latitude?: number | null;
  longitude?: number | null;
  [key: string]: unknown;
}

interface GeocodingApiResponse {
  results?: GeocodingApiResult[];
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Dependency injection interface
// ---------------------------------------------------------------------------

export interface GeocodingServiceDeps {
  client?: GeocodingClient;
}

// ---------------------------------------------------------------------------
// GeocodingService
// ---------------------------------------------------------------------------

export class GeocodingService {
  private readonly client: GeocodingClient;

  constructor(deps: GeocodingServiceDeps = {}) {
    this.client = deps.client ?? new GeocodingClient();
  }

  /**
   * Geocode a city name to geographic coordinates.
   *
   * @param cityName The (already-trimmed) city name to look up.
   * @returns A GeocodingResult — success with Coordinates, or failure with a
   *          typed GeocodingError.
   */
  async geocode(cityName: string): Promise<GeocodingResult> {
    let response: Response;

    // -----------------------------------------------------------------------
    // 1. Network / timeout errors
    // -----------------------------------------------------------------------
    try {
      response = await this.client.fetchGeocoding(cityName);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'TimeoutError') {
        return { success: false, error: { type: 'TIMEOUT' } };
      }
      return { success: false, error: { type: 'NETWORK_ERROR' } };
    }

    // -----------------------------------------------------------------------
    // 2. HTTP non-2xx  →  SERVICE_ERROR  (Requirement 5.4)
    // -----------------------------------------------------------------------
    if (!response.ok) {
      return {
        success: false,
        error: { type: 'SERVICE_ERROR', statusCode: response.status },
      };
    }

    // -----------------------------------------------------------------------
    // 3. JSON parsing  →  INVALID_RESPONSE on failure  (Requirement 5.5)
    // -----------------------------------------------------------------------
    let body: GeocodingApiResponse;
    try {
      body = (await response.json()) as GeocodingApiResponse;
    } catch {
      return { success: false, error: { type: 'INVALID_RESPONSE' } };
    }

    // -----------------------------------------------------------------------
    // 4. Validate results array  (Requirements 2.3, 2.6)
    // -----------------------------------------------------------------------
    const results = body.results;

    if (!Array.isArray(results) || results.length === 0) {
      return { success: false, error: { type: 'CITY_NOT_FOUND' } };
    }

    const first = results[0];

    // Requirement 2.6: latitude or longitude absent / null → CITY_NOT_FOUND
    if (
      first.latitude == null ||
      first.longitude == null ||
      typeof first.latitude !== 'number' ||
      typeof first.longitude !== 'number'
    ) {
      return { success: false, error: { type: 'CITY_NOT_FOUND' } };
    }

    // -----------------------------------------------------------------------
    // 5. Map to Coordinates — no value transformation  (Requirements 2.2, 5.1)
    // -----------------------------------------------------------------------
    const coordinates: Coordinates = {
      latitude: first.latitude,
      longitude: first.longitude,
      cityName: typeof first.name === 'string' ? first.name : '',
    };

    return { success: true, data: coordinates };
  }
}
