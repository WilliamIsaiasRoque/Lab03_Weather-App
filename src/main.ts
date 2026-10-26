/**
 * main.ts — Application entry point.
 *
 * Wires all layers together inside DOMContentLoaded so that every DOM element
 * referenced by the components already exists when the constructors run.
 *
 * Instantiation order:
 *  1. HTTP clients  (no DOM dependency)
 *  2. Services      (depend on clients)
 *  3. UI components (depend on DOM elements from index.html)
 *  4. Controller    (depends on services + UI components)
 *  5. Search form   (depends on DOM elements; callback forwards to controller)
 *
 * Requirements: 1.1, 1.2, 4.5
 */

import { GeocodingClient } from './clients/GeocodingClient.js';
import { ForecastClient } from './clients/ForecastClient.js';
import { GeocodingService } from './services/GeocodingService.js';
import { ForecastService } from './services/ForecastService.js';
import { LoadingIndicator } from './components/LoadingIndicator.js';
import { ErrorMessage } from './components/ErrorMessage.js';
import { WeatherDisplay } from './components/WeatherDisplay.js';
import { WeatherController } from './WeatherController.js';
import { CitySearchForm } from './components/CitySearchForm.js';

document.addEventListener('DOMContentLoaded', () => {
  // ── Step 1: HTTP clients ──────────────────────────────────────────────────
  const geoClient = new GeocodingClient();
  const forecastClient = new ForecastClient();

  // ── Step 2: Application-layer services ───────────────────────────────────
  const geocodingService = new GeocodingService({ client: geoClient });
  const forecastService = new ForecastService({ client: forecastClient });

  // ── Step 3: UI components (bind to pre-existing DOM elements) ────────────
  const loadingIndicator = new LoadingIndicator();   // #loading-indicator
  const errorMessage = new ErrorMessage();           // #error-message
  const weatherDisplay = new WeatherDisplay();       // #weather-display

  // ── Step 4: Controller ────────────────────────────────────────────────────
  const controller = new WeatherController({
    geocodingService,
    forecastService,
    weatherDisplay,
    loadingIndicator,
    errorMessage,
  });

  // ── Step 5: Search form — routes onSearch to the controller ──────────────
  // CitySearchForm validates, trims, and calls back with the cleaned city name.
  // Requirements 1.1 & 1.2: form submit (button click OR Enter key in input).
  new CitySearchForm((cityName: string) => {
    controller.handleSearch(cityName);
  });
});
