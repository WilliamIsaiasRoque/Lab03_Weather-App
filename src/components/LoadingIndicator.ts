/**
 * LoadingIndicator — UI component for the loading state.
 *
 * Binds to the pre-existing `#loading-indicator` element in index.html:
 *
 *   <div id="loading-indicator" aria-live="polite" aria-busy="false" hidden>
 *     <span>Cargando…</span>
 *   </div>
 *
 * Responsibilities:
 *  - show(): remove the `hidden` attribute and set `aria-busy="true"` so
 *    assistive technologies announce that content is loading.
 *  - hide(): add the `hidden` attribute and set `aria-busy="false"` to
 *    signal that the loading operation has finished.
 *
 * Requirements: 1.5, 4.5
 */

export class LoadingIndicator {
  private readonly element: HTMLElement;

  /**
   * @param elementId - ID of the indicator element in the DOM.
   *                    Defaults to "loading-indicator".
   * @throws Error if no element with the given ID exists in the document.
   */
  constructor(elementId = 'loading-indicator') {
    const el = document.getElementById(elementId);
    if (el === null) {
      throw new Error(
        `LoadingIndicator: element with id "${elementId}" not found in the DOM.`,
      );
    }
    this.element = el;
  }

  /**
   * Make the loading indicator visible and announce it to assistive
   * technologies by setting `aria-busy="true"`.
   *
   * Requirement 1.5 — show indicator while a geocoding/forecast request is
   * in progress.
   * Requirement 4.5 — indicator must be visible while a request is pending.
   */
  show(): void {
    this.element.removeAttribute('hidden');
    this.element.setAttribute('aria-busy', 'true');
  }

  /**
   * Hide the loading indicator and signal completion to assistive
   * technologies by setting `aria-busy="false"`.
   *
   * Requirement 4.5 — indicator must be hidden once a response (or error)
   * is received from the Forecast API.
   */
  hide(): void {
    this.element.setAttribute('hidden', '');
    this.element.setAttribute('aria-busy', 'false');
  }
}
