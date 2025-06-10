import { SYMBOL_PATTERNS } from '../constants';
import { SymbolSet } from '../types';

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