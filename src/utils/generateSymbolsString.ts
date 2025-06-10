import { LOGGING_ENABLED } from '../constants';
import { SymbolSet } from '../types';
import { isFullOnlySymbol } from './isFullOnlySymbol';

/**
 * Generate a string of rating symbols for display purposes
 * For full-only symbols with rating text, this shows denominator count symbols
 */
export function generateSymbolsString(
  rating: number, 
  symbolCount: number, 
  full: string, 
  empty: string, 
  half: string, 
  supportsHalf: boolean,
  symbolSet?: SymbolSet,
  denominator?: number
): string {
  // For full-only symbols with rating text, use denominator for total count
  const isFullOnly = symbolSet && isFullOnlySymbol(symbolSet);
  const totalSymbols = (isFullOnly && denominator) ? denominator : symbolCount;
  
  let newSymbols = '';

  for (let i = 0; i < totalSymbols; i++) {
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
      totalSymbols,
      full,
      empty,
      half,
      supportsHalf,
      isFullOnly,
      denominator,
      newSymbols
    });
  };

  return newSymbols;
}