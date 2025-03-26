import { InteractiveRatingsPlugin } from './InteractiveRatingsPlugin';

// Global logging control
export const LOGGING_ENABLED = true;

export function getUnicodeCharLength(str) {
  return [...str].length;
}

export function getUnicodeSubstring(str, start, end) {
  return [...str].slice(start, end).join('');
}

// Extract rating calculation from the click handler
export function calculateNewRating(overlay, clientX) {
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

// Extract the function to generate new symbol string
export function generateSymbolsString(rating, symbolCount, full, empty, half, supportsHalf) {
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

// Extract the function to format rating text
export function formatRatingText(format, newRating, symbolCount, denominator, supportsHalf: boolean) {
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

// Define symbol patterns as a global constant
export const SYMBOL_PATTERNS = [
  { full: '★', empty: '☆', half: null },    // Symbols
  { full: '●', empty: '○', half: '◐' },     // Circles
  { full: '■', empty: '□', half: '◧' },     // Squares
  { full: '▲', empty: '△', half: null },    // Triangles (no half)

  // Progress bar patterns
  { full: '█', empty: '▁', half: null  },   // Block progress
  { full: '⣿', empty: '⣀', half: '⡇' },     // Braille dots
  { full: '⬤', empty: '○', half: null },   // Solid/empty circles
  { full: '■', empty: '□', half: null },    // Solid/empty squares
  { full: '▰', empty: '▱', half: null },    // Dotted squares
  { full: '◼', empty: '▭', half: null },    // Filled/empty rectangles
  { full: '▮', empty: '▯', half: null },    // Vertical bars
  { full: '⬤', empty: '◯', half: null },   // Bold circles
  { full: '⚫', empty: '⚪', half: null },   // Black/white circles
  { full: '█', empty: '░', half: null },    // Block/light shade
];

module.exports = InteractiveRatingsPlugin;