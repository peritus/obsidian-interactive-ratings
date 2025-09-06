import { LOGGING_ENABLED } from '../constants';
import { SymbolSet } from '../types';

/**
 * Calculate the rating value from a pattern string
 */
export function calculateRating(pattern: string, symbolSet: SymbolSet): number {
  let rating = 0;
  // Use Intl.Segmenter to properly iterate over grapheme clusters (handles ZWJ sequences)
  const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
  for (const {segment: char} of segmenter.segment(pattern)) {
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