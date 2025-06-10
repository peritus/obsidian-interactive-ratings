import { LOGGING_ENABLED, SYMBOL_PATTERNS } from '../constants';
import { escapeRegexChar } from './escapeRegexChar';

/**
 * Generate regex patterns for detecting rating symbols in text
 * Fixed to handle multibyte Unicode characters (emojis) properly
 * Now supports 1+ symbols to detect low ratings
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
    // Changed from {3,} to {1,} to detect single symbols (fixes low rating bug)
    const pattern = `(?:${escapedSymbols.join('|')})+`;
    
    if (LOGGING_ENABLED) {
      console.debug(`[InteractiveRatings] Generated regex pattern for symbol set`, {
        symbolSet: symbols,
        pattern,
        escapedSymbols,
        allowsSingleSymbol: true
      });
    }
    
    return new RegExp(pattern, 'g');
  });
}