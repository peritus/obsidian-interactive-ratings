import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { generateSymbolRegexPatterns } from '../ratings-parser/generateSymbolRegexPatterns';
import { getSymbolSetForPattern } from '../ratings-parser/getSymbolSetForPattern';
import { calculateRating } from '../ratings-parser/calculateRating';
import { parseRatingText } from '../ratings-parser/parseRatingText';
import { getUnicodeCharLength } from '../utils/getUnicodeCharLength';
import { isFullOnlySymbol } from '../utils/isFullOnlySymbol';
import { LOGGING_ENABLED } from '../constants';
import { RatingMatch } from './RatingMatch';
import { RatingWidget } from './RatingWidget';

/**
 * ViewPlugin to detect and replace rating patterns with interactive widgets
 */
export const ratingViewPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = this.buildDecorations(update.view);
      }
    }

    buildDecorations(view: EditorView): DecorationSet {
      const builder = new RangeSetBuilder<Decoration>();
      
      try {
        const text = view.state.doc.toString();
        const cursorPos = view.state.selection.main.head;
        
        // Collect all matches first
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
        
        // Sort matches by start position (required by RangeSetBuilder)
        matches.sort((a, b) => a.start - b.start);
        
        // Remove overlapping matches (keep the first one)
        const filteredMatches: RatingMatch[] = [];
        let lastEnd = -1;
        
        for (const match of matches) {
          if (match.start >= lastEnd) {
            filteredMatches.push(match);
            lastEnd = match.end;
          }
        }
        
        // Add decorations in sorted order, but skip if cursor is nearby
        for (const match of filteredMatches) {
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
        
        if (LOGGING_ENABLED && filteredMatches.length > 0) {
          const skippedCount = filteredMatches.filter(m => 
            cursorPos >= m.start - 1 && cursorPos <= m.end + 1
          ).length;
          const fullOnlyCount = filteredMatches.filter(m => isFullOnlySymbol(m.symbolSet)).length;
          const commentCount = filteredMatches.filter(m => m.ratingText && m.ratingText.format === 'comment-fraction').length;
          const autoAddCandidates = filteredMatches.filter(m => isFullOnlySymbol(m.symbolSet) && !m.ratingText).length;
          const shortPatternCount = filteredMatches.filter(m => getUnicodeCharLength(m.pattern) < 3).length;
          console.debug(`[InteractiveRatings] Built ${filteredMatches.length - skippedCount}/${filteredMatches.length} rating decorations (${skippedCount} skipped due to cursor proximity)`, {
            cursorPos,
            withRatingText: filteredMatches.filter(m => m.ratingText).length,
            symbolsOnly: filteredMatches.filter(m => !m.ratingText).length,
            withHalfSymbols: filteredMatches.filter(m => m.symbolSet.half).length,
            fullOnlySymbols: fullOnlyCount,
            commentFormatSymbols: commentCount,
            autoAddCandidates,
            shortPatterns: shortPatternCount
          });
        }
        
      } catch (error) {
        if (LOGGING_ENABLED) {
          console.error('[InteractiveRatings] Error building decorations', error);
        }
      }
      
      return builder.finish();
    }
  },
  {
    decorations: v => v.decorations
  }
);

// Export the extension array
export const ratingEditorExtension = [ratingViewPlugin];