/**
 * WeatherDisplay component
 *
 * Renders weather data (city name, temperature, humidity, precipitation) inside
 * the `#weather-display` section already present in index.html.
 *
 * Responsibilities:
 *  - render(cityName, weather, fallbackCityName): populate the section with formatted values.
 *  - clear(): empty the section (called before every new search, Requirement 4.6).
 *
 * Formatting rules (Requirement 5.3):
 *  - Temperature  : value.toFixed(1) + ' °C'
 *  - Humidity     : Math.round(value) + ' %'
 *  - Precipitation: value.toFixed(1) + ' mm'
 */

import { WeatherData } from '../types/index';
import {
  formatTemperature,
  formatHumidity,
  formatPrecipitation,
} from '../utils/formatters';

export class WeatherDisplay {
  private readonly element: HTMLElement;

  /**
   * @param element - The DOM element that acts as the weather display container.
   *                  Defaults to `document.getElementById('weather-display')`.
   */
  constructor(element?: HTMLElement) {
    if (element) {
      this.element = element;
    } else {
      const el = document.getElementById('weather-display');
      if (!el) {
        throw new Error(
          'WeatherDisplay: element with id "weather-display" not found in the DOM.'
        );
      }
      this.element = el;
    }
  }

  /**
   * Renders weather information into the display section.
   *
   * @param cityName        - City name returned by the Geocoding API (may be empty).
   * @param weather         - Raw weather values (no formatting applied yet).
   * @param fallbackCityName - The name the user typed; used when `cityName` is absent or
   *                          empty (Requirement 4.7).
   */
  render(cityName: string, weather: WeatherData, fallbackCityName: string): void {
    // Requirement 4.7: fall back to the user-entered name when the API name is absent/empty.
    const displayName =
      cityName && cityName.trim().length > 0
        ? cityName
        : fallbackCityName;

    this.element.innerHTML = `
      <article class="weather-card">
        <h2 class="weather-city">${escapeHtml(displayName)}</h2>
        <ul class="weather-fields">
          <li class="weather-temperature">
            <span class="weather-label">Temperatura</span>
            <span class="weather-value">${escapeHtml(formatTemperature(weather.temperature))}</span>
          </li>
          <li class="weather-humidity">
            <span class="weather-label">Humedad</span>
            <span class="weather-value">${escapeHtml(formatHumidity(weather.humidity))}</span>
          </li>
          <li class="weather-precipitation">
            <span class="weather-label">Precipitación</span>
            <span class="weather-value">${escapeHtml(formatPrecipitation(weather.precipitation))}</span>
          </li>
        </ul>
      </article>
    `;
  }

  /**
   * Removes all content from the display section.
   * Must be called at the start of every new search (Requirement 4.6).
   */
  clear(): void {
    this.element.innerHTML = '';
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Escapes a string for safe insertion into HTML to prevent XSS.
 * Values coming from the API are treated as untrusted.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
