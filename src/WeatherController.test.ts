/**
 * Tests for WeatherController
 *
 * Feature: weather-forecast-app, Propiedad 13: Limpieza del Weather_Display al iniciar nueva búsqueda
 *
 * Validates: Requisito 4.6, 1.5, 4.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { WeatherController } from './WeatherController';
import type { WeatherControllerDeps } from './WeatherController';
import type { GeocodingService } from './services/GeocodingService';
import type { ForecastService } from './services/ForecastService';
import type { WeatherDisplay } from './components/WeatherDisplay';
import type { LoadingIndicator } from './components/LoadingIndicator';
import type { ErrorMessage } from './components/ErrorMessage';
import type { WeatherData } from './types/index';

// ---------------------------------------------------------------------------
// Shared mock factory
// ---------------------------------------------------------------------------

/**
 * Creates fresh vi.fn() stubs for all WeatherController dependencies.
 * Each call returns a new set so tests are fully isolated.
 */
function makeMocks() {
  const mockGeocodingService = {
    geocode: vi.fn(),
  } as unknown as GeocodingService;

  const mockForecastService = {
    getForecast: vi.fn(),
  } as unknown as ForecastService;

  const mockWeatherDisplay = {
    render: vi.fn(),
    clear: vi.fn(),
  } as unknown as WeatherDisplay;

  const mockLoadingIndicator = {
    show: vi.fn(),
    hide: vi.fn(),
  } as unknown as LoadingIndicator;

  const mockErrorMessage = {
    clear: vi.fn(),
    show: vi.fn(),
    showGeocodingError: vi.fn(),
    showForecastError: vi.fn(),
    showValidationError: vi.fn(),
  } as unknown as ErrorMessage;

  const deps: WeatherControllerDeps = {
    geocodingService: mockGeocodingService,
    forecastService: mockForecastService,
    weatherDisplay: mockWeatherDisplay,
    loadingIndicator: mockLoadingIndicator,
    errorMessage: mockErrorMessage,
  };

  return { mockGeocodingService, mockForecastService, mockWeatherDisplay, mockLoadingIndicator, mockErrorMessage, deps };
}

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------

const SAMPLE_COORDINATES = {
  latitude: 52.52437,
  longitude: 13.41053,
  cityName: 'Berlin',
};

const SAMPLE_WEATHER: WeatherData = {
  temperature: 8.4,
  humidity: 72,
  precipitation: 0.0,
};

// ---------------------------------------------------------------------------
// Feature: weather-forecast-app, Propiedad 13: Limpieza del Weather_Display al iniciar nueva búsqueda
// ---------------------------------------------------------------------------

describe('WeatherController — Propiedad 13: Limpieza del Weather_Display al iniciar nueva búsqueda', () => {
  /**
   * Property 13: Limpieza del Weather_Display al iniciar nueva búsqueda
   *
   * Para cualquier estado del Weather_Display que contenga datos de una búsqueda
   * previa, al iniciar una nueva búsqueda, el contenido del Weather_Display
   * DEBERÁ estar limpio antes de que llegue la respuesta de la nueva solicitud
   * a la Forecast API.
   *
   * Validates: Requisito 4.6
   */
  it(
    // Feature: weather-forecast-app, Propiedad 13: Limpieza del Weather_Display al iniciar nueva búsqueda
    'Propiedad 13: weatherDisplay.clear() se invoca ANTES de que GeocodingService resuelva, para cualquier nombre de ciudad',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          async (cityName) => {
            const {
              mockGeocodingService,
              mockForecastService,
              mockWeatherDisplay,
              mockLoadingIndicator,
              mockErrorMessage,
              deps,
            } = makeMocks();

            // Track the invocation order so we can assert that clear() was
            // called before geocode() resolves.
            const callOrder: string[] = [];

            // GeocodingService: resolves lazily so we can observe the call
            // order before its promise settles.
            (mockGeocodingService.geocode as ReturnType<typeof vi.fn>).mockImplementation(
              () =>
                new Promise<void>((resolve) => {
                  // Record that geocode started (not yet resolved)
                  callOrder.push('geocode:start');
                  // Resolve synchronously in the next microtask tick —
                  // clear() must already be in callOrder by the time we check.
                  resolve();
                }).then(() => {
                  callOrder.push('geocode:resolved');
                  return { success: false, error: { type: 'CITY_NOT_FOUND' } as const };
                })
            );

            // ForecastService: should not be reached (geo fails), but stub anyway.
            (mockForecastService.getForecast as ReturnType<typeof vi.fn>).mockResolvedValue({
              success: false,
              error: { type: 'NETWORK_ERROR' } as const,
            });

            // Instrument weatherDisplay.clear() to record when it was called.
            (mockWeatherDisplay.clear as ReturnType<typeof vi.fn>).mockImplementation(() => {
              callOrder.push('weatherDisplay:clear');
            });

            const controller = new WeatherController(deps);
            await controller.handleSearch(cityName);

            // weatherDisplay.clear() must appear before 'geocode:resolved'
            // in the call-order log, proving it ran synchronously before the
            // geocoding promise settled.
            const clearIdx = callOrder.indexOf('weatherDisplay:clear');
            const geoResolvedIdx = callOrder.indexOf('geocode:resolved');

            expect(clearIdx).toBeGreaterThanOrEqual(0);   // clear() was called
            expect(geoResolvedIdx).toBeGreaterThanOrEqual(0); // geocode resolved
            expect(clearIdx).toBeLessThan(geoResolvedIdx); // clear() came first
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});

// ---------------------------------------------------------------------------
// Unit tests — WeatherController
// ---------------------------------------------------------------------------

describe('WeatherController — pruebas unitarias', () => {
  let mocks: ReturnType<typeof makeMocks>;
  let controller: WeatherController;

  beforeEach(() => {
    mocks = makeMocks();
    controller = new WeatherController(mocks.deps);
  });

  // ── Limpieza de estado al inicio de cada búsqueda (Requisito 4.6) ──────────

  describe('limpieza de estado al inicio de búsqueda', () => {
    it('llama a errorMessage.clear() y weatherDisplay.clear() al inicio de cada búsqueda', async () => {
      const { mockGeocodingService, mockForecastService, mockWeatherDisplay, mockErrorMessage } = mocks;

      (mockGeocodingService.geocode as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: SAMPLE_COORDINATES,
      });
      (mockForecastService.getForecast as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: SAMPLE_WEATHER,
      });

      await controller.handleSearch('Berlin');

      expect(mockErrorMessage.clear).toHaveBeenCalledOnce();
      expect(mockWeatherDisplay.clear).toHaveBeenCalledOnce();
    });
  });

  // ── Flujo exitoso completo (Requisitos 4.1–4.4) ───────────────────────────

  describe('flujo exitoso completo', () => {
    it('llama a weatherDisplay.render() con el nombre de ciudad resuelto, los datos del clima y el nombre ingresado', async () => {
      const { mockGeocodingService, mockForecastService, mockWeatherDisplay } = mocks;

      (mockGeocodingService.geocode as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: SAMPLE_COORDINATES,
      });
      (mockForecastService.getForecast as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: SAMPLE_WEATHER,
      });

      await controller.handleSearch('berlin');

      expect(mockWeatherDisplay.render).toHaveBeenCalledOnce();
      expect(mockWeatherDisplay.render).toHaveBeenCalledWith(
        SAMPLE_COORDINATES.cityName, // resolvedCityName from Geocoding API
        SAMPLE_WEATHER,              // WeatherData from Forecast API
        'berlin',                    // fallbackCityName = user input
      );
    });

    it('llama a forecastService.getForecast() con las coordenadas retornadas por GeocodingService', async () => {
      const { mockGeocodingService, mockForecastService } = mocks;

      (mockGeocodingService.geocode as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: SAMPLE_COORDINATES,
      });
      (mockForecastService.getForecast as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: SAMPLE_WEATHER,
      });

      await controller.handleSearch('Berlin');

      expect(mockForecastService.getForecast).toHaveBeenCalledOnce();
      expect(mockForecastService.getForecast).toHaveBeenCalledWith(
        SAMPLE_COORDINATES.latitude,
        SAMPLE_COORDINATES.longitude,
      );
    });
  });

  // ── Indicador de carga — flujo exitoso (Requisitos 1.5, 4.5) ─────────────

  describe('indicador de carga — flujo exitoso', () => {
    it('loadingIndicator.show() se llama al inicio y loadingIndicator.hide() se llama al finalizar (éxito)', async () => {
      const { mockGeocodingService, mockForecastService, mockLoadingIndicator } = mocks;

      const callOrder: string[] = [];

      (mockLoadingIndicator.show as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callOrder.push('show');
      });
      (mockLoadingIndicator.hide as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callOrder.push('hide');
      });

      (mockGeocodingService.geocode as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: SAMPLE_COORDINATES,
      });
      (mockForecastService.getForecast as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callOrder.push('getForecast:resolved');
        return Promise.resolve({ success: true, data: SAMPLE_WEATHER });
      });

      await controller.handleSearch('Berlin');

      expect(mockLoadingIndicator.show).toHaveBeenCalledOnce();
      expect(mockLoadingIndicator.hide).toHaveBeenCalledOnce();
      // show must come before getForecast resolves, hide must come after
      expect(callOrder.indexOf('show')).toBeLessThan(callOrder.indexOf('getForecast:resolved'));
      expect(callOrder.indexOf('hide')).toBeGreaterThan(callOrder.indexOf('getForecast:resolved'));
    });
  });

  // ── Indicador de carga — fallo de geocodificación (Requisito 4.5) ─────────

  describe('indicador de carga — fallo de geocodificación', () => {
    it('loadingIndicator.hide() se llama cuando GeocodingService retorna un error', async () => {
      const { mockGeocodingService, mockLoadingIndicator } = mocks;

      (mockGeocodingService.geocode as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: { type: 'CITY_NOT_FOUND' } as const,
      });

      await controller.handleSearch('XYZNonExistentCity');

      expect(mockLoadingIndicator.show).toHaveBeenCalledOnce();
      expect(mockLoadingIndicator.hide).toHaveBeenCalledOnce();
    });
  });

  // ── GeocodingService retorna CITY_NOT_FOUND ───────────────────────────────

  describe('GeocodingService retorna CITY_NOT_FOUND', () => {
    it('llama a errorMessage.showGeocodingError() con el error CITY_NOT_FOUND y NO llama a weatherDisplay.render()', async () => {
      const { mockGeocodingService, mockForecastService, mockWeatherDisplay, mockErrorMessage } = mocks;

      const geoError = { type: 'CITY_NOT_FOUND' } as const;
      (mockGeocodingService.geocode as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: geoError,
      });

      await controller.handleSearch('AtlantisCity');

      expect(mockErrorMessage.showGeocodingError).toHaveBeenCalledOnce();
      expect(mockErrorMessage.showGeocodingError).toHaveBeenCalledWith(geoError);
      expect(mockForecastService.getForecast).not.toHaveBeenCalled();
      expect(mockWeatherDisplay.render).not.toHaveBeenCalled();
    });
  });

  // ── ForecastService retorna INCOMPLETE_DATA ───────────────────────────────

  describe('ForecastService retorna INCOMPLETE_DATA', () => {
    it('llama a errorMessage.showForecastError() con el error INCOMPLETE_DATA y NO llama a weatherDisplay.render()', async () => {
      const { mockGeocodingService, mockForecastService, mockWeatherDisplay, mockErrorMessage } = mocks;

      const forecastError = { type: 'INCOMPLETE_DATA' } as const;
      (mockGeocodingService.geocode as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: SAMPLE_COORDINATES,
      });
      (mockForecastService.getForecast as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: forecastError,
      });

      await controller.handleSearch('Berlin');

      expect(mockErrorMessage.showForecastError).toHaveBeenCalledOnce();
      expect(mockErrorMessage.showForecastError).toHaveBeenCalledWith(forecastError);
      expect(mockWeatherDisplay.render).not.toHaveBeenCalled();
    });

    it('loadingIndicator.hide() se llama incluso cuando ForecastService retorna INCOMPLETE_DATA', async () => {
      const { mockGeocodingService, mockForecastService, mockLoadingIndicator } = mocks;

      (mockGeocodingService.geocode as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: SAMPLE_COORDINATES,
      });
      (mockForecastService.getForecast as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: { type: 'INCOMPLETE_DATA' } as const,
      });

      await controller.handleSearch('Berlin');

      expect(mockLoadingIndicator.hide).toHaveBeenCalledOnce();
    });
  });
});
