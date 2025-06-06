import { MarkdownPostProcessorContext } from 'obsidian';
import { SYMBOL_PATTERNS, LOGGING_ENABLED } from './constants';
import { generateSymbolRegexPatterns, getSymbolSetForPattern, parseRatingText, calculateRating } from './ratings-parser';
import { getUnicodeCharLength } from './utils';
import { InlineRatingWidget } from './inline-rating-widget';

/**
 * Build detection regex once at load time from existing symbol catalog
 */
function createRatingDetectionRegex(): RegExp {
  const allSymbols = new Set<string>();
  
  SYMBOL_PATTERNS.forEach(pattern => {
    allSymbols.add(pattern.full);
    allSymbols.add(pattern.empty);
    if (pattern.half) {
      allSymbols.add(pattern.half);
    }
  });
  
  // Escape special regex characters and create character class
  const escapedSymbols = Array.from(allSymbols)
    .map(symbol => symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('');
    
  return new RegExp(`[${escapedSymbols}]{3,}`, 'g');
}

// Create detection regex once at module load
const RATING_DETECTION_REGEX = createRatingDetectionRegex();

if (LOGGING_ENABLED) {
  console.info('[InteractiveRatings] Inline ratings system loaded - detection regex created from symbol patterns');
}

/**
 * Register inline rating widget custom element
 */
function registerInlineRatingWidget() {
  if (customElements.get('interactive-rating')) {
    return; // Already registered
  }

  customElements.define('interactive-rating', InlineRatingWidget);
  
  if (LOGGING_ENABLED) {
    console.info('[InteractiveRatings] Inline rating widget registered');
  }
}

/**
 * Process rating elements in a text node and replace with widgets
 */
function processTextNodeForRatings(textNode: Text): boolean {
  const text = textNode.textContent || '';
  let hasReplacements = false;
  
  // Generate detailed regex patterns for actual processing
  const symbolRegexes = generateSymbolRegexPatterns();
  
  for (const regex of symbolRegexes) {
    let match;
    regex.lastIndex = 0; // Reset regex state
    
    while ((match = regex.exec(text)) !== null) {
      const pattern = match[0];
      const start = match.index;
      const end = start + getUnicodeCharLength(pattern);
      
      // Parse any rating text after the symbols
      const ratingText = parseRatingText(text, start, end);
      const textEndPosition = ratingText ? ratingText.endPosition : end;
      
      // Get symbol set for this pattern
      const symbolSet = getSymbolSetForPattern(pattern);
      if (!symbolSet) continue;
      
      // Calculate original rating
      const originalRating = calculateRating(pattern, symbolSet);
      
      if (LOGGING_ENABLED) {
        console.debug('[InteractiveRatings] Found rating in text node', {
          pattern,
          originalRating,
          ratingText: ratingText ? JSON.stringify(ratingText) : 'none',
          start,
          end: textEndPosition
        });
      }
      
      // Create inline rating widget with improved structure
      const widget = document.createElement('interactive-rating') as InlineRatingWidget;
      widget.dataset.pattern = pattern;
      widget.dataset.originalRating = originalRating.toString();
      widget.dataset.symbolSetFull = symbolSet.full;
      widget.dataset.symbolSetEmpty = symbolSet.empty;
      widget.dataset.symbolSetHalf = symbolSet.half || '';
      widget.dataset.supportsHalf = symbolSet.half ? 'true' : 'false';
      
      if (ratingText) {
        widget.dataset.hasRatingText = 'true';
        widget.dataset.ratingFormat = ratingText.format;
        widget.dataset.ratingNumerator = ratingText.numerator.toString();
        widget.dataset.ratingDenominator = ratingText.denominator.toString();
        widget.dataset.ratingText = ratingText.text;
      } else {
        widget.dataset.hasRatingText = 'false';
      }
      
      // Note: Don't set initial textContent - the widget will handle its own structure
      
      // Replace the text in the DOM
      const parentNode = textNode.parentNode;
      if (parentNode) {
        const beforeText = text.substring(0, start);
        const afterText = text.substring(textEndPosition);
        
        // Replace with: [beforeText][widget][afterText]
        if (beforeText) {
          parentNode.insertBefore(document.createTextNode(beforeText), textNode);
        }
        parentNode.insertBefore(widget, textNode);
        if (afterText) {
          parentNode.insertBefore(document.createTextNode(afterText), textNode);
        }
        
        parentNode.removeChild(textNode);
        hasReplacements = true;
        break; // Process one replacement per text node
      }
    }
  }
  
  return hasReplacements;
}

/**
 * Process rating elements in an HTML element
 */
function processRatingElements(element: HTMLElement): void {
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        // Only process text nodes that might contain ratings
        const text = node.textContent || '';
        return RATING_DETECTION_REGEX.test(text) ? 
          NodeFilter.FILTER_ACCEPT : 
          NodeFilter.FILTER_REJECT;
      }
    }
  );
  
  const textNodesToProcess: Text[] = [];
  let node;
  while (node = walker.nextNode()) {
    textNodesToProcess.push(node as Text);
  }
  
  // Reset regex state
  RATING_DETECTION_REGEX.lastIndex = 0;
  
  // Process text nodes (in reverse order to avoid DOM position issues)
  for (let i = textNodesToProcess.length - 1; i >= 0; i--) {
    processTextNodeForRatings(textNodesToProcess[i]);
  }
}

/**
 * Main markdown postprocessor function
 * Ultra-fast early exit for documents without ratings
 */
export function processRatings(element: HTMLElement, context: MarkdownPostProcessorContext): void {
  const textContent = element.textContent;
  
  // ULTRA-FAST EXIT: No potential rating symbols
  if (!textContent || !RATING_DETECTION_REGEX.test(textContent)) {
    return; // ~99% of documents exit here in <1ms
  }
  
  // Reset regex state for actual processing
  RATING_DETECTION_REGEX.lastIndex = 0;
  
  if (LOGGING_ENABLED) {
    console.debug('[InteractiveRatings] Processing element with potential ratings', {
      elementType: element.tagName,
      textLength: textContent.length
    });
  }
  
  // Ensure widget is registered
  registerInlineRatingWidget();
  
  // Only proceed with detailed processing if ratings detected
  processRatingElements(element);
  
  if (LOGGING_ENABLED) {
    console.debug('[InteractiveRatings] Rating processing completed');
  }
}
