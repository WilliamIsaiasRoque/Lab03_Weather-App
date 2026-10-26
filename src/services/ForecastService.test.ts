/**
 * Tests for ForecastService
 *
 * Feature: weather-forecast-app, Propiedad 7: Round-trip de parseo de la respuesta Forecast → WeatherData
 *
 * Validates: Requisitos 3.2, 5.2
 */

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { ForecastService } from './ForecastService';
import { ForecastClient } from '../clients/ForecastClient';

// Feature: weather-forecast-app, Propiedad 7: Round-trip de parseo de la respuesta Forecast → WeatherData

describe('ForecastService', () => {
  describe('getForecast — round-trip de parseo', () => {
    /**
     * Property 7: Round-trip de parseo de la respuesta Forecast → WeatherData
     *
     * Para cualquier respuesta JSON válida de la Forecast API que contenga los
     * campos `current.temperature_2m`, `current.relative_humidity_2m` y
     * `current.precipitation` con valores numéricos, los valores almacenados en
     * el objeto `WeatherData` interno DEBERÁN ser numéricamente iguales a los
     * valores del JSON crudo, sin ninguna transformación antes del almacenamiento.
     *
     * Validates: Requisitos 3.2, 5.2
     */
    it('Propiedad 7: los valores temperature, humidity y precipitation de WeatherData son numéricamente iguales a los del JSON crudo, sin transformación', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            // Use finite floats only: Infinity and NaN cannot survive a JSON
            // round-trip (JSON.stringify produces "null" for them), so they are
            // excluded from the input space. Real meteorological values are always
            // finite, so this is the correct domain for this property.
            temperature_2m: fc.float({ noNaN: true, noDefaultInfinity: true }),
            relative_humidity_2m: fc.float({ noNaN: true, noDefaultInfinity: true }),
            precipitation: fc.float({ noNaN: true, noDefaultInfinity: true }),
          }),
          async (current) => {
            // Build a mock Response wrapping the generated `current` block
            const apiBody = JSON.stringify({ current });
            const mockResponse = new Response(apiBody, { status: 200 });

            // Mock ForecastClient.fetchForecast to return the controlled Response
            const mockClient = {
              fetchForecast: vi.fn().mockResolvedValue(mockResponse),
            } as unknown as ForecastClient;

            const service = new ForecastService({ client: mockClient });
            const result = await service.getForecast(0, 0);

            // The service must succeed and return WeatherData
            expect(result.success).toBe(true);
            if (!result.success) return; // type-narrow; already asserted above

            // WeatherData values must be numerically equal to the raw JSON values —
            // no transformation allowed. We use == (not Object.is) because JSON
            // serialization cannot preserve -0 (JSON.stringify(-0) === "0"), so
            // -0 and +0 are treated as numerically equal here, which is correct
            // per the "numéricamente iguales" requirement.
            expect(result.data.temperature == current.temperature_2m).toBe(true);
            expect(result.data.humidity == current.relative_humidity_2m).toBe(true);
            expect(result.data.precipitation == current.precipitation).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

// Feature: weather-forecast-app, Propiedad 8 (Forecast): Respuestas HTTP no-2xx siempre generan error

describe('ForecastService — HTTP no-2xx', () => {
  /**
   * Property 8 (parte Forecast): Respuestas HTTP no-2xx siempre generan error
   *
   * Para cualquier código de estado HTTP en el rango [300, 599], el servicio
   * DEBERÁ retornar `{ success: false, error: { type: 'SERVICE_ERROR',
   * statusCode: <código generado> } }` sin importar el cuerpo de la respuesta.
   *
   * Validates: Requisitos 3.4, 5.4
   */
  it('Propiedad 8 (Forecast): cualquier respuesta HTTP no-2xx produce SERVICE_ERROR con el statusCode correcto', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 300, max: 599 }),
        async (statusCode) => {
          // Build a mock Response with the generated non-2xx status code
          const mockResponse = new Response(null, { status: statusCode });

          const mockClient = {
            fetchForecast: vi.fn().mockResolvedValue(mockResponse),
          } as unknown as ForecastClient;

          const service = new ForecastService({ client: mockClient });
          const result = await service.getForecast(0, 0);

          // Must always be a failure
          expect(result.success).toBe(false);
          if (result.success) return; // type-narrow; already asserted above

          // Error type must be SERVICE_ERROR with the exact statusCode
          expect(result.error.type).toBe('SERVICE_ERROR');
          if (result.error.type === 'SERVICE_ERROR') {
            expect(result.error.statusCode).toBe(statusCode);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: weather-forecast-app, Propiedad 10: Campos meteorológicos faltantes generan error de datos incompletos

describe('ForecastService', () => {
  describe('getForecast — campos meteorológicos faltantes generan INCOMPLETE_DATA', () => {
    /**
     * Property 10: Campos meteorológicos faltantes generan error de datos incompletos
     *
     * Para cualquier objeto `current` donde al menos uno de los tres campos
     * (temperature_2m, relative_humidity_2m, precipitation) sea null, undefined
     * o esté ausente, el servicio DEBERÁ retornar
     * `{ success: false, error: { type: 'INCOMPLETE_DATA' } }`.
     *
     * Validates: Requisito 3.5
     */
    it('Propiedad 10: al menos un campo nulo/undefined/ausente → INCOMPLETE_DATA', async () => {
      // Arbitrario para un campo que puede ser un número válido o un valor inválido.
      const validOrInvalidField = fc.oneof(
        fc.float({ noNaN: true, noDefaultInfinity: true }), // valor válido
        fc.constant(null),
        fc.constant(undefined)
      );

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            temperature_2m: validOrInvalidField,
            relative_humidity_2m: validOrInvalidField,
            precipitation: validOrInvalidField,
          }).filter(
            // Garantizar que al menos uno de los tres campos NO sea un número válido
            (current) =>
              typeof current.temperature_2m !== 'number' ||
              typeof current.relative_humidity_2m !== 'number' ||
              typeof current.precipitation !== 'number'
          ),
          async (current) => {
            // Serializar a JSON de forma que undefined se omita (comportamiento nativo de JSON.stringify)
            const apiBody = JSON.stringify({ current });
            const mockResponse = new Response(apiBody, { status: 200 });

            const mockClient = {
              fetchForecast: vi.fn().mockResolvedValue(mockResponse),
            } as unknown as ForecastClient;

            const service = new ForecastService({ client: mockClient });
            const result = await service.getForecast(0, 0);

            expect(result.success).toBe(false);
            if (result.success) return; // type-narrow; ya afirmado arriba

            expect(result.error.type).toBe('INCOMPLETE_DATA');
          }
        ),
        { numRuns: 200 }
      );
    });
  });
});

describe('ForecastService — pruebas unitarias', () => {
  /**
   * Validates: Requisitos 3.3
   * Error de red → NETWORK_ERROR
   */
  it('retorna NETWORK_ERROR cuando fetchForecast lanza un error de red genérico', async () => {
    const mockClient = {
      fetchForecast: vi.fn().mockRejectedValue(new Error('Network failure')),
    } as unknown as ForecastClient;

    const service = new ForecastService({ client: mockClient });
    const result = await service.getForecast(40.0, -3.0);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.type).toBe('NETWORK_ERROR');
  });

  /**
   * Validates: Requisitos 3.3
   * Timeout simulado → TIMEOUT
   */
  it('retorna TIMEOUT cuando fetchForecast lanza un TimeoutError', async () => {
    const timeoutError = new Error('Request timed out after 10000ms');
    timeoutError.name = 'TimeoutError';

    const mockClient = {
      fetchForecast: vi.fn().mockRejectedValue(timeoutError),
    } as unknown as ForecastClient;

    const service = new ForecastService({ client: mockClient });
    const result = await service.getForecast(40.0, -3.0);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.type).toBe('TIMEOUT');
  });

  /**
   * Validates: Requisitos 3.2
   * Respuesta exitosa con todos los campos presentes → { success: true, data: WeatherData }
   */
  it('retorna WeatherData correcto cuando la respuesta contiene todos los campos requeridos', async () => {
    const apiBody = JSON.stringify({
      current: {
        temperature_2m: 22.5,
        relative_humidity_2m: 60,
        precipitation: 0.2,
      },
    });
    const mockResponse = new Response(apiBody, { status: 200 });

    const mockClient = {
      fetchForecast: vi.fn().mockResolvedValue(mockResponse),
    } as unknown as ForecastClient;

    const service = new ForecastService({ client: mockClient });
    const result = await service.getForecast(40.0, -3.0);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.temperature).toBe(22.5);
    expect(result.data.humidity).toBe(60);
    expect(result.data.precipitation).toBe(0.2);
  });

  /**
   * Validates: Requisitos 3.4
   * Respuesta HTTP no-2xx → SERVICE_ERROR
   */
  it('retorna SERVICE_ERROR cuando la Forecast API responde con un código no-2xx', async () => {
    const mockResponse = new Response('Internal Server Error', { status: 500 });

    const mockClient = {
      fetchForecast: vi.fn().mockResolvedValue(mockResponse),
    } as unknown as ForecastClient;

    const service = new ForecastService({ client: mockClient });
    const result = await service.getForecast(40.0, -3.0);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.type).toBe('SERVICE_ERROR');
    if (result.error.type !== 'SERVICE_ERROR') return;
    expect(result.error.statusCode).toBe(500);
  });

  /**
   * Validates: Requisitos 3.5
   * Campos meteorológicos ausentes → INCOMPLETE_DATA
   */
  it('retorna INCOMPLETE_DATA cuando algún campo del clima está ausente o es nulo', async () => {
    const apiBody = JSON.stringify({
      current: {
        temperature_2m: 22.5,
        relative_humidity_2m: null,
        // precipitation ausente
      },
    });
    const mockResponse = new Response(apiBody, { status: 200 });

    const mockClient = {
      fetchForecast: vi.fn().mockResolvedValue(mockResponse),
    } as unknown as ForecastClient;

    const service = new ForecastService({ client: mockClient });
    const result = await service.getForecast(40.0, -3.0);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.type).toBe('INCOMPLETE_DATA');
  });
});

// Feature: weather-forecast-app, Propiedad 9 (Forecast): Respuestas 2xx con cuerpo inválido generan error

describe('ForecastService — Propiedad 9 (Forecast): Respuestas 2xx con cuerpo inválido generan error', () => {
  /**
   * Property 9 (parte Forecast): Respuestas 2xx con cuerpo inválido generan error
   *
   * SI la Forecast API retorna un código de estado HTTP 2xx con un cuerpo de
   * respuesta que no puede parsearse en el objeto esperado (string malformado,
   * o JSON válido pero sin el campo `current` requerido o con `current: null`),
   * ENTONCES la App DEBERÁ retornar `{ success: false, error: { type: 'INVALID_RESPONSE' } }`.
   *
   * Validates: Requisito 5.5
   */

  describe('Propiedad 9a: strings no parseables producen INVALID_RESPONSE', () => {
    it('Propiedad 9a: cualquier string que no sea JSON válido en un 2xx produce { success: false, error: { type: "INVALID_RESPONSE" } }', async () => {
      /**
       * Generator: strings that are NOT valid JSON.
       *
       * Strategy: generate arbitrary strings, then filter out those that happen
       * to be valid JSON. In practice, the vast majority of `fc.string()` output
       * is not parseable as JSON, so the filter seldom discards anything.
       */
      const nonJsonString = fc.string().filter((s) => {
        try {
          JSON.parse(s);
          return false; // valid JSON — discard
        } catch {
          return true; // not valid JSON — keep
        }
      });

      await fc.assert(
        fc.asyncProperty(nonJsonString, async (malformedBody) => {
          const mockResponse = new Response(malformedBody, { status: 200 });

          const mockClient = {
            fetchForecast: vi.fn().mockResolvedValue(mockResponse),
          } as unknown as ForecastClient;

          const service = new ForecastService({ client: mockClient });
          const result = await service.getForecast(0, 0);

          expect(result.success).toBe(false);
          if (result.success) return; // type-narrow; already asserted above

          expect(result.error.type).toBe('INVALID_RESPONSE');
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Propiedad 9b: objetos JSON sin el campo "current" requerido producen INVALID_RESPONSE', () => {
    it('Propiedad 9b: un objeto JSON válido sin campo "current" (o con current: null) en un 2xx produce { success: false, error: { type: "INVALID_RESPONSE" } }', async () => {
      /**
       * Generator: valid JSON objects that are missing the `current` field, or
       * where `current` is explicitly null.
       *
       * These are structurally invalid responses from the Forecast API
       * perspective, even though the HTTP status is 2xx.
       *
       * Two sub-strategies:
       *  1. A record with no `current` key at all (arbitrary other keys).
       *  2. A record with `current` explicitly set to null.
       */
      const missingCurrentArb = fc.oneof(
        // Strategy 1: arbitrary object with no `current` field
        fc
          .dictionary(
            // keys that are NOT 'current'
            fc.string({ minLength: 1 }).filter((k) => k !== 'current'),
            fc.jsonValue(),
          )
          .map((obj) => JSON.stringify(obj)),

        // Strategy 2: object with current explicitly set to null
        fc.constant(JSON.stringify({ current: null }))
      );

      await fc.assert(
        fc.asyncProperty(missingCurrentArb, async (bodyString) => {
          const mockResponse = new Response(bodyString, { status: 200 });

          const mockClient = {
            fetchForecast: vi.fn().mockResolvedValue(mockResponse),
          } as unknown as ForecastClient;

          const service = new ForecastService({ client: mockClient });
          const result = await service.getForecast(0, 0);

          expect(result.success).toBe(false);
          if (result.success) return; // type-narrow; already asserted above

          expect(result.error.type).toBe('INVALID_RESPONSE');
        }),
        { numRuns: 100 }
      );
    });
  });
});
