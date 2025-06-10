import { LOGGING_ENABLED } from '../constants';

/**
 * Format the rating text based on the specified format, including simplified HTML comments
 */
export function formatRatingText(
  format: string, 
  newRating: number, 
  symbolCount: number, 
  denominator: number, 
  supportsHalf: boolean,
  isFullOnlySymbol: boolean = false
): string {
  let newNumerator;
  if (format.includes('percent')) {
    newNumerator = Math.round((newRating / symbolCount) * 100);
  } else {
    newNumerator = newRating;
    if (!supportsHalf) {
      newNumerator = Math.round(newNumerator);
    }
  }

  // For full-only symbols with HTML comment format, remove comment if perfect rating
  if (isFullOnlySymbol && format === 'comment-fraction' && newNumerator === denominator) {
    return ''; // Remove HTML comment for perfect ratings
  }

  // Format the text based on the original format
  let formattedText = '';
  switch (format) {
    case 'fraction':
      formattedText = ` ${newNumerator}/${denominator}`;
      break;
    case 'fraction-parentheses':
      formattedText = ` (${newNumerator}/${denominator})`;
      break;
    case 'percent':
      formattedText = ` ${newNumerator}%`;
      break;
    case 'percent-parentheses':
      formattedText = ` (${newNumerator}%)`;
      break;
    // Simplified HTML comment format (only basic fraction)
    case 'comment-fraction':
      formattedText = `<!-- ${newNumerator}/${denominator} -->`;
      break;
    default:
      formattedText = '';
  }

  if (LOGGING_ENABLED) {
    console.debug(`[InteractiveRatings] Formatted rating text`, {
      format,
      newRating,
      symbolCount,
      denominator,
      supportsHalf,
      isFullOnlySymbol,
      newNumerator,
      formattedText,
      isComment: format.startsWith('comment-'),
      isPerfectRating: newNumerator === denominator,
      removedComment: isFullOnlySymbol && format === 'comment-fraction' && newNumerator === denominator
    });
  };

  return formattedText;
}