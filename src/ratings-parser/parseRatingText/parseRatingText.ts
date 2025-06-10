import { RatingText } from '../../types';
import { convertPositions } from './convertPositions';
import { findRatingPatterns } from './findRatingPatterns';
import { buildRatingTextResult } from './buildRatingTextResult';

/**
 * Parse rating text from a line, including HTML comment formats with precedence
 * @param line The full line of text
 * @param utf16Start UTF-16 byte position where symbols start
 * @param utf16End UTF-16 byte position where symbols end
 */
export function parseRatingText(line: string, utf16Start: number, utf16End: number): RatingText | null {
  // Convert UTF-16 positions to Unicode and extract text after symbols
  const { afterSymbols } = convertPositions(line, utf16Start, utf16End);
  
  // Find rating patterns in the text
  const { visibleMatch, htmlCommentMatch, totalMatchLength } = findRatingPatterns(afterSymbols);
  
  // Build and return the result
  return buildRatingTextResult(visibleMatch, htmlCommentMatch, totalMatchLength, utf16End);
}