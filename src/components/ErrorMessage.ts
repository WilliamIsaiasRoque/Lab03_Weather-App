import type { GeocodingError, ForecastError } from '../types/index.js';

/**
 * Maps a GeocodingError to the corresponding human-readable message.
 * Requisitos: 2.3, 2.4
 */
function getGeocodingErrorMessage(error: GeocodingError): string {
  switch (error.type) {
    case 'CITY_NOT_FOUND':
      return 'No se encontró la ciudad ingresada. Verifica el nombre e intenta de nuevo.';
    case 'NETWORK_ERROR':
      return 'El servicio de geocodificación no está disponible. Verifica tu conexión.';
    case 'TIMEOUT':
      return 'El servicio de geocodificación no respondió a tiempo.';
    case 'SERVICE_ERROR':
      return 'El servicio de geocodificación retornó un error.';
    case 'INVALID_RESPONSE':
      return 'Los datos recibidos del servicio de geocodificación no son válidos.';
  }
}

/**
 * Maps a ForecastError to the corresponding human-readable message.
 * Requisitos: 3.3, 3.4, 3.5
 */
function getForecastErrorMessage(error: ForecastError): string {
  switch (error.type) {
    case 'NETWORK_ERROR':
      return 'El servicio de pronóstico no está disponible. Verifica tu conexión.';
    case 'TIMEOUT':
      return 'El servicio de pronóstico no respondió a tiempo.';
    case 'SERVICE_ERROR':
      return 'El servicio de pronóstico retornó un error.';
    case 'INCOMPLETE_DATA':
      return 'Los datos meteorológicos recibidos están incompletos.';
    case 'INVALID_RESPONSE':
      return 'Los datos recibidos del servicio de pronóstico no son válidos.';
  }
}

/**
 * ErrorMessage component.
 *
 * Binds to the `#error-message` element already present in index.html:
 *   <div id="error-message" role="alert" aria-live="assertive"></div>
 *
 * Usage:
 *   const errorMessage = new ErrorMessage();
 *   errorMessage.show('El servicio de geocodificación retornó un error.');
 *   errorMessage.showGeocodingError({ type: 'TIMEOUT' });
 *   errorMessage.showForecastError({ type: 'INCOMPLETE_DATA' });
 *   errorMessage.showValidationError();
 *   errorMessage.clear();
 */
export class ErrorMessage {
  private readonly element: HTMLElement;

  constructor(selector = '#error-message') {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) {
      throw new Error(`ErrorMessage: element not found for selector "${selector}"`);
    }
    this.element = el;
  }

  // ---------------------------------------------------------------------------
  // Core display methods
  // ---------------------------------------------------------------------------

  /**
   * Renders an arbitrary message string in the error zone.
   * Requisitos: 1.3, 1.4, 1.6
   */
  show(message: string): void {
    this.element.textContent = message;
  }

  /**
   * Clears any previously displayed error message.
   */
  clear(): void {
    this.element.textContent = '';
  }

  // ---------------------------------------------------------------------------
  // Typed error helpers — delegate message selection to the mapping functions
  // ---------------------------------------------------------------------------

  /**
   * Displays the appropriate message for a GeocodingError.
   * Requisitos: 2.3, 2.4
   */
  showGeocodingError(error: GeocodingError): void {
    this.show(getGeocodingErrorMessage(error));
  }

  /**
   * Displays the appropriate message for a ForecastError.
   * Requisitos: 3.3, 3.4, 3.5
   */
  showForecastError(error: ForecastError): void {
    this.show(getForecastErrorMessage(error));
  }

  /**
   * Displays the validation error for an empty / whitespace-only city name.
   * Requisito: 1.3, 1.4
   */
  showValidationError(): void {
    this.show('El nombre de la ciudad es obligatorio.');
  }
}

// Re-export mapping helpers for testing and controller use
export { getGeocodingErrorMessage, getForecastErrorMessage };
