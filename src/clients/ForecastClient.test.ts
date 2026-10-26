/**
 * Tests for ForecastClient
 *
 * Feature: weather-forecast-app
 * Propiedad 6: Construcción correcta de la URL de Pronóstico
 *
 * Validates: Requisito 3.1
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ForecastClient } from './ForecastClient';

// Feature: weather-forecast-app, Propiedad 6: Construcción correcta de la URL de Pronóstico

describe('ForecastClient', () => {
  describe('buildUrl', () => {
    /**
     * Property 6: Construcción correcta de la URL de Pronóstico
     *
     * For any valid coordinate pair (latitude ∈ [-90, 90], longitude ∈ [-180, 180]),
     * the URL built for the Forecast API MUST contain:
     *   - The `latitude` parameter matching the input value
     *   - The `longitude` parameter matching the input value
     *   - The `current` parameter containing all three required variable names:
     *     temperature_2m, relative_humidity_2m, precipitation
     *
     * Validates: Requisito 3.1
     */
    it('P6: la URL contiene latitude, longitude y el parámetro current con las tres variables requeridas', () => {
      const client = new ForecastClient();

      fc.assert(
        fc.property(
          fc.tuple(
            fc.float({ min: -90, max: 90, noNaN: true }),
            fc.float({ min: -180, max: 180, noNaN: true }),
          ),
          ([latitude, longitude]) => {
            const url = client.buildUrl(latitude, longitude);
            const parsed = new URL(url);
            const params = parsed.searchParams;

            // The `latitude` parameter must be present and match the input value.
            // Use == (not Object.is) so that -0 and +0 are treated as equal,
            // since String(-0) === "0" and URL params cannot encode negative zero.
            expect(params.has('latitude')).toBe(true);
            expect(Number(params.get('latitude')) == latitude).toBe(true);

            // The `longitude` parameter must be present and match the input value.
            expect(params.has('longitude')).toBe(true);
            expect(Number(params.get('longitude')) == longitude).toBe(true);

            // The `current` parameter must contain all three required variable names
            const currentParam = params.get('current') ?? '';
            const variables = currentParam.split(',').map((v) => v.trim());

            expect(variables).toContain('temperature_2m');
            expect(variables).toContain('relative_humidity_2m');
            expect(variables).toContain('precipitation');
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
