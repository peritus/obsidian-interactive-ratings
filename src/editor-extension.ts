import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { generateSymbolRegexPatterns, getSymbolSetForPattern, calculateRating, parseRatingText } from './ratings-parser';
import { generateSymbolsString, formatRatingText, getUnicodeCharLength, utf16ToUnicodePosition } from './utils';
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
 * Handles both symbols and rating text with full half-symbol support
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
    
    // Create symbols container
    const symbolsContainer = document.createElement('span');
    symbolsContainer.className = 'interactive-rating-symbols';
    
    // Create clickable symbols
    [...this.pattern].forEach((symbol, index) => {
      const span = document.createElement('span');
      span.textContent = symbol;
      span.style.cursor = 'pointer';
      span.style.position = 'relative';
      span.setAttribute('data-symbol-index', index.toString());
      
      // Add click handler with half-symbol support
      span.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const newRating = this.calculateRatingFromClick(e, span, index);
        this.updateRating(view, newRating);
      });
      
      // Add hover preview with half-symbol support
      span.addEventListener('mouseenter', (e) => {
        const previewRating = this.calculateRatingFromHover(e, span, index);
        this.previewRating(previewRating, container);
      });
      
      // Add mousemove for fine-grained half-symbol preview
      span.addEventListener('mousemove', (e) => {
        const previewRating = this.calculateRatingFromHover(e, span, index);
        this.previewRating(previewRating, container);
      });
      
      symbolsContainer.appendChild(span);
    });
    
    container.appendChild(symbolsContainer);
    
    // Create rating text container if rating text exists
    if (this.ratingText) {
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
   * Calculate rating from click position with half-symbol support
   */
  private calculateRatingFromClick(event: MouseEvent, span: HTMLElement, symbolIndex: number): number {
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
   * Calculate rating from hover position with half-symbol support
   */
  private calculateRatingFromHover(event: MouseEvent, span: HTMLElement, symbolIndex: number): number {
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
   * Preview rating with proper half-symbol rendering
   */
  private previewRating(newRating: number, container: HTMLElement): void {
    const symbolsContainer = container.querySelector('.interactive-rating-symbols');
    if (!symbolsContainer) return;
    
    const spans = symbolsContainer.querySelectorAll('span');
    spans.forEach((span, index) => {
      const symbolRating = index + 1;
      const halfRating = index + 0.5;
      
      if (symbolRating <= newRating) {
        // Full symbol
        span.textContent = this.symbolSet.full;
      } else if (this.symbolSet.half && halfRating <= newRating && halfRating > newRating - 0.5) {
        // Half symbol
        span.textContent = this.symbolSet.half;
      } else {
        // Empty symbol
        span.textContent = this.symbolSet.empty;
      }
    });
    
    // Preview rating text if it exists
    if (this.ratingText) {
      const textContainer = container.querySelector('.interactive-rating-text');
      if (textContainer) {
        // Use the Unicode character count as the denominator for preview
        const unicodeLength = getUnicodeCharLength(this.pattern);
        const previewText = formatRatingText(
          this.ratingText.format,
          newRating,
          unicodeLength,
          unicodeLength, // Use symbol count as denominator
          !!this.symbolSet.half
        );
        textContainer.textContent = previewText;
      }
    }
    
    if (LOGGING_ENABLED) {
      console.debug('[InteractiveRatings] Preview rating with half-symbol support', {
        newRating,
        hasHalf: !!this.symbolSet.half,
        symbolSet: this.symbolSet,
        denominator: getUnicodeCharLength(this.pattern)
      });
    }
  }

  /**
   * Render rating with proper half-symbol display
   */
  private renderRating(rating: number, container: HTMLElement): void {
    const symbolsContainer = container.querySelector('.interactive-rating-symbols');
    if (!symbolsContainer) return;
    
    const spans = symbolsContainer.querySelectorAll('span');
    spans.forEach((span, index) => {
      const symbolRating = index + 1;
      const halfRating = index + 0.5;
      
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
    });
    
    // Restore original rating text
    if (this.ratingText) {
      const textContainer = container.querySelector('.interactive-rating-text');
      if (textContainer) {
        textContainer.textContent = this.ratingText.text;
      }
    }
    
    if (LOGGING_ENABLED) {
      console.debug('[InteractiveRatings] Render rating with half-symbol support', {
        rating,
        hasHalf: !!this.symbolSet.half,
        symbolSet: this.symbolSet
      });
    }
  }

  /**
   * Update rating in the document with half-symbol support
   */
  private updateRating(view: EditorView, newRating: number): void {
    try {
      // Use Unicode character count for proper emoji handling
      const unicodeLength = getUnicodeCharLength(this.pattern);
      
      // Generate new symbol string with half-symbol support
      const newSymbols = generateSymbolsString(
        newRating,
        unicodeLength,
        this.symbolSet.full,
        this.symbolSet.empty,
        this.symbolSet.half || '',
        !!this.symbolSet.half
      );
      
      // Generate new rating text if it exists
      let newText = newSymbols;
      if (this.ratingText) {
        // Use the Unicode character count as the denominator for final update
        const newRatingText = formatRatingText(
          this.ratingText.format,
          newRating,
          unicodeLength,
          unicodeLength, // Use symbol count as denominator
          !!this.symbolSet.half
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
        console.info('[InteractiveRatings] Rating updated in editor with half-symbol support', {
          oldRating: this.rating,
          newRating,
          newSymbols,
          newText,
          hasRatingText: !!this.ratingText,
          hasHalf: !!this.symbolSet.half,
          oldDenominator: this.ratingText?.denominator,
          newDenominator: unicodeLength,
          unicodeLengthCalculated: unicodeLength,
          rawPatternLength: this.pattern.length,
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
            
            // Skip if too short (minimum 3 symbols) - use Unicode length
            const unicodeLength = getUnicodeCharLength(pattern);
            if (unicodeLength < 3) continue;
            
            const symbolSet = getSymbolSetForPattern(pattern);
            if (!symbolSet) continue;
            
            const rating = calculateRating(pattern, symbolSet);
            
            // Check for rating text after the symbols - pass UTF-16 positions
            const ratingText = parseRatingText(text, start, end);
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
                symbolSet: symbolSet
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
          console.debug(`[InteractiveRatings] Built ${filteredMatches.length - skippedCount}/${filteredMatches.length} rating decorations (${skippedCount} skipped due to cursor proximity)`, {
            cursorPos,
            withRatingText: filteredMatches.filter(m => m.ratingText).length,
            symbolsOnly: filteredMatches.filter(m => !m.ratingText).length,
            withHalfSymbols: filteredMatches.filter(m => m.symbolSet.half).length
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