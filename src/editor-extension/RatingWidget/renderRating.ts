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
      // Regular symbol behavior
      if (symbolRating <= rating) {
        // Full symbol
        span.textContent = symbolSet.full;
      } else if (symbolSet.half && halfRating <= rating && halfRating > rating - 0.5) {
        // Half symbol
        span.textContent = symbolSet.half;
      } else {
        // Empty symbol
        span.textContent = symbolSet.empty;
      }
      // Apply normal state for regular symbols
      applySymbolState(span, 'normal');
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