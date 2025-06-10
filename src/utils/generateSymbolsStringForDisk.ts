import { SymbolSet } from '../types';
import { isFullOnlySymbol } from './isFullOnlySymbol';
import { generateSymbolsString } from './generateSymbolsString';

/**
 * Generate a string of rating symbols for writing to disk (full-only symbols only include rated ones)
 */
export function generateSymbolsStringForDisk(
  rating: number, 
  symbolCount: number, 
  full: string, 
  empty: string, 
  half: string, 
  supportsHalf: boolean,
  symbolSet?: SymbolSet
): string {
  // For full-only symbols, only write the rated symbols
  if (symbolSet && isFullOnlySymbol(symbolSet)) {
    const ratedCount = Math.floor(rating);
    return full.repeat(ratedCount);
  }

  // For regular symbols, use the standard logic
  return generateSymbolsString(rating, symbolCount, full, empty, half, supportsHalf, symbolSet);
}