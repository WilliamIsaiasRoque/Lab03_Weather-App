/**
 * Property-based and unit tests for src/components/WeatherDisplay.ts
 *
 * Feature: weather-forecast-app, Propiedad 12: Weather_Display contiene todos los campos con sus unidades
 *
 * Validates: Requisitos 4.1, 4.2, 4.3, 4.4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { WeatherDisplay } from './WeatherDisplay';
import type { WeatherData } from '../types/index';

// Feature: weather-forecast-app, Propiedad 12: Weather_Display contiene todos los campos con sus unidades

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a fresh container div and a WeatherDisplay bound to it.
 * Using an explicit element avoids needing a full DOM with #weather-display.
 */
function makeDisplay(): { container: HTMLElement; display: WeatherDisplay } {
  const container = document.createElement('div');
  const display = new WeatherDisplay(container);
  return { container, display };
}

/**
 * Collect all text visible inside the container by reading textContent of
 * every element. This avoids issues with HTML-escaped characters while still
 * verifying what the user actually sees.
 */
function getTextContent(container: HTMLElement): string {
  return container.textContent ?? '';
}

// ---------------------------------------------------------------------------
// Propiedad 12 â€” Weather_Display contiene todos los campos con sus unidades
// ---------------------------------------------------------------------------

describe('WeatherDisplay â€” Propiedad 12: el display contiene todos los campos con sus unidades', () => {
  /**
   * Property 12: Weather_Display contiene todos los campos con sus unidades
   *
   * Para cualquier objeto WeatherData válido, el Weather_Display renderizado
   * DEBERÁ contener: el nombre de la ciudad, el valor de temperatura seguido
   * de "°C", el valor de humedad seguido de "%", y el valor de precipitación
   * seguido de "mm".
   *
   * Validates: Requisitos 4.1, 4.2, 4.3, 4.4
   */
  it('Propiedad 12: para cualquier WeatherData, el display contiene "°C", "%" y "mm" después de renderizar', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary WeatherData with finite floats so that
        // toFixed/Math.round produce well-defined, non-"NaN" strings.
        fc.record<WeatherData>({
          temperature: fc.float({ noNaN: true, noDefaultInfinity: true }),
          humidity: fc.float({ noNaN: true, noDefaultInfinity: true }),
          precipitation: fc.float({ noNaN: true, noDefaultInfinity: true }),
        }),
        // Generate a non-empty city name (arbitrary printable string)
        fc.string({ minLength: 1 }),
        (weather, cityName) => {
          const { container, display } = makeDisplay();
          display.render(cityName, weather, cityName);

          const text = getTextContent(container);

          // Requirement 4.2 â€” temperature unit present
          const hasTemperatureUnit = text.includes('°C');

          // Requirement 4.3 â€” humidity unit present
          const hasHumidityUnit = text.includes('%');

          // Requirement 4.4 â€” precipitation unit present
          const hasPrecipitationUnit = text.includes('mm');

          return hasTemperatureUnit && hasHumidityUnit && hasPrecipitationUnit;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Propiedad 12: para cualquier WeatherData, la ciudad ingresada aparece en el display', () => {
    fc.assert(
      fc.property(
        fc.record<WeatherData>({
          temperature: fc.float({ noNaN: true, noDefaultInfinity: true }),
          humidity: fc.float({ noNaN: true, noDefaultInfinity: true }),
          precipitation: fc.float({ noNaN: true, noDefaultInfinity: true }),
        }),
        // City names without HTML special chars so textContent comparison is direct.
        fc.string({ minLength: 1 }).filter((s) => !/[<>&"']/.test(s)),
        (weather, cityName) => {
          const { container, display } = makeDisplay();
          display.render(cityName, weather, cityName);

          const text = getTextContent(container);

          // Requirement 4.1 â€” city name is present
          return text.includes(cityName);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Unit tests â€” WeatherDisplay specific scenarios
// ---------------------------------------------------------------------------

describe('WeatherDisplay â€” pruebas unitarias', () => {
  let container: HTMLElement;
  let display: WeatherDisplay;

  beforeEach(() => {
    ({ container, display } = makeDisplay());
  });

  const sampleWeather: WeatherData = {
    temperature: 22.5,
    humidity: 60,
    precipitation: 0.2,
  };

  // -------------------------------------------------------------------------
  // Requirement 4.1 â€” city name rendered
  // -------------------------------------------------------------------------
  it('renderiza el nombre de la ciudad (Req. 4.1)', () => {
    display.render('Madrid', sampleWeather, 'madrid');
    expect(container.textContent).toContain('Madrid');
  });

  // -------------------------------------------------------------------------
  // Requirement 4.2 â€” temperature value and °C unit
  // -------------------------------------------------------------------------
  it('renderiza la temperatura con la unidad °C (Req. 4.2)', () => {
    display.render('Madrid', sampleWeather, 'madrid');
    expect(container.textContent).toContain('°C');
    // The formatted temperature for 22.5 is "22.5 °C"
    expect(container.textContent).toContain('22.5');
  });

  // -------------------------------------------------------------------------
  // Requirement 4.3 â€” humidity value and % unit
  // -------------------------------------------------------------------------
  it('renderiza la humedad con la unidad % (Req. 4.3)', () => {
    display.render('Madrid', sampleWeather, 'madrid');
    expect(container.textContent).toContain('%');
    // The formatted humidity for 60 is "60 %"
    expect(container.textContent).toContain('60');
  });

  // -------------------------------------------------------------------------
  // Requirement 4.4 â€” precipitation value and mm unit
  // -------------------------------------------------------------------------
  it('renderiza la precipitación con la unidad mm (Req. 4.4)', () => {
    display.render('Madrid', sampleWeather, 'madrid');
    expect(container.textContent).toContain('mm');
    // The formatted precipitation for 0.2 is "0.2 mm"
    expect(container.textContent).toContain('0.2');
  });

  // -------------------------------------------------------------------------
  // Fallback city name â€” when cityName is empty, use fallbackCityName
  // -------------------------------------------------------------------------
  it('usa el fallbackCityName cuando cityName está vacío', () => {
    display.render('', sampleWeather, 'Berlin (fallback)');
    expect(container.textContent).toContain('Berlin (fallback)');
  });

  it('usa el fallbackCityName cuando cityName es solo whitespace', () => {
    display.render('   ', sampleWeather, 'Tokio');
    expect(container.textContent).toContain('Tokio');
  });

  it('usa el cityName de la API cuando no está vacío, ignorando el fallback', () => {
    display.render('Paris', sampleWeather, 'paris');
    expect(container.textContent).toContain('Paris');
    // The API name wins; fallback should NOT appear when cityName is present
    expect(container.textContent).not.toContain('paris');
  });

  // -------------------------------------------------------------------------
  // clear() â€” empties the container (Requirement 4.6)
  // -------------------------------------------------------------------------
  it('clear() vacía el contenido del display (Req. 4.6)', () => {
    display.render('Madrid', sampleWeather, 'madrid');
    expect(container.innerHTML).not.toBe('');

    display.clear();
    expect(container.innerHTML).toBe('');
  });

  // -------------------------------------------------------------------------
  // Humidity formatting â€” rounded to integer
  // -------------------------------------------------------------------------
  it('redondea la humedad al entero más cercano (sin decimales)', () => {
    display.render('Rome', { temperature: 15, humidity: 72.7, precipitation: 0 }, 'Rome');
    const text = container.textContent ?? '';
    // Math.round(72.7) = 73
    expect(text).toContain('73');
    expect(text).not.toContain('72.7');
  });

  // -------------------------------------------------------------------------
  // Temperature formatting â€” exactly 1 decimal place
  // -------------------------------------------------------------------------
  it('muestra la temperatura con exactamente 1 decimal (toFixed(1))', () => {
    display.render('Oslo', { temperature: 5, humidity: 80, precipitation: 1 }, 'Oslo');
    const text = container.textContent ?? '';
    // 5.toFixed(1) === "5.0"
    expect(text).toContain('5.0');
  });

  // -------------------------------------------------------------------------
  // Precipitation formatting â€” exactly 1 decimal place
  // -------------------------------------------------------------------------
  it('muestra la precipitación con exactamente 1 decimal (toFixed(1))', () => {
    display.render('Lima', { temperature: 20, humidity: 90, precipitation: 3 }, 'Lima');
    const text = container.textContent ?? '';
    // 3.toFixed(1) === "3.0"
    expect(text).toContain('3.0');
  });
});
