/**
 * Utility functions for formatting weather data values for display.
 * Values are formatted at the presentation layer; raw values are stored
 * without transformation in the domain models.
 */

/**
 * Formats a temperature value with 1 decimal place and the °C unit.
 * @example formatTemperature(8.4) → "8.4 °C"
 */
export function formatTemperature(value: number): string {
  return value.toFixed(1) + ' °C';
}

/**
 * Formats a humidity value as an integer with the % unit.
 * @example formatHumidity(72.6) → "73 %"
 */
export function formatHumidity(value: number): string {
  return Math.round(value) + ' %';
}

/**
 * Formats a precipitation value with 1 decimal place and the mm unit.
 * @example formatPrecipitation(0.0) → "0.0 mm"
 */
export function formatPrecipitation(value: number): string {
  return value.toFixed(1) + ' mm';
}
