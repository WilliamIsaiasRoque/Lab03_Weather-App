/**
 * WeatherController — Integration Tests (end-to-end, in-browser DOM)
 *
 * Strategy:
 *  - Set up the full DOM from index.html markup via `document.body.innerHTML`.
 *  - Create REAL instances of every layer (GeocodingClient, GeocodingService,
 *    ForecastClient, ForecastService, LoadingIndicator, ErrorMessage,
 *    WeatherDisplay, WeatherController, CitySearchForm).
 *  - Mock ONLY the network boundary: `GeocodingClient.fetchGeocoding` and
 *    `ForecastClient.fetchForecast` are replaced with `vi.spyOn` stubs.
 *  - Trigger searches through the real CitySearchForm (form submit event) so
 *    that the full validation → controller → service → UI rendering path is
 *    exercised.
 *  - Assert on the actual DOM state after each async operation.
 *
 * Requirements covered: 1.5, 1.6, 4.1, 4.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GeocodingClient } from './clients/GeocodingClient.js';
import { ForecastClient } from './clients/ForecastClient.js';
import { GeocodingService } from './services/GeocodingService.js';
import { ForecastService } from './services/ForecastService.js';
import { LoadingIndicator } from './components/LoadingIndicator.js';
import { ErrorMessage } from './components/ErrorMessage.js';
import { WeatherDisplay } from './components/WeatherDisplay.js';
import { WeatherController } from './WeatherController.js';
import { CitySearchForm } from './components/CitySearchForm.js';

// ---------------------------------------------------------------------------
// DOM fixture — mirrors the relevant sections of index.html
// ---------------------------------------------------------------------------

const DOM_FIXTURE = `
  <form id="city-search-form" novalidate>
    <label for="city-input">Nombre de la ciudad</label>
    <input
      type="text"
      id="city-input"
      name="city"
      maxlength="100"
      autocomplete="off"
      placeholder="Ej: Buenos Aires"
      aria-describedby="validation-message"
    />
    <button type="submit">Buscar</button>
    <span id="validation-message" role="alert" aria-live="polite"></span>
  </form>

  <div id="loading-indicator" aria-live="polite" aria-busy="false" hidden>
    <span>Cargando…</span>
  </div>

  <div id="error-message" role="alert" aria-live="assertive"></div>

  <section id="weather-display" aria-label="Resultados del clima"></section>
`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a successful Geocoding API response for a given city. */
function makeGeoResponse(
  name: string,
  latitude: number,
  longitude: number,
): Response {
  return new Response(
    JSON.stringify({
      results: [{ id: 1, name, latitude, longitude, country: 'TestCountry' }],
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

/** Build a successful Forecast API response. */
function makeForecastResponse(
  temperature_2m: number,
  relative_humidity_2m: number,
  precipitation: number,
): Response {
  return new Response(
    JSON.stringify({
      current: { temperature_2m, relative_humidity_2m, precipitation },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

/** Build a Geocoding API response with zero results (city not found). */
function makeGeoNotFoundResponse(): Response {
  return new Response(JSON.stringify({ results: [] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Build a Geocoding API response that simulates a network-level failure. */
function makeNetworkError(): Error {
  return new Error('Failed to fetch');
}

/** Build a Forecast API response where all current fields are null. */
function makeForecastIncompleteResponse(): Response {
  return new Response(
    JSON.stringify({
      current: {
        temperature_2m: null,
        relative_humidity_2m: null,
        precipitation: null,
      },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

// ---------------------------------------------------------------------------
// Full-stack factory
// ---------------------------------------------------------------------------

interface TestStack {
  geoClient: GeocodingClient;
  forecastClient: ForecastClient;
  controller: WeatherController;
  cityInput: HTMLInputElement;
  form: HTMLFormElement;
  loadingEl: HTMLElement;
  errorEl: HTMLElement;
  weatherEl: HTMLElement;
}

/**
 * Construct the complete wired-up application stack using the live DOM.
 * Returns the clients (so tests can spy on them) and the key DOM nodes.
 */
function buildStack(): TestStack {
  // HTTP clients — real instances; fetchGeocoding/fetchForecast will be spied
  const geoClient = new GeocodingClient();
  const forecastClient = new ForecastClient();

  // Application-layer services wired to the real clients
  const geocodingService = new GeocodingService({ client: geoClient });
  const forecastService = new ForecastService({ client: forecastClient });

  // UI components bound to the DOM nodes set up in beforeEach
  const loadingIndicator = new LoadingIndicator('loading-indicator');
  const errorMessage = new ErrorMessage('#error-message');
  const weatherDisplay = new WeatherDisplay();

  // Controller orchestrates everything
  const controller = new WeatherController({
    geocodingService,
    forecastService,
    weatherDisplay,
    loadingIndicator,
    errorMessage,
  });

  // Search form — wires user input to the controller
  new CitySearchForm(
    (cityName: string) => controller.handleSearch(cityName),
    document,
  );

  return {
    geoClient,
    forecastClient,
    controller,
    cityInput: document.getElementById('city-input') as HTMLInputElement,
    form: document.getElementById('city-search-form') as HTMLFormElement,
    loadingEl: document.getElementById('loading-indicator') as HTMLElement,
    errorEl: document.getElementById('error-message') as HTMLElement,
    weatherEl: document.getElementById('weather-display') as HTMLElement,
  };
}

/**
 * Type the city name into City_Input and submit the form.
 * Returns a Promise that resolves after all microtasks (async service calls)
 * have settled, so DOM assertions can be made synchronously afterwards.
 */
async function searchFor(
  cityInput: HTMLInputElement,
  form: HTMLFormElement,
  cityName: string,
): Promise<void> {
  cityInput.value = cityName;
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  // Flush all pending microtasks (Promise chains inside the controller).
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('WeatherController — Integration Tests', () => {
  beforeEach(() => {
    // Reset the DOM before each test to ensure isolation.
    document.body.innerHTML = DOM_FIXTURE;
    // Clear all spies / mocks between tests.
    vi.restoreAllMocks();
  });

  // ── Test 1: Flujo exitoso ────────────────────────────────────────────────
  // Requirements: 4.1 (city name), 4.2 (temperature °C), 4.3 (humidity %),
  //               4.4 (precipitation mm), 1.5 (loading indicator hidden after)

  describe('Flujo exitoso: búsqueda → geocoding → forecast → datos visibles en el DOM', () => {
    it('muestra el nombre de la ciudad, temperatura (°C), humedad (%) y precipitación (mm) en el Weather_Display', async () => {
      const { geoClient, forecastClient, cityInput, form, weatherEl } =
        buildStack();

      // Arrange: mock the network boundary
      vi.spyOn(geoClient, 'fetchGeocoding').mockResolvedValue(
        makeGeoResponse('Madrid', 40.4168, -3.7038),
      );
      vi.spyOn(forecastClient, 'fetchForecast').mockResolvedValue(
        makeForecastResponse(22.5, 60, 0.2),
      );

      // Act: type a city name and submit
      await searchFor(cityInput, form, 'Madrid');

      // Assert: WeatherDisplay is populated (Requirement 4.1–4.4)
      const displayText = weatherEl.textContent ?? '';
      expect(displayText).toContain('Madrid');
      expect(displayText).toMatch(/22\.5\s*°C/);
      expect(displayText).toMatch(/60\s*%/);
      expect(displayText).toMatch(/0\.2\s*mm/);
    });

    it('usa el nombre retornado por la Geocoding API para el título de la ciudad', async () => {
      const { geoClient, forecastClient, cityInput, form, weatherEl } =
        buildStack();

      vi.spyOn(geoClient, 'fetchGeocoding').mockResolvedValue(
        makeGeoResponse('Buenos Aires', -34.6037, -58.3816),
      );
      vi.spyOn(forecastClient, 'fetchForecast').mockResolvedValue(
        makeForecastResponse(18.0, 75, 1.5),
      );

      await searchFor(cityInput, form, 'buenos aires');

      // The API-returned name "Buenos Aires" should appear, not the raw input
      expect(weatherEl.textContent).toContain('Buenos Aires');
    });

    it('el campo #error-message está vacío después de un flujo exitoso', async () => {
      const { geoClient, forecastClient, cityInput, form, errorEl } =
        buildStack();

      vi.spyOn(geoClient, 'fetchGeocoding').mockResolvedValue(
        makeGeoResponse('Paris', 48.8566, 2.3522),
      );
      vi.spyOn(forecastClient, 'fetchForecast').mockResolvedValue(
        makeForecastResponse(15.0, 80, 0.0),
      );

      await searchFor(cityInput, form, 'Paris');

      expect(errorEl.textContent).toBe('');
    });
  });

  // ── Test 2: Geocoding falla — CITY_NOT_FOUND ─────────────────────────────
  // Requirements: 1.6 (City_Input remains accessible)

  describe('Geocoding falla (CITY_NOT_FOUND): error visible, City_Input accesible', () => {
    it('muestra el mensaje de error apropiado en #error-message cuando la ciudad no existe', async () => {
      const { geoClient, cityInput, form, errorEl } = buildStack();

      vi.spyOn(geoClient, 'fetchGeocoding').mockResolvedValue(
        makeGeoNotFoundResponse(),
      );

      await searchFor(cityInput, form, 'Atlantis');

      // Requirement: error message should be displayed
      expect(errorEl.textContent).toBeTruthy();
      expect(errorEl.textContent).toContain('No se encontró la ciudad');
    });

    it('City_Input no está deshabilitado (Requirement 1.6)', async () => {
      const { geoClient, cityInput, form } = buildStack();

      vi.spyOn(geoClient, 'fetchGeocoding').mockResolvedValue(
        makeGeoNotFoundResponse(),
      );

      await searchFor(cityInput, form, 'Atlantis');

      // City_Input must remain enabled so the user can retry
      expect(cityInput.disabled).toBe(false);
    });

    it('el Weather_Display no muestra datos de la ciudad cuando geocoding falla', async () => {
      const { geoClient, cityInput, form, weatherEl } = buildStack();

      vi.spyOn(geoClient, 'fetchGeocoding').mockResolvedValue(
        makeGeoNotFoundResponse(),
      );

      await searchFor(cityInput, form, 'Atlantis');

      expect(weatherEl.innerHTML.trim()).toBe('');
    });
  });

  // ── Test 3: Geocoding falla — NETWORK_ERROR ───────────────────────────────

  describe('Geocoding falla (NETWORK_ERROR): error visible', () => {
    it('muestra un mensaje de error de red cuando fetchGeocoding lanza una excepción', async () => {
      const { geoClient, cityInput, form, errorEl } = buildStack();

      vi.spyOn(geoClient, 'fetchGeocoding').mockRejectedValue(
        makeNetworkError(),
      );

      await searchFor(cityInput, form, 'Berlin');

      expect(errorEl.textContent).toBeTruthy();
      expect(errorEl.textContent).toContain(
        'geocodificación no está disponible',
      );
    });

    it('City_Input permanece accesible después de un error de red en geocoding (Requirement 1.6)', async () => {
      const { geoClient, cityInput, form } = buildStack();

      vi.spyOn(geoClient, 'fetchGeocoding').mockRejectedValue(
        makeNetworkError(),
      );

      await searchFor(cityInput, form, 'Berlin');

      expect(cityInput.disabled).toBe(false);
    });
  });

  // ── Test 4: ForecastService falla — INCOMPLETE_DATA ───────────────────────

  describe('ForecastService falla (INCOMPLETE_DATA): geocoding exitoso pero forecast retorna campos nulos', () => {
    it('muestra el mensaje de datos incompletos en #error-message', async () => {
      const { geoClient, forecastClient, cityInput, form, errorEl } =
        buildStack();

      vi.spyOn(geoClient, 'fetchGeocoding').mockResolvedValue(
        makeGeoResponse('Tokyo', 35.6762, 139.6503),
      );
      vi.spyOn(forecastClient, 'fetchForecast').mockResolvedValue(
        makeForecastIncompleteResponse(),
      );

      await searchFor(cityInput, form, 'Tokyo');

      expect(errorEl.textContent).toBeTruthy();
      expect(errorEl.textContent).toContain('datos meteorológicos');
      expect(errorEl.textContent).toContain('incompletos');
    });

    it('el Weather_Display no muestra datos cuando el forecast falla con INCOMPLETE_DATA', async () => {
      const { geoClient, forecastClient, cityInput, form, weatherEl } =
        buildStack();

      vi.spyOn(geoClient, 'fetchGeocoding').mockResolvedValue(
        makeGeoResponse('Tokyo', 35.6762, 139.6503),
      );
      vi.spyOn(forecastClient, 'fetchForecast').mockResolvedValue(
        makeForecastIncompleteResponse(),
      );

      await searchFor(cityInput, form, 'Tokyo');

      expect(weatherEl.innerHTML.trim()).toBe('');
    });

    it('City_Input permanece accesible después de un error de datos incompletos (Requirement 1.6)', async () => {
      const { geoClient, forecastClient, cityInput, form } = buildStack();

      vi.spyOn(geoClient, 'fetchGeocoding').mockResolvedValue(
        makeGeoResponse('Tokyo', 35.6762, 139.6503),
      );
      vi.spyOn(forecastClient, 'fetchForecast').mockResolvedValue(
        makeForecastIncompleteResponse(),
      );

      await searchFor(cityInput, form, 'Tokyo');

      expect(cityInput.disabled).toBe(false);
    });
  });

  // ── Test 5: Indicador de carga ────────────────────────────────────────────
  // Requirements: 1.5 (show during request), 4.5 (hide after completion)

  describe('Indicador de carga (Requirements 1.5, 4.5)', () => {
    it('el indicador está oculto (hidden) después de un flujo exitoso', async () => {
      const { geoClient, forecastClient, cityInput, form, loadingEl } =
        buildStack();

      vi.spyOn(geoClient, 'fetchGeocoding').mockResolvedValue(
        makeGeoResponse('London', 51.5074, -0.1278),
      );
      vi.spyOn(forecastClient, 'fetchForecast').mockResolvedValue(
        makeForecastResponse(12.3, 55, 0.0),
      );

      await searchFor(cityInput, form, 'London');

      // Requirement 4.5: indicator must be hidden once the response is received
      expect(loadingEl.hasAttribute('hidden')).toBe(true);
      expect(loadingEl.getAttribute('aria-busy')).toBe('false');
    });

    it('el indicador está oculto después de un fallo en geocoding', async () => {
      const { geoClient, cityInput, form, loadingEl } = buildStack();

      vi.spyOn(geoClient, 'fetchGeocoding').mockResolvedValue(
        makeGeoNotFoundResponse(),
      );

      await searchFor(cityInput, form, 'Atlantis');

      // Requirement 4.5: indicator hidden on error too
      expect(loadingEl.hasAttribute('hidden')).toBe(true);
      expect(loadingEl.getAttribute('aria-busy')).toBe('false');
    });

    it('el indicador está oculto después de un fallo en forecast', async () => {
      const { geoClient, forecastClient, cityInput, form, loadingEl } =
        buildStack();

      vi.spyOn(geoClient, 'fetchGeocoding').mockResolvedValue(
        makeGeoResponse('Rome', 41.9028, 12.4964),
      );
      vi.spyOn(forecastClient, 'fetchForecast').mockResolvedValue(
        makeForecastIncompleteResponse(),
      );

      await searchFor(cityInput, form, 'Rome');

      expect(loadingEl.hasAttribute('hidden')).toBe(true);
      expect(loadingEl.getAttribute('aria-busy')).toBe('false');
    });

    it('el indicador se muestra (visible, aria-busy=true) durante la petición y se oculta al finalizar', async () => {
      const { geoClient, forecastClient, cityInput, form, loadingEl } =
        buildStack();

      // Capture the loading state mid-flight using a deferred promise
      let resolveGeo!: (r: Response) => void;
      const geoPromise = new Promise<Response>(
        (resolve) => (resolveGeo = resolve),
      );

      vi.spyOn(geoClient, 'fetchGeocoding').mockReturnValue(geoPromise);
      vi.spyOn(forecastClient, 'fetchForecast').mockResolvedValue(
        makeForecastResponse(10.0, 50, 0.1),
      );

      // Submit the form — the controller will show the indicator synchronously,
      // then await the geocoding promise.
      cityInput.value = 'Amsterdam';
      form.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      );

      // At this point the controller has called loadingIndicator.show() but
      // geocoding hasn't resolved yet — the indicator should be visible.
      expect(loadingEl.hasAttribute('hidden')).toBe(false);
      expect(loadingEl.getAttribute('aria-busy')).toBe('true');

      // Resolve geocoding and let the forecast complete
      resolveGeo(makeGeoResponse('Amsterdam', 52.3676, 4.9041));
      await new Promise<void>((resolve) => setTimeout(resolve, 0));

      // Now the full flow has completed — indicator must be hidden again
      expect(loadingEl.hasAttribute('hidden')).toBe(true);
      expect(loadingEl.getAttribute('aria-busy')).toBe('false');
    });
  });

  // ── Test 6: Limpieza del estado previo al iniciar una nueva búsqueda ──────
  // Requirement 4.6 (WeatherDisplay cleared before new search)

  describe('Limpieza del estado previo al iniciar nueva búsqueda (Requirement 4.6)', () => {
    it('borra los datos de la búsqueda anterior del Weather_Display al iniciar una nueva búsqueda', async () => {
      const { geoClient, forecastClient, cityInput, form, weatherEl } =
        buildStack();

      // First successful search
      vi.spyOn(geoClient, 'fetchGeocoding').mockResolvedValue(
        makeGeoResponse('Madrid', 40.4168, -3.7038),
      );
      vi.spyOn(forecastClient, 'fetchForecast').mockResolvedValue(
        makeForecastResponse(25.0, 40, 0.0),
      );
      await searchFor(cityInput, form, 'Madrid');
      expect(weatherEl.textContent).toContain('Madrid');

      // Second search — geocoding fails; WeatherDisplay must be cleared
      vi.spyOn(geoClient, 'fetchGeocoding').mockResolvedValue(
        makeGeoNotFoundResponse(),
      );
      await searchFor(cityInput, form, 'Atlantis');

      // Previous data from the first search must no longer be visible
      expect(weatherEl.innerHTML.trim()).toBe('');
    });

    it('borra el mensaje de error anterior al iniciar una nueva búsqueda exitosa', async () => {
      const { geoClient, forecastClient, cityInput, form, errorEl } =
        buildStack();

      // First search — geocoding fails → error message appears
      vi.spyOn(geoClient, 'fetchGeocoding').mockResolvedValue(
        makeGeoNotFoundResponse(),
      );
      await searchFor(cityInput, form, 'Atlantis');
      expect(errorEl.textContent).toBeTruthy();

      // Second search — both services succeed → error message must be cleared
      vi.spyOn(geoClient, 'fetchGeocoding').mockResolvedValue(
        makeGeoResponse('Tokyo', 35.6762, 139.6503),
      );
      vi.spyOn(forecastClient, 'fetchForecast').mockResolvedValue(
        makeForecastResponse(28.0, 65, 0.5),
      );
      await searchFor(cityInput, form, 'Tokyo');

      expect(errorEl.textContent).toBe('');
    });
  });
});
