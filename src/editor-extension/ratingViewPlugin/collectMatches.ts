import { generateSymbolRegexPatterns } from '../../ratings-parser/generateSymbolRegexPatterns';
import { getSymbolSetForPattern } from '../../ratings-parser/getSymbolSetForPattern';
import { calculateRating } from '../../ratings-parser/calculateRating';
import { parseRatingText } from '../../ratings-parser/parseRatingText/parseRatingText';
import { getUnicodeCharLength } from '../../utils/getUnicodeCharLength';
import { isFullOnlySymbol } from '../../utils/isFullOnlySymbol';
import { LOGGING_ENABLED } from '../../constants';
import { RatingMatch } from '../RatingMatch';

/**
 * Collect all rating matches from the text
 */
export function collectMatches(text: string): RatingMatch[] {
  const matches: RatingMatch[] = [];
  const symbolRegexes = generateSymbolRegexPatterns();
  
  for (const regex of symbolRegexes) {
    let match;
    regex.lastIndex = 0;
    
    while ((match = regex.exec(text)) !== null) {
      const pattern = match[0];
      const start = match.index;
      const end = start + pattern.length;
      
      const symbolSet = getSymbolSetForPattern(pattern);
      if (!symbolSet) continue;
      
      const rating = calculateRating(pattern, symbolSet);
      const isFullOnly = isFullOnlySymbol(symbolSet);
      
      // For full-only symbols, skip if rating is 0 (not supported)
      if (isFullOnly && rating === 0) continue;
      
      // Check for rating text after the symbols - pass UTF-16 positions
      const ratingText = parseRatingText(text, start, end);
      
      // Simple rule: if no rating text, require minimum 3 symbols to avoid false positives
      const unicodeLength = getUnicodeCharLength(pattern);
      if (!ratingText && unicodeLength < 3) {
        continue;
      }
      
      const actualEnd = ratingText ? ratingText.endPosition : end;
      
      if (LOGGING_ENABLED) {
        console.debug('[InteractiveRatings] Found rating match', {
          pattern,
          start,
          end,
          actualEnd,
          unicodeLength,
          rating,
          hasRatingText: !!ratingText,
          ratingTextDetails: ratingText,
          symbolSet: symbolSet,
          isFullOnly,
          isCommentFormat: ratingText && ratingText.format === 'comment-fraction',
          canAutoAddComment: isFullOnly && !ratingText
        });
      }
      
      matches.push({
        pattern,
        start,
        end: actualEnd,
        symbolSet,
        rating,
        ratingText
      });
    }
  }
  
  return matches;
}