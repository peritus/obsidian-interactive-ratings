import { Decoration, RangeSetBuilder } from "@codemirror/view";
import { getUnicodeCharLength } from '../../utils/getUnicodeCharLength';
import { isFullOnlySymbol } from '../../utils/isFullOnlySymbol';
import { LOGGING_ENABLED } from '../../constants';
import { RatingMatch } from '../RatingMatch';
import { RatingWidget } from '../RatingWidget/RatingWidget';

/**
 * Build decorations from filtered matches, skipping those near the cursor
 */
export function buildDecorationsFromMatches(
  matches: RatingMatch[], 
  cursorPos: number, 
  builder: RangeSetBuilder<Decoration>
): void {
  // Add decorations in sorted order, but skip if cursor is nearby
  for (const match of matches) {
    // Skip creating widget if cursor is near this rating
    if (cursorPos >= match.start - 1 && cursorPos <= match.end + 1) {
      if (LOGGING_ENABLED) {
        console.debug('[InteractiveRatings] Skipping widget creation due to nearby cursor', {
          cursorPos,
          ratingStart: match.start,
          ratingEnd: match.end
        });
      }
      continue;
    }
    
    const decoration = Decoration.replace({
      widget: new RatingWidget(
        match.pattern, 
        match.rating, 
        match.symbolSet, 
        match.start, 
        match.end,
        match.ratingText
      ),
      inclusive: false
    });
    
    builder.add(match.start, match.end, decoration);
  }
  
  if (LOGGING_ENABLED && matches.length > 0) {
    const skippedCount = matches.filter(m => 
      cursorPos >= m.start - 1 && cursorPos <= m.end + 1
    ).length;
    const fullOnlyCount = matches.filter(m => isFullOnlySymbol(m.symbolSet)).length;
    const commentCount = matches.filter(m => m.ratingText && m.ratingText.format === 'comment-fraction').length;
    const autoAddCandidates = matches.filter(m => isFullOnlySymbol(m.symbolSet) && !m.ratingText).length;
    const shortPatternCount = matches.filter(m => getUnicodeCharLength(m.pattern) < 3).length;
    console.debug(`[InteractiveRatings] Built ${matches.length - skippedCount}/${matches.length} rating decorations (${skippedCount} skipped due to cursor proximity)`, {
      cursorPos,
      withRatingText: matches.filter(m => m.ratingText).length,
      symbolsOnly: matches.filter(m => !m.ratingText).length,
      withHalfSymbols: matches.filter(m => m.symbolSet.half).length,
      fullOnlySymbols: fullOnlyCount,
      commentFormatSymbols: commentCount,
      autoAddCandidates,
      shortPatterns: shortPatternCount
    });
  }
}