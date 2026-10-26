/**
 * Property-based tests for src/utils/formatters.ts
 *
 * Feature: weather-forecast-app, Propiedad 11: Formateo numérico correcto de los valores del clima
 *
 * Validates: Requisito 5.3
 */

import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import {
  formatTemperature,
  formatHumidity,
  formatPrecipitation,
} from './formatters';

// Feature: weather-forecast-app, Propiedad 11: Formateo numérico correcto de los valores del clima

/**
 * Helper: counts the number of decimal digits after the decimal separator in
 * the numeric portion of a formatted weather string (everything before the
 * first space, which separates the number from the unit label).
 *
 * Returns 0 if no decimal separator is present in the numeric portion.
 *
 * @example
 *   decimalDigits("8.4 °C")   // â†’ 1
 *   decimalDigits("8.0 °C")   // â†’ 1
 *   decimalDigits("72 %")     // â†’ 0
 *   decimalDigits("0.0 mm")   // â†’ 1
 */
function decimalDigits(formatted: string): number {
  // The numeric part is everything up to the first space
  const numericPart = formatted.split(' ')[0];
  const dotIndex = numericPart.indexOf('.');
  if (dotIndex === -1) return 0;
  return numericPart.length - dotIndex - 1;
}

/**
 * Helper: returns true if the formatted string contains no decimal separator
 * in its numeric part.
 */
function hasNoDecimalPoint(formatted: string): boolean {
  const numericPart = formatted.split(' ')[0];
  return !numericPart.includes('.');
}

// ---------------------------------------------------------------------------
// Propiedad 11 â€” temperatura
// ---------------------------------------------------------------------------

describe('formatTemperature â€” Propiedad 11: máximo 1 dígito decimal', () => {
  /**
   * Property 11 (temperatura): Para cualquier valor numérico de temperatura,
   * la representación formateada en la interfaz DEBERÁ tener como máximo 1
   * dígito decimal.
   *
   * Validates: Requisito 5.3
   */
  it('Propiedad 11: para cualquier float, formatTemperature produce una cadena con como máximo 1 dígito decimal', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1e6, max: 1e6, noNaN: true, noDefaultInfinity: true }),
        (value) => {
          const formatted = formatTemperature(value);
          // The numeric portion must have at most 1 digit after the decimal point
          return decimalDigits(formatted) <= 1;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Propiedad 11 (temperatura): la cadena formateada termina con la unidad " °C"', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1e6, max: 1e6, noNaN: true, noDefaultInfinity: true }),
        (value) => {
          const formatted = formatTemperature(value);
          return formatted.endsWith(' °C');
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Propiedad 11 â€” humedad
// ---------------------------------------------------------------------------

describe('formatHumidity â€” Propiedad 11: sin dígitos decimales', () => {
  /**
   * Property 11 (humedad): Para cualquier valor numérico de humedad, la
   * representación formateada DEBERÁ ser un número entero (sin decimales).
   *
   * Validates: Requisito 5.3
   */
  it('Propiedad 11: para cualquier float, formatHumidity produce una cadena sin punto decimal', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1e6, max: 1e6, noNaN: true, noDefaultInfinity: true }),
        (value) => {
          const formatted = formatHumidity(value);
          // The numeric portion must NOT contain a decimal separator
          return hasNoDecimalPoint(formatted);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Propiedad 11 (humedad): la cadena formateada termina con la unidad " %"', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1e6, max: 1e6, noNaN: true, noDefaultInfinity: true }),
        (value) => {
          const formatted = formatHumidity(value);
          return formatted.endsWith(' %');
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Propiedad 11 â€” precipitación
// ---------------------------------------------------------------------------

describe('formatPrecipitation â€” Propiedad 11: máximo 1 dígito decimal', () => {
  /**
   * Property 11 (precipitación): Para cualquier valor numérico de
   * precipitación, la representación formateada en la interfaz DEBERÁ tener
   * como máximo 1 dígito decimal.
   *
   * Validates: Requisito 5.3
   */
  it('Propiedad 11: para cualquier float, formatPrecipitation produce una cadena con como máximo 1 dígito decimal', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1e6, max: 1e6, noNaN: true, noDefaultInfinity: true }),
        (value) => {
          const formatted = formatPrecipitation(value);
          // The numeric portion must have at most 1 digit after the decimal point
          return decimalDigits(formatted) <= 1;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Propiedad 11 (precipitación): la cadena formateada termina con la unidad " mm"', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1e6, max: 1e6, noNaN: true, noDefaultInfinity: true }),
        (value) => {
          const formatted = formatPrecipitation(value);
          return formatted.endsWith(' mm');
        }
      ),
      { numRuns: 100 }
    );
  });
});
