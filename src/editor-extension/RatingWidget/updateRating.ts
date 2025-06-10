import { EditorView } from "@codemirror/view";
import { generateSymbolsStringForDisk } from '../../utils/generateSymbolsStringForDisk';
import { formatRatingText } from '../../utils/formatRatingText';
import { getUnicodeCharLength } from '../../utils/getUnicodeCharLength';
import { isFullOnlySymbol } from '../../utils/isFullOnlySymbol';
import { LOGGING_ENABLED } from '../../constants';
import { RatingText } from '../../types';

/**
 * Update rating in the document with half-symbol support and full-only symbols
 */
export function updateRating(
  view: EditorView, 
  newRating: number, 
  symbolSet: any, 
  pattern: string, 
  startPos: number, 
  endPos: number, 
  rating: number, 
  ratingText?: RatingText | null
): void {
  try {
    const isFullOnly = isFullOnlySymbol(symbolSet);
    const unicodeLength = getUnicodeCharLength(pattern);
    
    // For full-only symbols, use the disk-safe function that only includes rated symbols
    const newSymbols = generateSymbolsStringForDisk(
      newRating,
      unicodeLength,
      symbolSet.full,
      symbolSet.empty,
      symbolSet.half || '',
      !!symbolSet.half && !isFullOnly,
      symbolSet
    );
    
    // Generate new rating text
    let newText = newSymbols;
    let newRatingFormat = '';
    
    if (ratingText) {
      // Use existing rating text format
      newRatingFormat = ratingText.format;
    } else if (isFullOnly) {
      // Auto-add HTML comment rating text for full-only symbols without rating text
      newRatingFormat = 'comment-fraction';
    }
    
    if (newRatingFormat) {
      const denominator = ratingText ? ratingText.denominator : unicodeLength;
      const newRatingText = formatRatingText(
        newRatingFormat,
        newRating,
        unicodeLength, // Always use actual pattern length for percentage calculations
        denominator, // Use original denominator for fraction displays
        !!symbolSet.half && !isFullOnly,
        isFullOnly
      );
      newText = newSymbols + newRatingText;
    }
    
    // Update the document (replace both symbols and rating text)
    view.dispatch({
      changes: {
        from: startPos,
        to: endPos,
        insert: newText
      }
    });
    
    if (LOGGING_ENABLED) {
      console.info('[InteractiveRatings] Rating updated with auto-add HTML comment support', {
        oldRating: rating,
        newRating,
        newSymbols,
        newText,
        hasRatingText: !!ratingText,
        hasHalf: !!symbolSet.half,
        isFullOnly,
        autoAddedComment: !ratingText && isFullOnly,
        newRatingFormat,
        denominator: ratingText ? ratingText.denominator : unicodeLength,
        position: { from: startPos, to: endPos }
      });
    }
  } catch (error) {
    if (LOGGING_ENABLED) {
      console.error('[InteractiveRatings] Error updating rating', error);
    }
  }
}