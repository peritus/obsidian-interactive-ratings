import { LOGGING_ENABLED, SYMBOL_PATTERNS } from './constants';
import { RatingText, SymbolSet } from './types';
import { getUnicodeCharLength, getUnicodeSubstring, utf16ToUnicodePosition } from './utils';

/**
 * Parse rating text from a line
 * @param line The full line of text
 * @param utf16Start UTF-16 byte position where symbols start
 * @param utf16End UTF-16 byte position where symbols end
 */
export function parseRatingText(line: string, utf16Start: number, utf16End: number): RatingText | null {
  // Convert UTF-16 positions to Unicode character positions
  const unicodeStart = utf16ToUnicodePosition(line, utf16Start);
  const unicodeEnd = utf16ToUnicodePosition(line, utf16End);
  
  // Get the substring after the symbols using Unicode-aware functions
  const afterSymbols = getUnicodeSubstring(line, unicodeEnd, getUnicodeCharLength(line));

  if (LOGGING_ENABLED) {
    console.debug('[InteractiveRatings] parseRatingText debug', {
      utf16Start,
      utf16End,
      unicodeStart,
      unicodeEnd,
      afterSymbols: afterSymbols.substring(0, 20) + '...',
      lineLength: line.length,
      unicodeLineLength: getUnicodeCharLength(line)
    });
  }

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

    // Calculate the end position correctly - convert back to UTF-16 position
    // We need to find where this rating text ends in the original UTF-16 string
    const ratingTextLength = ratingTextMatch[0].length;
    const endPosition = utf16End + ratingTextMatch[0].length;

    const result: RatingText = {
      format,
      numerator,
      denominator,
      text: ratingTextMatch[0],
      endPosition: endPosition
    };

    if (LOGGING_ENABLED) {
      console.debug('[InteractiveRatings] Found rating text', {
        result,
        matchedText: ratingTextMatch[0],
        ratingTextLength,
        calculatedEndPosition: endPosition
      });
    }

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
 * Escape special regex characters, handling Unicode properly
 */
function escapeRegexChar(char: string): string {
  return char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Generate regex patterns for detecting rating symbols in text
 * Fixed to handle multibyte Unicode characters (emojis) properly
 */
export function generateSymbolRegexPatterns(): RegExp[] {
  return SYMBOL_PATTERNS.map(symbols => {
    // Build alternation pattern instead of character class for emoji support
    const symbolChars = [symbols.full, symbols.empty];
    if (symbols.half) {
      symbolChars.push(symbols.half);
    }
    
    // Escape each symbol for regex and create alternation
    const escapedSymbols = symbolChars.map(escapeRegexChar);
    const pattern = `(?:${escapedSymbols.join('|')}){3,}`;
    
    if (LOGGING_ENABLED) {
      console.debug(`[InteractiveRatings] Generated regex pattern for symbol set`, {
        symbolSet: symbols,
        pattern,
        escapedSymbols
      });
    }
    
    return new RegExp(pattern, 'g');
  });
}