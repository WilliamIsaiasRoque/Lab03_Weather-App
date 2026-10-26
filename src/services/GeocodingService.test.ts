/**
 * Tests for GeocodingService
 *
 * Unit tests cover Requirements: 2.2, 2.3, 2.4
 * Property-based tests cover Requirements: 2.2, 5.1 (Property 4)
 */

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { GeocodingService } from './GeocodingService.js';
import type { GeocodingClient } from '../clients/GeocodingClient.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a minimal mock of GeocodingClient.
 * Only `fetchGeocoding` is relevant for GeocodingService.
 */
function makeClient(
  impl: () => Promise<Response>
): GeocodingClient {
  return {
    fetchGeocoding: vi.fn(impl),
    buildUrl: vi.fn(),
  } as unknown as GeocodingClient;
}

/**
 * Build a synthetic Response with the given status and JSON body.
 */
function makeResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ---------------------------------------------------------------------------
// Unit Tests — GeocodingService
// ---------------------------------------------------------------------------

describe('GeocodingService – unit tests', () => {

  // -------------------------------------------------------------------------
  // Requirement 2.3 — zero results → CITY_NOT_FOUND
  // -------------------------------------------------------------------------

  describe('zero results → CITY_NOT_FOUND', () => {
    it('returns CITY_NOT_FOUND when results array is empty', async () => {
      const client = makeClient(async () =>
        makeResponse(200, { results: [] })
      );
      const service = new GeocodingService({ client });

      const result = await service.geocode('UnknownCity');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('CITY_NOT_FOUND');
      }
    });

    it('returns CITY_NOT_FOUND when results field is absent from response', async () => {
      const client = makeClient(async () =>
        makeResponse(200, {})
      );
      const service = new GeocodingService({ client });

      const result = await service.geocode('UnknownCity');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('CITY_NOT_FOUND');
      }
    });

    it('returns CITY_NOT_FOUND when results is null', async () => {
      const client = makeClient(async () =>
        makeResponse(200, { results: null })
      );
      const service = new GeocodingService({ client });

      const result = await service.geocode('SomeCity');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('CITY_NOT_FOUND');
      }
    });
  });

  // -------------------------------------------------------------------------
  // Requirement 2.4 — network error → NETWORK_ERROR
  // -------------------------------------------------------------------------

  describe('network error → NETWORK_ERROR', () => {
    it('returns NETWORK_ERROR when fetch throws a generic network error', async () => {
      const client = makeClient(async () => {
        throw new Error('Failed to fetch');
      });
      const service = new GeocodingService({ client });

      const result = await service.geocode('Berlin');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('NETWORK_ERROR');
      }
    });

    it('returns NETWORK_ERROR when fetch throws a TypeError (offline)', async () => {
      const client = makeClient(async () => {
        throw new TypeError('NetworkError when attempting to fetch resource.');
      });
      const service = new GeocodingService({ client });

      const result = await service.geocode('Paris');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('NETWORK_ERROR');
      }
    });
  });

  // -------------------------------------------------------------------------
  // Requirement 2.4 — timeout (10 s) → TIMEOUT
  // -------------------------------------------------------------------------

  describe('timeout → TIMEOUT', () => {
    it('returns TIMEOUT when the client throws a TimeoutError', async () => {
      const client = makeClient(async () => {
        const err = new Error('Geocoding API request timed out after 10000ms');
        err.name = 'TimeoutError';
        throw err;
      });
      const service = new GeocodingService({ client });

      const result = await service.geocode('Tokyo');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('TIMEOUT');
      }
    });
  });

  // -------------------------------------------------------------------------
  // Requirement 2.2 — valid result → success with correct Coordinates
  // -------------------------------------------------------------------------

  describe('valid result → success with Coordinates', () => {
    it('returns success with the latitude and longitude from the first result', async () => {
      const client = makeClient(async () =>
        makeResponse(200, {
          results: [
            {
              id: 2950159,
              name: 'Berlin',
              latitude: 52.52437,
              longitude: 13.41053,
              country: 'Deutschland',
            },
          ],
        })
      );
      const service = new GeocodingService({ client });

      const result = await service.geocode('Berlin');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.latitude).toBe(52.52437);
        expect(result.data.longitude).toBe(13.41053);
        expect(result.data.cityName).toBe('Berlin');
      }
    });

    it('uses only the first result when multiple results are returned', async () => {
      const client = makeClient(async () =>
        makeResponse(200, {
          results: [
            { id: 1, name: 'Paris', latitude: 48.8566, longitude: 2.3522 },
            { id: 2, name: 'Paris (TX)', latitude: 33.6609, longitude: -95.5555 },
          ],
        })
      );
      const service = new GeocodingService({ client });

      const result = await service.geocode('Paris');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.latitude).toBe(48.8566);
        expect(result.data.longitude).toBe(2.3522);
        expect(result.data.cityName).toBe('Paris');
      }
    });

    it('stores raw coordinate values without any transformation (Requirement 5.1)', async () => {
      const rawLat = 35.6762;
      const rawLon = 139.6503;
      const client = makeClient(async () =>
        makeResponse(200, {
          results: [
            { id: 99, name: 'Tokyo', latitude: rawLat, longitude: rawLon },
          ],
        })
      );
      const service = new GeocodingService({ client });

      const result = await service.geocode('Tokyo');

      expect(result.success).toBe(true);
      if (result.success) {
        // Values must be bit-for-bit identical — no rounding or transformation
        expect(result.data.latitude).toBe(rawLat);
        expect(result.data.longitude).toBe(rawLon);
      }
    });
  });

  // -------------------------------------------------------------------------
  // Requirement 2.6 — missing latitude or longitude → CITY_NOT_FOUND
  // -------------------------------------------------------------------------

  describe('missing lat/lon in result → CITY_NOT_FOUND', () => {
    it('returns CITY_NOT_FOUND when latitude is null', async () => {
      const client = makeClient(async () =>
        makeResponse(200, {
          results: [{ id: 1, name: 'Ghost', latitude: null, longitude: 10 }],
        })
      );
      const service = new GeocodingService({ client });

      const result = await service.geocode('Ghost');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('CITY_NOT_FOUND');
      }
    });

    it('returns CITY_NOT_FOUND when longitude is null', async () => {
      const client = makeClient(async () =>
        makeResponse(200, {
          results: [{ id: 1, name: 'Ghost', latitude: 10, longitude: null }],
        })
      );
      const service = new GeocodingService({ client });

      const result = await service.geocode('Ghost');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('CITY_NOT_FOUND');
      }
    });

    it('returns CITY_NOT_FOUND when latitude is absent', async () => {
      const client = makeClient(async () =>
        makeResponse(200, {
          results: [{ id: 1, name: 'Ghost', longitude: 10 }],
        })
      );
      const service = new GeocodingService({ client });

      const result = await service.geocode('Ghost');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('CITY_NOT_FOUND');
      }
    });
  });

  // -------------------------------------------------------------------------
  // HTTP non-2xx → SERVICE_ERROR  (Requirement 5.4)
  // -------------------------------------------------------------------------

  describe('HTTP non-2xx → SERVICE_ERROR', () => {
    it('returns SERVICE_ERROR with status code 500', async () => {
      const client = makeClient(async () =>
        makeResponse(500, { error: 'Internal Server Error' })
      );
      const service = new GeocodingService({ client });

      const result = await service.geocode('Berlin');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('SERVICE_ERROR');
        if (result.error.type === 'SERVICE_ERROR') {
          expect(result.error.statusCode).toBe(500);
        }
      }
    });

    it('returns SERVICE_ERROR with status code 404', async () => {
      const client = makeClient(async () =>
        makeResponse(404, { error: 'Not Found' })
      );
      const service = new GeocodingService({ client });

      const result = await service.geocode('Berlin');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('SERVICE_ERROR');
        if (result.error.type === 'SERVICE_ERROR') {
          expect(result.error.statusCode).toBe(404);
        }
      }
    });
  });

  // -------------------------------------------------------------------------
  // Unparseable JSON body → INVALID_RESPONSE  (Requirement 5.5)
  // -------------------------------------------------------------------------

  describe('invalid JSON body → INVALID_RESPONSE', () => {
    it('returns INVALID_RESPONSE when response body is not valid JSON', async () => {
      const client = makeClient(async () =>
        new Response('not-json-at-all', {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        })
      );
      const service = new GeocodingService({ client });

      const result = await service.geocode('Berlin');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('INVALID_RESPONSE');
      }
    });
  });
});

// ---------------------------------------------------------------------------
// Property-Based Tests — GeocodingService
// Feature: weather-forecast-app, Propiedad 4: Extracción de coordenadas del primer resultado
// ---------------------------------------------------------------------------

/**
 * Arbitrary that generates finite, non-negative-zero floats that survive a
 * JSON round-trip unchanged.
 *
 * Rationale:
 *  - JSON.stringify(NaN)       → "null"   (not a number in JSON)
 *  - JSON.stringify(Infinity)  → "null"   (not a number in JSON)
 *  - JSON.stringify(-0)        → "0"      (-0 is lost in JSON)
 *
 * The Open-Meteo API only ever returns ordinary finite numbers for lat/lon,
 * so restricting to this set correctly models the real input space.
 */
const jsonSafeFloat = fc
  .float({ noNaN: true, noDefaultInfinity: true })
  .filter((n) => !Object.is(n, -0));

describe('GeocodingService — Propiedad 4: Extracción de coordenadas del primer resultado', () => {
  /**
   * Property 4: Extracción de coordenadas del primer resultado
   *
   * Para cualquier respuesta válida de la Geocoding API que contenga uno o
   * más resultados con `latitude` y `longitude` presentes, las coordenadas
   * extraídas DEBERÁN ser numéricamente iguales a los valores `latitude` y
   * `longitude` del primer elemento del array `results`, sin ninguna
   * transformación.
   *
   * Validates: Requisitos 2.2, 5.1
   */
  it('Propiedad 4: los valores latitude y longitude extraídos son numéricamente iguales a los del primer resultado, sin transformación', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          latitude: jsonSafeFloat,
          longitude: jsonSafeFloat,
          name: fc.string(),
        }),
        async (firstResult) => {
          // Build a mock Response containing the generated API result.
          // Values must be finite non-negative-zero numbers to survive JSON
          // serialization — matching what the real API actually sends.
          const apiBody = JSON.stringify({ results: [firstResult] });
          const mockResponse = new Response(apiBody, { status: 200 });

          const mockClient = {
            fetchGeocoding: vi.fn().mockResolvedValue(mockResponse),
            buildUrl: vi.fn(),
          } as unknown as GeocodingClient;

          const service = new GeocodingService({ client: mockClient });
          const result = await service.geocode('TestCity');

          // The service must succeed and return coordinates
          expect(result.success).toBe(true);
          if (!result.success) return;

          // Coordinates must equal the raw API values — no transformation allowed
          expect(result.data.latitude).toBe(firstResult.latitude);
          expect(result.data.longitude).toBe(firstResult.longitude);
          expect(result.data.cityName).toBe(firstResult.name);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: weather-forecast-app, Propiedad 8 (Geocoding): Respuestas HTTP no-2xx siempre generan error

describe('GeocodingService — Propiedad 8 (Geocoding): Respuestas HTTP no-2xx siempre generan error', () => {
  /**
   * Property 8 (Geocoding): Respuestas HTTP no-2xx siempre generan error
   *
   * Para cualquier código de estado HTTP en el rango [300–599] retornado por
   * la Geocoding API, la aplicación DEBERÁ tratar la respuesta como un fallo
   * e indicar en el error que el servicio de geocodificación falló
   * (SERVICE_ERROR con el statusCode correspondiente).
   *
   * Validates: Requisitos 3.4, 5.4
   */
  it('Propiedad 8 (Geocoding): cualquier código de estado HTTP [300–599] produce { success: false } con SERVICE_ERROR y el statusCode preservado', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 300, max: 599 }),
        async (statusCode) => {
          // Build a Response with the generated non-2xx status code.
          // Body content is irrelevant — the service must reject before parsing.
          const mockResponse = new Response(null, { status: statusCode });

          const mockClient = makeClient(async () => mockResponse);
          const service = new GeocodingService({ client: mockClient });
          const result = await service.geocode('SomeCity');

          // Must always produce a failure for any non-2xx status
          expect(result.success).toBe(false);
          if (result.success) return; // type-narrow; already asserted above

          // Error type must identify the geocoding service failure
          expect(result.error.type).toBe('SERVICE_ERROR');

          // The original status code must be preserved in the error
          if (result.error.type === 'SERVICE_ERROR') {
            expect(result.error.statusCode).toBe(statusCode);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
