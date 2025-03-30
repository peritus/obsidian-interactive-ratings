import { LOGGING_ENABLED, SYMBOL_PATTERNS } from './constants';
import { RatingText, SymbolSet } from './types';
import { getUnicodeCharLength, getUnicodeSubstring } from './utils';

/**
 * Parse rating text from a line
 */
export function parseRatingText(line: string, start: number, end: number): RatingText | null {
  // Get the substring after the symbols using Unicode-aware functions
  const afterSymbols = getUnicodeSubstring(line, end, getUnicodeCharLength(line));

  // Check for rating patterns
  const ratingTextMatch = afterSymbols.match(/^\s*(?:\(([\d\.]+)\/(\d+)\)|([\d\.]+)\/(\d+)|(?:\()?(\d+)%(?:\))?)/);

  if (ratingTextMatch) {
    let format = '';
    let numerator = 0;
    let denominator = 0;

    if (ratingTextMatch[1] && ratingTextMatch[2]) {
      // (14.5/33) format
      format = 'fraction-parentheses';
      numerator = parseFloat(ratingTextMatch[1]);
      denominator = parseInt(ratingTextMatch[2]);
    } else if (ratingTextMatch[3] && ratingTextMatch[4]) {
      // 14.5/33 format
      format = 'fraction';
      numerator = parseFloat(ratingTextMatch[3]);
      denominator = parseInt(ratingTextMatch[4]);
    } else if (ratingTextMatch[5]) {
      // 60% or (60%) format
      format = afterSymbols.includes('(') ? 'percent-parentheses' : 'percent';
      numerator = parseInt(ratingTextMatch[5]);
      denominator = 100;
    }

    // Calculate the end position correctly with Unicode-aware calculations
    const endPosition = end + ratingTextMatch[0].length;

    const result: RatingText = {
      format,
      numerator,
      denominator,
      text: ratingTextMatch[0],
      endPosition: endPosition
    };

    return result;
  }

  return null;
}

/**
 * Get the appropriate symbol set for a given rating pattern
 */
export function getSymbolSetForPattern(pattern: string): SymbolSet | null {
  // Find the symbol set that matches the pattern
  for (const symbolSet of SYMBOL_PATTERNS) {
    if (pattern.includes(symbolSet.full) || pattern.includes(symbolSet.empty) ||
      (symbolSet.half && pattern.includes(symbolSet.half))) {
      return symbolSet;
    }
  }
  return null;
}

/**
 * Calculate the rating value from a pattern string
 */
export function calculateRating(pattern: string, symbolSet: SymbolSet): number {
  let rating = 0;
  // Use array spread to properly iterate over Unicode characters
  for (const char of [...pattern]) {
    if (char === symbolSet.full) rating += 1.0;
    else if (symbolSet.half && char === symbolSet.half) rating += 0.5;
  }

  if (LOGGING_ENABLED) {
    console.debug(`[InteractiveRatings] Calculated pattern rating`, {
      pattern,
      full: symbolSet.full,
      empty: symbolSet.empty,
      half: symbolSet.half,
      rating
    });
  };

  return rating;
}

/**
 * Generate regex patterns for detecting rating symbols in text
 */
export function generateSymbolRegexPatterns(): RegExp[] {
  return SYMBOL_PATTERNS.map(symbols => {
    const pattern = `[${symbols.full}${symbols.empty}${symbols.half ? symbols.half : ''}]{3,}`;
    return new RegExp(pattern, 'g');
  });
}
