import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { generateSymbolRegexPatterns, getSymbolSetForPattern, calculateRating, parseRatingText } from './ratings-parser';
import { generateSymbolsString, generateSymbolsStringForDisk, formatRatingText, getUnicodeCharLength, utf16ToUnicodePosition, isFullOnlySymbol } from './utils';
import { LOGGING_ENABLED } from './constants';
import { RatingText } from './types';

/**
 * Interface for rating match data with optional rating text
 */
interface RatingMatch {
  pattern: string;
  start: number;
  end: number;
  symbolSet: any;
  rating: number;
  ratingText?: RatingText | null;
}

/**
 * Rating widget for inline editing in CodeMirror
 * Handles both symbols and rating text with full half-symbol support, full-only symbols, and simplified HTML comments
 */
class RatingWidget extends WidgetType {
  constructor(
    private pattern: string,
    private rating: number,
    private symbolSet: any,
    private startPos: number,
    private endPos: number,
    private ratingText?: RatingText | null
  ) {
    super();
  }

  toDOM(view: EditorView): HTMLElement {
    const container = document.createElement('span');
    container.className = 'interactive-rating-editor-widget';
    container.setAttribute('data-rating', this.rating.toString());
    const unicodeLength = getUnicodeCharLength(this.pattern);
    container.setAttribute('data-pattern-length', unicodeLength.toString());
    container.setAttribute('data-supports-half', (!!this.symbolSet.half).toString());
    
    const isFullOnly = isFullOnlySymbol(this.symbolSet);
    container.setAttribute('data-full-only', isFullOnly.toString());
    
    // For full-only symbols, use denominator from rating text if available, otherwise use pattern length
    const displaySymbolCount = (isFullOnly && this.ratingText) ? this.ratingText.denominator : unicodeLength;
    container.setAttribute('data-display-symbol-count', displaySymbolCount.toString());
    
    // Check if rating text is HTML comment format (only supported for full-only symbols)
    const isCommentFormat = isFullOnly && this.ratingText && this.ratingText.format === 'comment-fraction';
    container.setAttribute('data-comment-format', isCommentFormat ? 'true' : 'false');
    
    // Create symbols container
    const symbolsContainer = document.createElement('span');
    symbolsContainer.className = 'interactive-rating-symbols';
    
    // Create clickable symbols based on display count
    for (let i = 0; i < displaySymbolCount; i++) {
      const span = document.createElement('span');
      span.textContent = this.symbolSet.full;
      span.style.cursor = 'pointer';
      span.style.position = 'relative';
      span.setAttribute('data-symbol-index', i.toString());
      
      // Add click handler with full-only validation
      span.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const newRating = this.calculateRatingFromClick(e, span, i);
        this.updateRating(view, newRating);
      });
      
      // Add hover preview
      span.addEventListener('mouseenter', (e) => {
        const previewRating = this.calculateRatingFromHover(e, span, i);
        this.previewRating(previewRating, container);
      });
      
      // Add mousemove for fine-grained preview
      span.addEventListener('mousemove', (e) => {
        const previewRating = this.calculateRatingFromHover(e, span, i);
        this.previewRating(previewRating, container);
      });
      
      symbolsContainer.appendChild(span);
    }
    
    container.appendChild(symbolsContainer);
    
    // Create rating text container if rating text exists and is not HTML comment format
    if (this.ratingText && !isCommentFormat) {
      const textContainer = document.createElement('span');
      textContainer.className = 'interactive-rating-text';
      textContainer.textContent = this.ratingText.text;
      container.appendChild(textContainer);
    }
    
    // Reset on mouse leave
    container.addEventListener('mouseleave', () => {
      this.renderRating(this.rating, container);
    });
    
    // Initial render
    this.renderRating(this.rating, container);
    
    return container;
  }

  /**
   * Calculate rating from click position with full-only validation
   */
  private calculateRatingFromClick(event: MouseEvent, span: HTMLElement, symbolIndex: number): number {
    const isFullOnly = isFullOnlySymbol(this.symbolSet);
    
    // For full-only symbols, don't support half ratings and enforce minimum rating of 1
    if (isFullOnly) {
      return Math.max(1, symbolIndex + 1);
    }
    
    if (!this.symbolSet.half) {
      // No half-symbol support, return full symbol rating
      return symbolIndex + 1;
    }
    
    const rect = span.getBoundingClientRect();
    const relativeX = event.clientX - rect.left;
    const symbolWidth = rect.width;
    const position = relativeX / symbolWidth;
    
    // If clicked on left half, use half symbol; if right half, use full symbol
    if (position <= 0.5) {
      return symbolIndex + 0.5;
    } else {
      return symbolIndex + 1;
    }
  }

  /**
   * Calculate rating from hover position with full-only validation
   */
  private calculateRatingFromHover(event: MouseEvent, span: HTMLElement, symbolIndex: number): number {
    const isFullOnly = isFullOnlySymbol(this.symbolSet);
    
    // For full-only symbols, don't support half ratings and enforce minimum rating of 1
    if (isFullOnly) {
      return Math.max(1, symbolIndex + 1);
    }
    
    if (!this.symbolSet.half) {
      // No half-symbol support, return full symbol rating
      return symbolIndex + 1;
    }
    
    const rect = span.getBoundingClientRect();
    const relativeX = event.clientX - rect.left;
    const symbolWidth = rect.width;
    const position = relativeX / symbolWidth;
    
    // More responsive half-symbol detection for hover
    if (position <= 0.5) {
      return symbolIndex + 0.5;
    } else {
      return symbolIndex + 1;
    }
  }

  /**
   * Preview rating with proper half-symbol rendering and full-only symbol support
   */
  private previewRating(newRating: number, container: HTMLElement): void {
    const symbolsContainer = container.querySelector('.interactive-rating-symbols');
    if (!symbolsContainer) return;
    
    const spans = symbolsContainer.querySelectorAll('span');
    const isFullOnly = isFullOnlySymbol(this.symbolSet);
    const isCommentFormat = isFullOnly && this.ratingText && this.ratingText.format === 'comment-fraction';
    
    spans.forEach((span, index) => {
      const symbolRating = index + 1;
      const halfRating = index + 0.5;
      
      if (isFullOnly) {
        // For full-only symbols: show full symbol for rated, grey for unrated
        span.textContent = this.symbolSet.full;
        if (symbolRating <= newRating) {
          span.style.opacity = '1';
          span.style.filter = 'none';
        } else {
          span.style.opacity = '0.5';
          span.style.filter = 'grayscale(100%)';
        }
      } else {
        // Regular symbol behavior
        if (symbolRating <= newRating) {
          // Full symbol
          span.textContent = this.symbolSet.full;
          span.style.opacity = '1';
          span.style.filter = 'none';
        } else if (this.symbolSet.half && halfRating <= newRating && halfRating > newRating - 0.5) {
          // Half symbol
          span.textContent = this.symbolSet.half;
          span.style.opacity = '1';
          span.style.filter = 'none';
        } else {
          // Empty symbol
          span.textContent = this.symbolSet.empty;
          span.style.opacity = '1';
          span.style.filter = 'none';
        }
      }
    });
    
    // Preview rating text if it exists and is not HTML comment format
    if (this.ratingText && !isCommentFormat) {
      const textContainer = container.querySelector('.interactive-rating-text');
      if (textContainer) {
        const previewText = formatRatingText(
          this.ratingText.format,
          newRating,
          this.ratingText.denominator, // Use original denominator
          this.ratingText.denominator,
          !!this.symbolSet.half && !isFullOnly,
          isFullOnly
        );
        textContainer.textContent = previewText;
      }
    }
    
    if (LOGGING_ENABLED) {
      console.debug('[InteractiveRatings] Preview rating with simplified comment format support', {
        newRating,
        hasHalf: !!this.symbolSet.half,
        isFullOnly,
        isCommentFormat,
        symbolSet: this.symbolSet,
        denominator: this.ratingText?.denominator
      });
    }
  }

  /**
   * Render rating with proper half-symbol display and full-only symbol support
   */
  private renderRating(rating: number, container: HTMLElement): void {
    const symbolsContainer = container.querySelector('.interactive-rating-symbols');
    if (!symbolsContainer) return;
    
    const spans = symbolsContainer.querySelectorAll('span');
    const isFullOnly = isFullOnlySymbol(this.symbolSet);
    const isCommentFormat = isFullOnly && this.ratingText && this.ratingText.format === 'comment-fraction';
    
    spans.forEach((span, index) => {
      const symbolRating = index + 1;
      const halfRating = index + 0.5;
      
      if (isFullOnly) {
        // For full-only symbols: show full symbol for rated, grey for unrated
        span.textContent = this.symbolSet.full;
        if (symbolRating <= rating) {
          span.style.opacity = '1';
          span.style.filter = 'none';
        } else {
          span.style.opacity = '0.5';
          span.style.filter = 'grayscale(100%)';
        }
      } else {
        // Regular symbol behavior
        if (symbolRating <= rating) {
          // Full symbol
          span.textContent = this.symbolSet.full;
        } else if (this.symbolSet.half && halfRating <= rating && halfRating > rating - 0.5) {
          // Half symbol
          span.textContent = this.symbolSet.half;
        } else {
          // Empty symbol
          span.textContent = this.symbolSet.empty;
        }
        // Reset any styling for regular symbols
        span.style.opacity = '1';
        span.style.filter = 'none';
      }
    });
    
    // Restore original rating text (only if not HTML comment format)
    if (this.ratingText && !isCommentFormat) {
      const textContainer = container.querySelector('.interactive-rating-text');
      if (textContainer) {
        textContainer.textContent = this.ratingText.text;
      }
    }
    
    if (LOGGING_ENABLED) {
      console.debug('[InteractiveRatings] Render rating with simplified comment format support', {
        rating,
        hasHalf: !!this.symbolSet.half,
        isFullOnly,
        isCommentFormat,
        symbolSet: this.symbolSet
      });
    }
  }

  /**
   * Update rating in the document with half-symbol support and full-only symbols
   */
  private updateRating(view: EditorView, newRating: number): void {
    try {
      const isFullOnly = isFullOnlySymbol(this.symbolSet);
      const unicodeLength = getUnicodeCharLength(this.pattern);
      
      // For full-only symbols, use the disk-safe function that only includes rated symbols
      const newSymbols = generateSymbolsStringForDisk(
        newRating,
        unicodeLength,
        this.symbolSet.full,
        this.symbolSet.empty,
        this.symbolSet.half || '',
        !!this.symbolSet.half && !isFullOnly,
        this.symbolSet
      );
      
      // Generate new rating text
      let newText = newSymbols;
      let newRatingFormat = '';
      
      if (this.ratingText) {
        // Use existing rating text format
        newRatingFormat = this.ratingText.format;
      } else if (isFullOnly) {
        // Auto-add HTML comment rating text for full-only symbols without rating text
        newRatingFormat = 'comment-fraction';
      }
      
      if (newRatingFormat) {
        const denominator = this.ratingText ? this.ratingText.denominator : unicodeLength;
        const newRatingText = formatRatingText(
          newRatingFormat,
          newRating,
          denominator,
          denominator,
          !!this.symbolSet.half && !isFullOnly,
          isFullOnly
        );
        newText = newSymbols + newRatingText;
      }
      
      // Update the document (replace both symbols and rating text)
      view.dispatch({
        changes: {
          from: this.startPos,
          to: this.endPos,
          insert: newText
        }
      });
      
      if (LOGGING_ENABLED) {
        console.info('[InteractiveRatings] Rating updated with auto-add HTML comment support', {
          oldRating: this.rating,
          newRating,
          newSymbols,
          newText,
          hasRatingText: !!this.ratingText,
          hasHalf: !!this.symbolSet.half,
          isFullOnly,
          autoAddedComment: !this.ratingText && isFullOnly,
          newRatingFormat,
          denominator: this.ratingText ? this.ratingText.denominator : unicodeLength,
          position: { from: this.startPos, to: this.endPos }
        });
      }
    } catch (error) {
      if (LOGGING_ENABLED) {
        console.error('[InteractiveRatings] Error updating rating', error);
      }
    }
  }
}

/**
 * ViewPlugin to detect and replace rating patterns with interactive widgets
 */
const ratingViewPlugin = ViewPlugin.fromClass(
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