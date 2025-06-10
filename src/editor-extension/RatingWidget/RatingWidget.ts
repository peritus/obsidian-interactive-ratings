import { EditorView, WidgetType } from "@codemirror/view";
import { getUnicodeCharLength } from '../../utils/getUnicodeCharLength';
import { isFullOnlySymbol } from '../../utils/isFullOnlySymbol';
import { RatingText } from '../../types';
import { calculateRatingFromClick } from './calculateRatingFromClick';
import { calculateRatingFromHover } from './calculateRatingFromHover';
import { previewRating } from './previewRating';
import { renderRating } from './renderRating';
import { updateRating } from './updateRating';

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
        
        const newRating = calculateRatingFromClick(e, span, i, this.symbolSet);
        updateRating(view, newRating, this.symbolSet, this.pattern, this.startPos, this.endPos, this.rating, this.ratingText);
      });
      
      // Add hover preview
      span.addEventListener('mouseenter', (e) => {
        const previewRatingValue = calculateRatingFromHover(e, span, i, this.symbolSet);
        previewRating(previewRatingValue, container, this.symbolSet, this.pattern, this.ratingText);
      });
      
      // Add mousemove for fine-grained preview
      span.addEventListener('mousemove', (e) => {
        const previewRatingValue = calculateRatingFromHover(e, span, i, this.symbolSet);
        previewRating(previewRatingValue, container, this.symbolSet, this.pattern, this.ratingText);
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
      renderRating(this.rating, container, this.symbolSet, this.ratingText);
    });
    
    // Initial render
    renderRating(this.rating, container, this.symbolSet, this.ratingText);
    
    return container;
  }
}