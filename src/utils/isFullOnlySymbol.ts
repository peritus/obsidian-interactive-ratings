import { SymbolSet } from '../types';

/**
 * Check if a symbol set is full-only (same symbol for full and empty, no half)
 */
export function isFullOnlySymbol(symbolSet: SymbolSet): boolean {
  return symbolSet.full === symbolSet.empty && !symbolSet.half;
}