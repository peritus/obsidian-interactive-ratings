/**
 * Apply the appropriate CSS class to a symbol based on its state
 */
export function applySymbolState(span: HTMLElement, state: 'rated' | 'unrated' | 'normal' | 'empty' | 'half'): void {
  // Remove all state classes
  span.classList.remove('interactive-rating-symbol--rated', 'interactive-rating-symbol--unrated', 'interactive-rating-symbol--normal', 'interactive-rating-symbol--empty', 'interactive-rating-symbol--half');
  
  // Add the appropriate state class
  span.classList.add(`interactive-rating-symbol--${state}`);
}