import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { GeocodingClient } from './GeocodingClient';

// Feature: weather-forecast-app, Propiedad 3: Construcción correcta de la URL de Geocodificación

describe('GeocodingClient', () => {
  describe('buildUrl', () => {
    /**
     * Property 3: Construcción correcta de la URL de Geocodificación
     *
     * Para cualquier string de nombre de ciudad no vacío, la URL construida
     * para la solicitud a la Geocoding API DEBERÁ contener el nombre
     * URL-encoded como parámetro `name` y el parámetro `count=1`.
     *
     * Validates: Requisito 2.1
     */
    it('Propiedad 3: la URL contiene el parámetro name URL-encoded y count=1 para cualquier nombre de ciudad', () => {
      const client = new GeocodingClient();

      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          (cityName) => {
            const url = client.buildUrl(cityName);
            const parsedUrl = new URL(url);
            const params = parsedUrl.searchParams;

            // El parámetro `name` debe coincidir exactamente con el nombre de ciudad
            // (URLSearchParams encodes/decodes transparently, so get() returns the decoded value)
            expect(params.get('name')).toBe(cityName);

            // El parámetro `count` debe ser exactamente '1'
            expect(params.get('count')).toBe('1');

            // La URL encoded del parámetro name debe estar presente en la URL raw
            const encodedName = encodeURIComponent(cityName);
            // URLSearchParams uses application/x-www-form-urlencoded encoding
            // which encodes spaces as '+'; encodeURIComponent encodes them as '%20'.
            // We verify the round-trip via searchParams instead of raw string matching.
            expect(params.has('name')).toBe(true);
            expect(params.has('count')).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
