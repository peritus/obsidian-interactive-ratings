import { EditorView, WidgetType } from "@codemirror/view";
import { generateSymbolsStringForDisk } from '../utils/generateSymbolsStringForDisk';
import { formatRatingText } from '../utils/formatRatingText';
import { getUnicodeCharLength } from '../utils/getUnicodeCharLength';
import { isFullOnlySymbol } from '../utils/isFullOnlySymbol';
import { LOGGING_ENABLED } from '../constants';
import { RatingText } from '../types';

/**
 * Rating widget for inline editing in CodeMirror
 * Handles both symbols and rating text with full half-symbol support, full-only symbols, and simplified HTML comments
 */
export class RatingWidget extends WidgetType {
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
      span.className = 'interactive-rating-symbol';
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
   * Apply the appropriate CSS class to a symbol based on its state
   */
  private applySymbolState(span: HTMLElement, state: 'rated' | 'unrated' | 'normal'): void {
    // Remove all state classes
    span.classList.remove('interactive-rating-symbol--rated', 'interactive-rating-symbol--unrated', 'interactive-rating-symbol--normal');
    
    // Add the appropriate state class
    span.classList.add(`interactive-rating-symbol--${state}`);
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
          this.applySymbolState(span, 'rated');
        } else {
          this.applySymbolState(span, 'unrated');
        }
      } else {
        // Regular symbol behavior
        if (symbolRating <= newRating) {
          // Full symbol
          span.textContent = this.symbolSet.full;
          this.applySymbolState(span, 'normal');
        } else if (this.symbolSet.half && halfRating <= newRating && halfRating > newRating - 0.5) {
          // Half symbol
          span.textContent = this.symbolSet.half;
          this.applySymbolState(span, 'normal');
        } else {
          // Empty symbol
          span.textContent = this.symbolSet.empty;
          this.applySymbolState(span, 'normal');
        }
      }
    });
    
    // Preview rating text if it exists and is not HTML comment format
    if (this.ratingText && !isCommentFormat) {
      const textContainer = container.querySelector('.interactive-rating-text');
      if (textContainer) {
        const unicodeLength = getUnicodeCharLength(this.pattern);
        const previewText = formatRatingText(
          this.ratingText.format,
          newRating,
          unicodeLength, // Always use actual pattern length for percentage calculations
          this.ratingText.denominator, // Use original denominator for fraction displays
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
          this.applySymbolState(span, 'rated');
        } else {
          this.applySymbolState(span, 'unrated');
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
        // Apply normal state for regular symbols
        this.applySymbolState(span, 'normal');
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
          unicodeLength, // Always use actual pattern length for percentage calculations
          denominator, // Use original denominator for fraction displays
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