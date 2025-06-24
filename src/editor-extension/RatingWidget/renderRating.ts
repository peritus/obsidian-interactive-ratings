import { isFullOnlySymbol } from '../../utils/isFullOnlySymbol';
import { LOGGING_ENABLED } from '../../constants';
import { RatingText } from '../../types';
import { applySymbolState } from './applySymbolState';

/**
 * Render rating with proper half-symbol display and full-only symbol support
 */
export function renderRating(
  rating: number, 
  container: HTMLElement, 
  symbolSet: any, 
  ratingText?: RatingText | null
): void {
  const symbolsContainer = container.querySelector('.interactive-rating-symbols');
  if (!symbolsContainer) return;
  
  const spans = symbolsContainer.querySelectorAll('span');
  const isFullOnly = isFullOnlySymbol(symbolSet);
  const isCommentFormat = isFullOnly && ratingText && ratingText.format === 'comment-fraction';
  
  spans.forEach((span, index) => {
    const symbolRating = index + 1;
    const halfRating = index + 0.5;
    
    if (isFullOnly) {
      // For full-only symbols: show full symbol for rated, grey for unrated
      span.textContent = symbolSet.full;
      if (symbolRating <= rating) {
        applySymbolState(span, 'rated');
      } else {
        applySymbolState(span, 'unrated');
      }
    } else {
      // Regular symbol behavior with distinct states for filled/half/empty
      if (symbolRating <= rating) {
        // Full symbol - apply 'rated' state
        span.textContent = symbolSet.full;
        applySymbolState(span, 'rated');
      } else if (symbolSet.half && halfRating <= rating && halfRating > rating - 0.5) {
        // Half symbol - apply 'half' state 
        span.textContent = symbolSet.half;
        applySymbolState(span, 'half');
      } else {
        // Empty symbol - apply 'empty' state
        span.textContent = symbolSet.empty;
        applySymbolState(span, 'empty');
      }
    }
  });
  
  // Restore original rating text (only if not HTML comment format)
  if (ratingText && !isCommentFormat) {
    const textContainer = container.querySelector('.interactive-rating-text');
    if (textContainer) {
      textContainer.textContent = ratingText.text;
    }
  }
  
  if (LOGGING_ENABLED) {
    console.debug('[InteractiveRatings] Render rating with simplified comment format support', {
      rating,
      hasHalf: !!symbolSet.half,
      isFullOnly,
      isCommentFormat,
      symbolSet: symbolSet
    });
  }
}