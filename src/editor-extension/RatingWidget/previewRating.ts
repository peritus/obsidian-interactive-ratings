import { formatRatingText } from '../../utils/formatRatingText';
import { getUnicodeCharLength } from '../../utils/getUnicodeCharLength';
import { isFullOnlySymbol } from '../../utils/isFullOnlySymbol';
import { LOGGING_ENABLED } from '../../constants';
import { RatingText } from '../../types';
import { applySymbolState } from './applySymbolState';

/**
 * Preview rating with proper half-symbol rendering and full-only symbol support
 */
export function previewRating(
  newRating: number, 
  container: HTMLElement, 
  symbolSet: any, 
  pattern: string, 
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
      if (symbolRating <= newRating) {
        applySymbolState(span, 'rated');
      } else {
        applySymbolState(span, 'unrated');
      }
    } else {
      // Regular symbol behavior with distinct states for filled/half/empty
      if (symbolRating <= newRating) {
        // Full symbol - apply 'rated' state
        span.textContent = symbolSet.full;
        applySymbolState(span, 'rated');
      } else if (symbolSet.half && halfRating <= newRating && halfRating > newRating - 0.5) {
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
  
  // Preview rating text if it exists and is not HTML comment format
  if (ratingText && !isCommentFormat) {
    const textContainer = container.querySelector('.interactive-rating-text');
    if (textContainer) {
      const unicodeLength = getUnicodeCharLength(pattern);
      const previewText = formatRatingText(
        ratingText.format,
        newRating,
        unicodeLength, // Always use actual pattern length for percentage calculations
        ratingText.denominator, // Use original denominator for fraction displays
        !!symbolSet.half && !isFullOnly,
        isFullOnly
      );
      textContainer.textContent = previewText;
    }
  }
  
  if (LOGGING_ENABLED) {
    console.debug('[InteractiveRatings] Preview rating with simplified comment format support', {
      newRating,
      hasHalf: !!symbolSet.half,
      isFullOnly,
      isCommentFormat,
      symbolSet: symbolSet,
      denominator: ratingText?.denominator
    });
  }
}