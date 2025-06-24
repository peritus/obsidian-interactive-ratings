/**
 * Apply the appropriate CSS class to a symbol based on its state
 */
export function applySymbolState(span: HTMLElement, state: 'rated' | 'unrated' | 'normal' | 'empty'): void {
  // Remove all state classes
  span.classList.remove('interactive-rating-symbol--rated', 'interactive-rating-symbol--unrated', 'interactive-rating-symbol--normal', 'interactive-rating-symbol--empty');
  
  // Add the appropriate state class
  span.classList.add(`interactive-rating-symbol--${state}`);
}