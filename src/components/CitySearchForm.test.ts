/**
 * Tests for CitySearchForm
 *
 * Unit tests cover Requirements: 1.1, 1.2, 1.6
 * Property-based tests cover Requirements: 1.3, 1.4, 1.5, 2.5 (Properties 1, 2)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { CitySearchForm } from './CitySearchForm.js';

// ---------------------------------------------------------------------------
// DOM fixture helpers
// ---------------------------------------------------------------------------

function createFixture(doc: Document = document) {
  doc.body.innerHTML = `
    <form id="city-search-form">
      <input id="city-input" type="text" maxlength="100" />
      <button type="submit">Buscar</button>
      <span id="validation-message"></span>
    </form>
  `;
  const form = doc.getElementById('city-search-form') as HTMLFormElement;
  const input = doc.getElementById('city-input') as HTMLInputElement;
  const button = form.querySelector('button[type="submit"]') as HTMLButtonElement;
  const validationSpan = doc.getElementById('validation-message') as HTMLElement;
  return { form, input, button, validationSpan };
}

function buildDoc(): Document {
  const doc = document.implementation.createHTMLDocument('test');
  doc.body.innerHTML = `
    <form id="city-search-form">
      <input id="city-input" type="text" maxlength="100" />
      <button type="submit">Buscar</button>
      <span id="validation-message" role="alert" aria-live="polite"></span>
    </form>
  `;
  return doc;
}

// ---------------------------------------------------------------------------
// Requirement 1.1
// ---------------------------------------------------------------------------

describe('CitySearchForm â€“ Req 1.1: renderizado del campo City_Input con maxlength=100', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('el elemento #city-input existe en el DOM y tiene maxlength="100"', () => {
    const { input } = createFixture();
    expect(input).not.toBeNull();
    expect(input.getAttribute('maxlength')).toBe('100');
  });

  it('CitySearchForm se instancia sin errores cuando la estructura DOM es correcta', () => {
    createFixture();
    expect(() => new CitySearchForm(vi.fn())).not.toThrow();
  });

  it('CitySearchForm lanza error si #city-input no está presente', () => {
    document.body.innerHTML = `<form id="city-search-form"><button type="submit">Buscar</button><span id="validation-message"></span></form>`;
    expect(() => new CitySearchForm(vi.fn())).toThrow('CitySearchForm: #city-input not found or is not an <input>.');
  });

  it('CitySearchForm lanza error si #city-search-form no está presente', () => {
    document.body.innerHTML = `<input id="city-input" maxlength="100" /><span id="validation-message"></span>`;
    expect(() => new CitySearchForm(vi.fn())).toThrow('CitySearchForm: #city-search-form not found or is not a <form>.');
  });
});

// ---------------------------------------------------------------------------
// Requirement 1.2 â€” button click
// ---------------------------------------------------------------------------

describe('CitySearchForm â€“ Req 1.2: envío con clic en el botón de envío', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('onSearch se invoca con el valor del input al hacer clic en el botón (valor válido)', () => {
    const { input, button } = createFixture();
    const onSearch = vi.fn();
    new CitySearchForm(onSearch);
    input.value = 'Madrid';
    button.click();
    expect(onSearch).toHaveBeenCalledOnce();
    expect(onSearch).toHaveBeenCalledWith('Madrid');
  });

  it('onSearch se invoca con el valor recortado (con espacios al inicio y al final)', () => {
    const { input, button } = createFixture();
    const onSearch = vi.fn();
    new CitySearchForm(onSearch);
    input.value = '  Buenos Aires  ';
    button.click();
    expect(onSearch).toHaveBeenCalledOnce();
    expect(onSearch).toHaveBeenCalledWith('Buenos Aires');
  });

  it('onSearch NO se invoca cuando el input está vacío al hacer clic en el botón', () => {
    const { input, button } = createFixture();
    const onSearch = vi.fn();
    new CitySearchForm(onSearch);
    input.value = '';
    button.click();
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('onSearch NO se invoca cuando el input contiene solo whitespace al hacer clic', () => {
    const { input, button } = createFixture();
    const onSearch = vi.fn();
    new CitySearchForm(onSearch);
    input.value = '   ';
    button.click();
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('se muestra un mensaje de validación cuando el input está vacío al hacer clic', () => {
    const { input, button, validationSpan } = createFixture();
    const onSearch = vi.fn();
    new CitySearchForm(onSearch);
    input.value = '';
    button.click();
    expect(validationSpan.textContent).not.toBe('');
  });
});

// ---------------------------------------------------------------------------
// Requirement 1.2 â€” Enter key
// ---------------------------------------------------------------------------

describe('CitySearchForm â€“ Req 1.2: envío con tecla Enter mientras City_Input está enfocado', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('onSearch se invoca con el valor del input al presionar Enter en City_Input', () => {
    const { input } = createFixture();
    const onSearch = vi.fn();
    new CitySearchForm(onSearch);
    input.value = 'Tokyo';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onSearch).toHaveBeenCalledOnce();
    expect(onSearch).toHaveBeenCalledWith('Tokyo');
  });

  it('onSearch se invoca con valor recortado al presionar Enter', () => {
    const { input } = createFixture();
    const onSearch = vi.fn();
    new CitySearchForm(onSearch);
    input.value = '  Paris  ';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onSearch).toHaveBeenCalledOnce();
    expect(onSearch).toHaveBeenCalledWith('Paris');
  });

  it('onSearch NO se invoca al presionar Enter con input vacío', () => {
    const { input } = createFixture();
    const onSearch = vi.fn();
    new CitySearchForm(onSearch);
    input.value = '';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('onSearch NO se invoca al presionar Enter con input de solo whitespace', () => {
    const { input } = createFixture();
    const onSearch = vi.fn();
    new CitySearchForm(onSearch);
    input.value = '\t\n  ';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('otras teclas (ej. "a") NO disparan onSearch', () => {
    const { input } = createFixture();
    const onSearch = vi.fn();
    new CitySearchForm(onSearch);
    input.value = 'Berlin';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('se muestra mensaje de validación al presionar Enter con input vacío', () => {
    const { input, validationSpan } = createFixture();
    const onSearch = vi.fn();
    new CitySearchForm(onSearch);
    input.value = '';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(validationSpan.textContent).not.toBe('');
  });
});

// ---------------------------------------------------------------------------
// Requirement 1.6
// ---------------------------------------------------------------------------

describe('CitySearchForm â€“ Req 1.6: City_Input permanece accesible después de un error', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('City_Input NO está deshabilitado después de envío inválido por clic en botón', () => {
    const { input, button } = createFixture();
    new CitySearchForm(vi.fn());
    input.value = '';
    button.click();
    expect(input.disabled).toBe(false);
  });

  it('City_Input NO está deshabilitado después de envío inválido por Enter', () => {
    const { input } = createFixture();
    new CitySearchForm(vi.fn());
    input.value = '   ';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(input.disabled).toBe(false);
  });

  it('City_Input NO está deshabilitado después de un envío válido', () => {
    const { input, button } = createFixture();
    new CitySearchForm(vi.fn());
    input.value = 'Lima';
    button.click();
    expect(input.disabled).toBe(false);
  });

  it('clearValidation limpia el mensaje de validación previo', () => {
    const { input, button, validationSpan } = createFixture();
    const form = new CitySearchForm(vi.fn());
    input.value = '';
    button.click();
    expect(validationSpan.textContent).not.toBe('');
    form.clearValidation();
    expect(validationSpan.textContent).toBe('');
  });

  it('multiple envíos inválidos consecutivos no deshabilitan City_Input', () => {
    const { input, button } = createFixture();
    new CitySearchForm(vi.fn());
    for (let i = 0; i < 3; i++) { input.value = ''; button.click(); }
    expect(input.disabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Propiedad 1: Rechazo de entradas de solo whitespace
// Feature: weather-forecast-app, Propiedad 1: Rechazo de entradas de solo whitespace
// Validates: Requisitos 1.3, 1.4, 2.5
// ---------------------------------------------------------------------------

describe('CitySearchForm â€” Propiedad 1: Rechazo de entradas de solo whitespace', () => {
  it('onSearch NO se invoca para cualquier string de solo whitespace (submit via form)', () => {
    fc.assert(
      fc.property(
        fc.string({ unit: fc.constantFrom(' ', '\t', '\n', '\r') }),
        (wsString) => {
          const doc = buildDoc();
          const form = doc.getElementById('city-search-form') as HTMLFormElement;
          const input = doc.getElementById('city-input') as HTMLInputElement;
          const onSearch = vi.fn();
          new CitySearchForm(onSearch, doc);
          input.value = wsString;
          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          expect(onSearch).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('se muestra el mensaje de validación para cualquier string de solo whitespace', () => {
    fc.assert(
      fc.property(
        fc.string({ unit: fc.constantFrom(' ', '\t', '\n', '\r') }),
        (wsString) => {
          const doc = buildDoc();
          const form = doc.getElementById('city-search-form') as HTMLFormElement;
          const input = doc.getElementById('city-input') as HTMLInputElement;
          const validationSpan = doc.getElementById('validation-message') as HTMLElement;
          const onSearch = vi.fn();
          new CitySearchForm(onSearch, doc);
          input.value = wsString;
          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          expect(validationSpan.textContent).not.toBe('');
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Propiedad 2: Trim del nombre de ciudad antes de enviar
// Feature: weather-forecast-app, Propiedad 2: Trim del nombre de ciudad antes de enviar
// Validates: Requisito 1.5
// ---------------------------------------------------------------------------

describe('CitySearchForm â€” Propiedad 2: Trim del nombre de ciudad antes de enviar', () => {
  it('onSearch recibe el valor trimmed para cualquier string con whitespace en los extremos', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.string({ unit: fc.constantFrom(' ', '\t') }),
          fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
          fc.string({ unit: fc.constantFrom(' ', '\t') }),
        ),
        ([prefix, core, suffix]) => {
          const rawValue = prefix + core + suffix;
          const doc = buildDoc();
          const form = doc.getElementById('city-search-form') as HTMLFormElement;
          const input = doc.getElementById('city-input') as HTMLInputElement;
          const onSearch = vi.fn();
          new CitySearchForm(onSearch, doc);
          input.value = rawValue;
          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          expect(onSearch).toHaveBeenCalledTimes(1);
          const received: string = (onSearch.mock.calls[0] as [string])[0];
          expect(received).toBe(rawValue.trim());
        }
      ),
      { numRuns: 100 }
    );
  });
});
