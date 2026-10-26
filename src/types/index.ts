// Domain types and interfaces for weather-forecast-app

// ---------------------------------------------------------------------------
// Core domain models
// ---------------------------------------------------------------------------

/**
 * Geographic coordinates returned by the Geocoding API and used to query
 * the Forecast API.
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
  /** City name as returned by the Geocoding API. */
  cityName: string;
}

/**
 * Meteorological data returned by the Forecast API.
 * Values are stored raw (no formatting applied) — formatting is done at
 * the presentation layer.
 */
export interface WeatherData {
  /** temperature_2m in °C (raw value). */
  temperature: number;
  /** relative_humidity_2m in % (raw value). */
  humidity: number;
  /** precipitation in mm (raw value). */
  precipitation: number;
}

// ---------------------------------------------------------------------------
// Application state
// ---------------------------------------------------------------------------

export type AppState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; cityName: string; weather: WeatherData }
  | { status: 'error'; message: string };

// ---------------------------------------------------------------------------
// Geocoding service — discriminated union results
// ---------------------------------------------------------------------------

export type GeocodingError =
  | { type: 'CITY_NOT_FOUND' }
  | { type: 'NETWORK_ERROR' }
  | { type: 'TIMEOUT' }
  | { type: 'SERVICE_ERROR'; statusCode: number }
  | { type: 'INVALID_RESPONSE' };

export type GeocodingResult =
  | { success: true; data: Coordinates }
  | { success: false; error: GeocodingError };

// ---------------------------------------------------------------------------
// Forecast service — discriminated union results
// ---------------------------------------------------------------------------

export type ForecastError =
  | { type: 'NETWORK_ERROR' }
  | { type: 'TIMEOUT' }
  | { type: 'SERVICE_ERROR'; statusCode: number }
  | { type: 'INCOMPLETE_DATA' }
  | { type: 'INVALID_RESPONSE' };

export type ForecastResult =
  | { success: true; data: WeatherData }
  | { success: false; error: ForecastError };
