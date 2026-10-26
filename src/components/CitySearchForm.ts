/**
 * CitySearchForm — Presentation-layer component for city name input.
 *
 * Responsibilities:
 *  - Bind to the existing DOM elements rendered in index.html.
 *  - Validate the input (empty / whitespace-only) before emitting a search.
 *  - Trim the city name and invoke onSearch(trimmedValue) only when valid.
 *  - Display an inline validation message when the input is invalid.
 *  - Keep City_Input always enabled/accessible (never disabled).
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 *
 * Design notes:
 *  - The component does NOT re-render HTML; it attaches event listeners to
 *    elements that already exist in the DOM.
 *  - onSearch is the only coupling point with the controller layer.
 */

/** Callback invoked with the trimmed city name when the form is submitted validly. */
export type OnSearchCallback = (cityName: string) => void;

export class CitySearchForm {
  private readonly form: HTMLFormElement;
  private readonly input: HTMLInputElement;
  private readonly validationSpan: HTMLElement;

  // -------------------------------------------------------------------------
  // Constructor
  // -------------------------------------------------------------------------

  /**
   * Bind to the existing DOM elements and register event listeners.
   *
   * @param onSearch Callback invoked with the trimmed city name on valid submit.
   * @param doc      Document to query — defaults to `document`. Injected in
   *                 tests to allow using a JSDOM document.
   */
  constructor(onSearch: OnSearchCallback, doc: Document = document) {
    const form = doc.getElementById('city-search-form');
    const input = doc.getElementById('city-input');
    const validationSpan = doc.getElementById('validation-message');

    if (!(form instanceof HTMLFormElement)) {
      throw new Error('CitySearchForm: #city-search-form not found or is not a <form>.');
    }
    if (!(input instanceof HTMLInputElement)) {
      throw new Error('CitySearchForm: #city-input not found or is not an <input>.');
    }
    if (!validationSpan) {
      throw new Error('CitySearchForm: #validation-message not found.');
    }

    this.form = form;
    this.input = input;
    this.validationSpan = validationSpan;

    this.attachListeners(onSearch);
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Clear any currently displayed validation message.
   * Called externally (e.g., by the controller) when starting a new search.
   */
  clearValidation(): void {
    this.validationSpan.textContent = '';
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Register event listeners on the form and input elements.
   *
   * - `submit` on the form handles both the button click and Enter-key
   *   press while the input or button has focus (browsers fire `submit`
   *   for both scenarios automatically when the button type is "submit").
   * - `keydown` on the input is added as an explicit guard for environments
   *   or configurations where the Enter key may not trigger `submit`.
   */
  private attachListeners(onSearch: OnSearchCallback): void {
    // Primary path: standard form submission (button click OR Enter key).
    this.form.addEventListener('submit', (event: Event) => {
      event.preventDefault();
      this.handleSubmit(onSearch);
    });

    // Secondary / belt-and-suspenders: explicit Enter key on City_Input.
    // Requirements 1.2: "cuando el User presione la tecla Enter mientras
    // City_Input esté enfocado".
    this.input.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.handleSubmit(onSearch);
      }
    });
  }

  /**
   * Validate the current input value and either show an error or invoke
   * `onSearch` with the trimmed value.
   *
   * Requirements:
   *  - 1.3 / 1.4: Empty or whitespace-only → show validation message.
   *  - 1.5: Non-empty → trim and invoke onSearch.
   */
  private handleSubmit(onSearch: OnSearchCallback): void {
    const raw = this.input.value;
    const trimmed = raw.trim();

    if (trimmed.length === 0) {
      // Requirements 1.3 & 1.4 — show inline validation message.
      this.showValidationMessage('El nombre de la ciudad es obligatorio.');
      // City_Input stays enabled (Requirement 1.6 / design note).
      this.input.focus();
      return;
    }

    // Valid input: clear any previous validation message and emit the search.
    this.clearValidation();
    onSearch(trimmed);
  }

  /**
   * Display a validation message in the `#validation-message` span.
   * The span has `role="alert"` and `aria-live="polite"` in the HTML, so
   * assistive technologies will announce the message automatically.
   */
  private showValidationMessage(message: string): void {
    this.validationSpan.textContent = message;
  }
}
