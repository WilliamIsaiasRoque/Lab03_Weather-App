/**
 * WeatherController — Application-layer orchestrator.
 *
 * Coordinates the full search flow:
 *  1. Clear prior state (WeatherDisplay + ErrorMessage).
 *  2. Show the LoadingIndicator.
 *  3. Call GeocodingService.geocode(cityName).
 *  4. On geocoding failure → show typed error, hide LoadingIndicator, return.
 *  5. Call ForecastService.getForecast(lat, lon).
 *  6. Hide the LoadingIndicator (success or failure).
 *  7. On forecast failure → show typed error, return.
 *  8. On success → render WeatherDisplay.
 *
 * The controller is intentionally decoupled from CitySearchForm: it only
 * exposes `handleSearch(cityName)` which the form calls via its onSearch
 * callback (wired up in main.ts, task 11).
 *
 * City_Input accessibility: the controller never disables City_Input — the
 * form component keeps it enabled at all times, satisfying Requirement 1.6.
 *
 * Requirements: 1.5, 1.6, 2.1–2.4, 2.6, 3.1–3.5, 4.1–4.6
 */

import { GeocodingService } from './services/GeocodingService.js';
import { ForecastService } from './services/ForecastService.js';
import { WeatherDisplay } from './components/WeatherDisplay.js';
import { LoadingIndicator } from './components/LoadingIndicator.js';
import { ErrorMessage } from './components/ErrorMessage.js';

// ---------------------------------------------------------------------------
// Dependency-injection interface
// ---------------------------------------------------------------------------

export interface WeatherControllerDeps {
  geocodingService: GeocodingService;
  forecastService: ForecastService;
  weatherDisplay: WeatherDisplay;
  loadingIndicator: LoadingIndicator;
  errorMessage: ErrorMessage;
}

// ---------------------------------------------------------------------------
// WeatherController
// ---------------------------------------------------------------------------

export class WeatherController {
  private readonly geocodingService: GeocodingService;
  private readonly forecastService: ForecastService;
  private readonly weatherDisplay: WeatherDisplay;
  private readonly loadingIndicator: LoadingIndicator;
  private readonly errorMessage: ErrorMessage;

  /**
   * All collaborators are injected to keep the controller fully testable
   * without touching the DOM or the network.
   */
  constructor(deps: WeatherControllerDeps) {
    this.geocodingService = deps.geocodingService;
    this.forecastService = deps.forecastService;
    this.weatherDisplay = deps.weatherDisplay;
    this.loadingIndicator = deps.loadingIndicator;
    this.errorMessage = deps.errorMessage;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Execute the full weather-search flow for `cityName`.
   *
   * @param cityName The already-trimmed city name supplied by CitySearchForm.
   *
   * Flow:
   *  1. Clear WeatherDisplay and ErrorMessage (Requirement 4.6).
   *  2. Show LoadingIndicator (Requirement 1.5, 4.5).
   *  3. Geocode the city name.
   *  4. If geocoding fails → show typed geocoding error, hide indicator, return.
   *  5. Fetch the weather forecast using the resolved coordinates.
   *  6. Hide LoadingIndicator regardless of forecast outcome (Requirement 4.5).
   *  7. If forecast fails → show typed forecast error, return.
   *  8. Render the WeatherDisplay with the resolved data (Requirements 4.1–4.4).
   *     The user-typed `cityName` is passed as `fallbackCityName` (Requirement 4.7).
   */
  async handleSearch(cityName: string): Promise<void> {
    // ── Step 1: Clear prior state ────────────────────────────────────────────
    this.errorMessage.clear();
    this.weatherDisplay.clear();

    // ── Step 2: Show loading indicator ──────────────────────────────────────
    this.loadingIndicator.show();

    // ── Step 3: Geocoding ────────────────────────────────────────────────────
    const geoResult = await this.geocodingService.geocode(cityName);

    // ── Step 4: Geocoding failure ────────────────────────────────────────────
    if (!geoResult.success) {
      this.errorMessage.showGeocodingError(geoResult.error);
      this.loadingIndicator.hide();
      // City_Input remains accessible — the form component never disables it
      // (Requirement 1.6).
      return;
    }

    const { latitude, longitude, cityName: resolvedCityName } = geoResult.data;

    // ── Step 5: Forecast ─────────────────────────────────────────────────────
    const forecastResult = await this.forecastService.getForecast(
      latitude,
      longitude,
    );

    // ── Step 6: Hide loading indicator (always) ──────────────────────────────
    this.loadingIndicator.hide();

    // ── Step 7: Forecast failure ─────────────────────────────────────────────
    if (!forecastResult.success) {
      this.errorMessage.showForecastError(forecastResult.error);
      // City_Input remains accessible (Requirement 1.6).
      return;
    }

    // ── Step 8: Render weather data ──────────────────────────────────────────
    // `resolvedCityName` is what the Geocoding API returned.
    // `cityName`         is what the user typed (fallback per Requirement 4.7).
    this.weatherDisplay.render(resolvedCityName, forecastResult.data, cityName);
  }
}
