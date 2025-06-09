import { LOGGING_ENABLED } from './constants';

/**
 * Get the length of a string in Unicode characters
 */
export function getUnicodeCharLength(str: string): number {
  return [...str].length;
}

/**
 * Get a substring with proper Unicode character handling
 */
export function getUnicodeSubstring(str: string, start: number, end: number): string {
  return [...str].slice(start, end).join('');
}

/**
 * Convert UTF-16 byte position to Unicode character position
 */
export function utf16ToUnicodePosition(str: string, utf16Position: number): number {
  // Get the substring up to the UTF-16 position
  const utf16Substring = str.substring(0, utf16Position);
  // Return the Unicode character length of that substring
  return getUnicodeCharLength(utf16Substring);
}

/**
 * Calculate the new rating based on cursor position
 */
export function calculateNewRating(overlay: HTMLElement, clientX: number): number {
  const containerRect = overlay.getBoundingClientRect();
  const symbolCount = parseInt(overlay.dataset.symbolCount);
  const symbolWidth = containerRect.width / symbolCount;
  const relativeX = clientX - containerRect.left;
  const hoveredSymbolIndex = Math.floor(relativeX / symbolWidth);
  const positionWithinSymbol = (relativeX % symbolWidth) / symbolWidth;

  // Determine if we should use half symbol or full symbol
  const supportsHalf = overlay.dataset.supportsHalf === 'true';
  const useHalfSymbol = supportsHalf && positionWithinSymbol < 0.5;

  // Calculate rating
  let newRating = hoveredSymbolIndex + (useHalfSymbol ? 0.5 : 1);
  if (newRating < 0) {
    newRating = 0;
  }

  if (LOGGING_ENABLED) {
    console.debug(`[InteractiveRatings] Calculated new rating`, {
      clientX,
      containerRect: {
        left: containerRect.left,
        width: containerRect.width
      },
      symbolCount,
      symbolWidth,
      relativeX,
      hoveredSymbolIndex,
      positionWithinSymbol,
      supportsHalf,
      useHalfSymbol,
      newRating
    });
  }

  return newRating;
}

/**
 * Generate a string of rating symbols
 */
export function generateSymbolsString(
  rating: number, 
  symbolCount: number, 
  full: string, 
  empty: string, 
  half: string, 
  supportsHalf: boolean
): string {
  let newSymbols = '';

  for (let i = 0; i < symbolCount; i++) {
    if (i < Math.floor(rating)) {
      newSymbols += full;
    } else if (supportsHalf && i === Math.floor(rating) && rating % 1 !== 0) {
      newSymbols += half;
    } else {
      newSymbols += empty;
    }
  }

  if (LOGGING_ENABLED) {
    console.debug(`[InteractiveRatings] Generated symbols string`, {
      rating,
      symbolCount,
      full,
      empty,
      half,
      supportsHalf,
      newSymbols
    });
  };

  return newSymbols;
}

/**
 * Format the rating text based on the specified format
 */
export function formatRatingText(
  format: string, 
  newRating: number, 
  symbolCount: number, 
  denominator: number, 
  supportsHalf: boolean
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
      newNumerator,
      formattedText
    });
  };

  return formattedText;
}
