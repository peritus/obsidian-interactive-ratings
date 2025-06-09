import { LOGGING_ENABLED, SYMBOL_PATTERNS } from './constants';
import { RatingText, SymbolSet } from './types';
import { getUnicodeCharLength, getUnicodeSubstring, utf16ToUnicodePosition } from './utils';

/**
 * Parse rating text from a line, including HTML comment formats with precedence
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
      afterSymbols: afterSymbols.substring(0, 40) + '...',
      lineLength: line.length,
      unicodeLineLength: getUnicodeCharLength(line)
    });
  }

  // Check for regular rating patterns first (takes precedence over HTML comments)
  const ratingTextMatch = afterSymbols.match(/^\s*(?:\(([\d\.]+)\/(\d+)\)|([\d\.]+)\/(\d+)|(?:\()?(\d+)%(?:\))?)/);
  
  // Check for simplified HTML comment rating patterns (only basic fraction format)
  const commentMatch = afterSymbols.match(/^\s*<!--\s*([\d\.]+)\/(\d+)\s*-->/);

  // Look for both formats to handle precedence properly
  let visibleMatch = null;
  let htmlCommentMatch = null;
  let totalMatchLength = 0;

  if (ratingTextMatch) {
    visibleMatch = ratingTextMatch;
    totalMatchLength = ratingTextMatch[0].length;
    
    // Check if there's also an HTML comment after the visible rating
    const afterVisible = afterSymbols.substring(ratingTextMatch[0].length);
    const followingCommentMatch = afterVisible.match(/^\s*<!--\s*([\d\.]+)\/(\d+)\s*-->/);
    if (followingCommentMatch) {
      htmlCommentMatch = followingCommentMatch;
      totalMatchLength += followingCommentMatch[0].length;
    }
  } else if (commentMatch) {
    htmlCommentMatch = commentMatch;
    totalMatchLength = commentMatch[0].length;
  }

  // Use visible rating if present, otherwise use comment
  const match = visibleMatch || htmlCommentMatch;
  const isComment = !visibleMatch && !!htmlCommentMatch;
  const hasBothFormats = !!(visibleMatch && htmlCommentMatch);

  if (match) {
    let format = '';
    let numerator = 0;
    let denominator = 0;

    if (isComment && htmlCommentMatch) {
      // Simplified HTML comment format: <!-- 3/5 -->
      format = 'comment-fraction';
      numerator = parseFloat(htmlCommentMatch[1]);
      denominator = parseInt(htmlCommentMatch[2]);
    } else if (match[1] && match[2]) {
      // (14.5/33) format
      format = 'fraction-parentheses';
      numerator = parseFloat(match[1]);
      denominator = parseInt(match[2]);
    } else if (match[3] && match[4]) {
      // 14.5/33 format
      format = 'fraction';
      numerator = parseFloat(match[3]);
      denominator = parseInt(match[4]);
    } else if (match[5]) {
      // 60% or (60%) format
      const hasParens = match[0].includes('(') && match[0].includes(')');
      format = hasParens ? 'percent-parentheses' : 'percent';
      numerator = parseInt(match[5]);
      denominator = 100;
    }

    // Calculate the end position correctly - use total length when both formats present
    const endPosition = utf16End + totalMatchLength;

    const result: RatingText = {
      format,
      numerator,
      denominator,
      text: match[0],
      endPosition: endPosition
    };

    if (LOGGING_ENABLED) {
      console.debug('[InteractiveRatings] Found rating text', {
        result,
        matchedText: match[0],
        isComment,
        hasPrecedence: !isComment,
        hasBothFormats,
        visibleMatchLength: visibleMatch ? visibleMatch[0].length : 0,
        commentMatchLength: htmlCommentMatch ? htmlCommentMatch[0].length : 0,
        totalMatchLength,
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