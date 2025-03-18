const { Plugin } = require("obsidian");

function getUnicodeCharLength(str) {
  return [...str].length;
}

function getUnicodeSubstring(str, start, end) {
  return [...str].slice(start, end).join('');
}

function getUnicodeCharAt(str, index) {
  return [...str][index];
}

// Define symbol patterns as a global constant
const SYMBOL_PATTERNS = [
  { full: '★', empty: '☆', half: null },    // Symbols
  { full: '●', empty: '○', half: '◐' },     // Circles
  { full: '■', empty: '□', half: '◧' },     // Squares
  { full: '▲', empty: '△', half: null },    // Triangles (no half)

  // Progress bar patterns
  { full: '█', empty: '▁', half: null  },   // Block progress
  { full: '⣿', empty: '⣀', half: '⡇' },     // Braille dots
  { full: '⬤', empty: '○', half: null },   // Solid/empty circles
  { full: '■', empty: '□', half: null },    // Solid/empty squares
  { full: '▰', empty: '▱', half: null },    // Dotted squares
  { full: '◼', empty: '▭', half: null },    // Filled/empty rectangles
  { full: '▮', empty: '▯', half: null },    // Vertical bars
  { full: '⬤', empty: '◯', half: null },   // Bold circles
  { full: '⚫', empty: '⚪', half: null },   // Black/white circles
  { full: '█', empty: '░', half: null },    // Block/light shade

];

// Generic function to get position from any pointer event (mouse or touch)
function getPositionFromEvent(event) {
  // Return x, y coordinates from either mouse or touch event
  const clientX = event.touches ? event.touches[0].clientX : event.clientX;
  const clientY = event.touches ? event.touches[0].clientY : event.clientY;
  return { clientX, clientY };
}

// Generic function to check if a point is within a region
function isPointWithinRegion(point, startCoords, endCoords, buffer = 2) {
  return (
    point.clientX >= startCoords.left - buffer &&
    point.clientX <= endCoords.right + buffer &&
    point.clientY >= startCoords.top - buffer &&
    point.clientY <= endCoords.bottom + buffer
  );
}

// Generic function to check if a point is over an element
function isPointOverElement(point, element) {
  const rect = element.getBoundingClientRect();
  return (
    point.clientX >= rect.left &&
    point.clientX <= rect.right &&
    point.clientY >= rect.top &&
    point.clientY <= rect.bottom
  );
}

// Calculate rating from event position relative to container
function calculateRatingFromEvent(event, container) {
  const point = getPositionFromEvent(event);
  const containerRect = container.getBoundingClientRect();
  const symbolCount = parseInt(container.dataset.symbolCount);
  const symbolWidth = containerRect.width / symbolCount;
  const relativeX = point.clientX - containerRect.left;
  const hoveredSymbolIndex = Math.floor(relativeX / symbolWidth);
  const positionWithinSymbol = (relativeX % symbolWidth) / symbolWidth;
  
  const supportsHalf = container.dataset.supportsHalf === 'true';
  const useHalfSymbol = supportsHalf && positionWithinSymbol < 0.5;
  
  return Math.max(0, hoveredSymbolIndex + (useHalfSymbol ? 0.5 : 1));
}

// Update symbols display based on rating
function updateSymbolsDisplay(container, rating) {
  const symbols = container.querySelectorAll('.interactive-ratings-symbol');
  const full = container.dataset.full;
  const empty = container.dataset.empty;
  const half = container.dataset.half;
  const supportsHalf = container.dataset.supportsHalf === 'true';
  
  container.dataset.currentRating = rating.toString();
  
  symbols.forEach((symbol, index) => {
    if (index < Math.floor(rating)) {
      symbol.textContent = full;
    } else if (supportsHalf && index === Math.floor(rating) && rating % 1 !== 0) {
      symbol.textContent = half;
    } else {
      symbol.textContent = empty;
    }
  });
}

// Format rating text based on original format and new rating
function formatRatingText(container, newRating) {
  if (container.dataset.hasRatingText !== 'true') {
    return '';
  }
  
  const format = container.dataset.ratingFormat;
  const denominator = parseInt(container.dataset.ratingDenominator);
  const symbolCount = parseInt(container.dataset.symbolCount);
  
  // Calculate new numerator based on rating
  let newNumerator;
  if (format.includes('percent')) {
    newNumerator = Math.round((newRating / symbolCount) * 100);
  } else {
    newNumerator = newRating;
    if (container.dataset.supportsHalf !== 'true') {
      newNumerator = Math.round(newNumerator);
    }
  }
  
  // Format the text based on the original format
  switch (format) {
    case 'fraction':
      return ` ${newNumerator}/${denominator}`;
    case 'fraction-parentheses':
      return ` (${newNumerator}/${denominator})`;
    case 'percent':
      return ` ${newNumerator}%`;
    case 'percent-parentheses':
      return ` (${newNumerator}%)`;
    default:
      return '';
  }
}

// Create symbol elements for the overlay
function createSymbolElements(overlay, symbols) {
  const symbolCount = getUnicodeCharLength(symbols);
  overlay.dataset.symbolCount = symbolCount;

  // Add symbols to the overlay - properly iterate over Unicode characters
  const symbolsArray = [...symbols];
  for (let i = 0; i < symbolCount; i++) {
    const symbolSpan = document.createElement('span');
    symbolSpan.className = 'interactive-ratings-symbol';
    symbolSpan.textContent = symbolsArray[i];
    symbolSpan.dataset.position = i.toString();
    symbolSpan.dataset.originalChar = symbolsArray[i];

    symbolSpan.style.padding = '0';
    symbolSpan.style.margin = '0';
    symbolSpan.style.height = 'auto';
    symbolSpan.style.display = 'inline-block';
    symbolSpan.style.width = `${100 / symbolCount}%`; // Make each star take equal width
    
    overlay.appendChild(symbolSpan);
  }
}

// Apply the new rating to the editor
function applyRatingToEditor(editor, container, newRating, line, start, symbols) {
  const updatedRatingText = formatRatingText(container, newRating);
  
  // IMPORTANT: Make sure we're replacing the entire content, including the rating text
  let startPos = {line: line, ch: start};
  let endPos;

  if (container.dataset.hasRatingText === 'true') {
    // Use the stored rating end position
    endPos = {line: line, ch: parseInt(container.dataset.ratingEndPosition)};
  } else {
    // If there's no rating text, just replace the symbols
    endPos = {line: line, ch: start + getUnicodeCharLength(symbols)};
  }

  // Get new symbols string based on rating
  const symbolCount = parseInt(container.dataset.symbolCount);
  const full = container.dataset.full;
  const empty = container.dataset.empty;
  const half = container.dataset.half;
  const supportsHalf = container.dataset.supportsHalf === 'true';

  let newSymbols = '';
  for (let i = 0; i < symbolCount; i++) {
    if (i < Math.floor(newRating)) {
      newSymbols += full;
    } else if (supportsHalf && i === Math.floor(newRating) && newRating % 1 !== 0) {
      newSymbols += half;
    } else {
      newSymbols += empty;
    }
  }

  // Replace the entire content
  editor.replaceRange(
    newSymbols + updatedRatingText,
    startPos,
    endPos
  );
}


class InteractiveRatingsPlugin extends Plugin {
  async onload() {
    console.log('Loading Interactive Ratings plugin');

    // For editing mode, register mouse events
    this.registerDomEvent(document, 'mousemove', (evt) => {
      this.handlePointerInteraction(evt, 'move');
    });

    // Add touch events for mobile support
    this.registerDomEvent(document, 'touchstart', (evt) => {
      this.handlePointerInteraction(evt, 'start');
    });

    this.registerDomEvent(document, 'touchmove', (evt) => {
      this.handlePointerInteraction(evt, 'move');
    });

    this.registerDomEvent(document, 'touchend', (evt) => {
      this.handlePointerInteraction(evt, 'end');
    });

    // Track if we're in a touch interaction
    this.touchInteractionActive = false;

    // Add CSS to the document
    this.addStyle();
  }

  // Generic handler for all pointer events (mouse or touch)
  handlePointerInteraction(evt, interactionType) {
    // Check if we're in editor mode
    const activeLeaf = this.app.workspace.activeLeaf;
    if (!activeLeaf || !activeLeaf.view) return;
    
    // Check if the view is a markdown editor in source mode
    const isSourceMode = activeLeaf.view.getViewType() === 'markdown' && 
                         activeLeaf.view.getMode() !== 'preview';
    
    if (!isSourceMode) return;
    
    // Get the editor element
    const editor = activeLeaf.view.editor;
    if (!editor) return;
    
    // Convert event to a position
    const point = getPositionFromEvent(evt);
    
    // Handle existing overlay
    if (this.ratingsOverlay) {
      if (interactionType === 'move') {
        // Handle move events within overlay
        if (this.touchInteractionActive || isPointOverElement(point, this.ratingsOverlay)) {
          // Update rating based on new position
          const newRating = calculateRatingFromEvent(evt, this.ratingsOverlay);
          updateSymbolsDisplay(this.ratingsOverlay, newRating);
          evt.preventDefault();
          return;
        } else if (!this.touchInteractionActive) {
          // For mouse events, if mouse moved outside overlay, remove it
          this.removeRatingsOverlay();
        }
      } else if (interactionType === 'end') {
        // Handle touch end event - apply rating and remove overlay
        if (this.touchInteractionActive) {
          const newRating = calculateRatingFromEvent(evt, this.ratingsOverlay);
          const line = parseInt(this.ratingsOverlay.dataset.line);
          const start = parseInt(this.ratingsOverlay.dataset.start);
          const symbols = this.ratingsOverlay.dataset.originalSymbols;
          
          applyRatingToEditor(editor, this.ratingsOverlay, newRating, line, start, symbols);
          this.touchInteractionActive = false;
          this.removeRatingsOverlay();
          evt.preventDefault();
          return;
        }
      }
    }
    
    // Handle new interactions only on start or mouse move
    if (interactionType === 'start' || (interactionType === 'move' && evt.type === 'mousemove')) {
      // Get the editor's info at the current position
      const editorEl = editor.editorComponent.editorEl;
      
      // Skip if target is not in the editor
      if (evt.target instanceof HTMLElement && !editorEl.contains(evt.target)) return;
      
      // For touch events, we need to check if the touch is on a rating
      let editorPos;
      
      if (evt.type === 'touchstart') {
        // For touch events, get the position from the touch coordinates
        const touch = evt.touches[0];
        editorPos = editor.posAtCoords({x: touch.clientX, y: touch.clientY});
      } else {
        // For mouse events, use the built-in method
        editorPos = editor.posAtMouse(evt);
      }
      
      if (!editorPos) return;
      
      // Process the rating at the position
      this.processRatingAtPosition(evt, editor, editorPos, interactionType);
    }
  }

  processRatingAtPosition(evt, editor, editorPos, interactionType) {
    // Get the line at the current position
    const line = editor.getLine(editorPos.line);
    
    // Generate regex patterns from the symbol sets
    const symbolRegexes = SYMBOL_PATTERNS.map(symbols => {
      const pattern = `[${symbols.full}${symbols.empty}${symbols.half ? symbols.half : ''}]{3,}`;
      return new RegExp(pattern, 'g');
    });
    
    // Check for all symbol patterns
    for (const regex of symbolRegexes) {
      let match;
      while ((match = regex.exec(line)) !== null) {
        const start = match.index;
        const end = start + getUnicodeCharLength(match[0]);

        // Parse rating text if present
        const ratingText = this.parseRatingText(line, start, end);
        const textEndPosition = ratingText ? ratingText.endPosition : end;
        
        // Calculate character position range
        const startPos = {line: editorPos.line, ch: start};
        const endPos = {line: editorPos.line, ch: textEndPosition};
        
        // Get screen coordinates for start and end of pattern
        const startCoords = editor.coordsAtPos(startPos);
        const endCoords = editor.coordsAtPos(endPos);
        
        if (!startCoords || !endCoords) continue;
        
        // Get position from event
        const point = getPositionFromEvent(evt);
        
        // Check if pointer is inside the region
        if (isPointWithinRegion(point, startCoords, endCoords)) {
          // Determine pattern type by checking characters
          const pattern = match[0];
          const symbolSet = this.getSymbolSetForPattern(pattern);
          
          if (!symbolSet) continue;
          
          // Calculate original rating (count full symbols as 1.0 and half symbols as 0.5)
          const originalRating = this.calculateRating(pattern, symbolSet);
          
          // Create overlay if we're starting an interaction
          if (interactionType === 'start' || 
              (interactionType === 'move' && evt.type === 'mousemove' && 
               (!this.ratingsOverlay || this.ratingsOverlay.dataset.linePosition !== `${editorPos.line}-${start}`))) {
            
            this.createEditorOverlay(editor, editorPos.line, start, pattern, originalRating, symbolSet, ratingText);
            
            // For touch events, mark that we're in an active touch interaction
            if (evt.type === 'touchstart') {
              this.touchInteractionActive = true;
              evt.preventDefault(); // Prevent scrolling while interacting
            }
          }
          
          return;
        }
      }
    }
  }

  createEditorOverlay(editor, line, start, symbols, originalRating, symbolSet, ratingText) {
    // Get coordinates for the position
    const posCoords = editor.coordsAtPos({line: line, ch: start});
    if (!posCoords) return;
    
    // Create container for the overlay
    const overlay = document.createElement('div');
    overlay.className = 'interactive-ratings-editor-overlay';
    overlay.style.position = 'fixed';
    overlay.style.zIndex = '1000';
    overlay.style.backgroundColor = 'var(--background-primary)';
    overlay.style.left = `${posCoords.left}px`;

    // TODO Calculate a more precise vertical position
    const verticalAdjustment = 2.1;
    overlay.style.top = `${posCoords.top - verticalAdjustment}px`;
    
    // Store position information for comparison
    overlay.dataset.linePosition = `${line}-${start}`;
    overlay.dataset.line = line;
    overlay.dataset.start = start;
    overlay.dataset.originalSymbols = symbols;
    
    // Store original rating and symbol information
    overlay.dataset.originalRating = originalRating;
    overlay.dataset.full = symbolSet.full;
    overlay.dataset.empty = symbolSet.empty;
    overlay.dataset.half = symbolSet.half || '';
    overlay.dataset.supportsHalf = symbolSet.half ? 'true' : 'false';

    if (ratingText) {
      overlay.dataset.hasRatingText = 'true';
      overlay.dataset.ratingFormat = ratingText.format;
      overlay.dataset.ratingNumerator = ratingText.numerator;
      overlay.dataset.ratingDenominator = ratingText.denominator;
      overlay.dataset.ratingText = ratingText.text;
      overlay.dataset.ratingEndPosition = ratingText.endPosition;
    } else {
      overlay.dataset.hasRatingText = 'false';
    }
    
    // Track current hover position
    overlay.dataset.currentRating = "0";

    // Get the editor element and compute its styles
    const editorEl = editor.editorComponent.editorEl;
    const editorStyles = window.getComputedStyle(editorEl);

    // Also, ensure vertical alignment matches
    overlay.style.verticalAlign = editorStyles.verticalAlign || 'baseline';
    
    // Match editor font properties exactly
    overlay.style.fontFamily = editorStyles.fontFamily;
    overlay.style.fontSize = editorStyles.fontSize;
    overlay.style.fontWeight = editorStyles.fontWeight;
    overlay.style.letterSpacing = editorStyles.letterSpacing;
    overlay.style.lineHeight = editorStyles.lineHeight;
    overlay.style.cursor = 'pointer';
    
    // Apply exact padding and margins to match editor
    overlay.style.padding = '0';
    overlay.style.margin = '0';
    overlay.style.border = 'none';
    overlay.style.boxSizing = 'border-box';
    
    // Prevent any text selection that might cause movement
    overlay.style.userSelect = 'none';
    
    // Create symbol elements
    createSymbolElements(overlay, symbols);
    
    // Add click listener for mouse interactions
    overlay.addEventListener('click', (e) => {
      const newRating = calculateRatingFromEvent(e, overlay);
      applyRatingToEditor(editor, overlay, newRating, line, start, symbols);
      this.removeRatingsOverlay();
    });
    
    // Add to document
    document.body.appendChild(overlay);
    this.ratingsOverlay = overlay;
  }

  removeRatingsOverlay() {
    if (this.ratingsOverlay && this.ratingsOverlay.parentNode) {
      this.ratingsOverlay.parentNode.removeChild(this.ratingsOverlay);
      this.ratingsOverlay = null;
    }
    this.touchInteractionActive = false;
  }

  // Enhanced style with mobile touch support
  addStyle() {
    const css = `
      .interactive-ratings-container {
        display: inline-block;
        cursor: pointer;
      }
      
      .interactive-ratings-symbol {
        display: inline-block;
        transition: transform 0.1s ease;
      }
      
      .interactive-ratings-editor-overlay {
        display: inline-block;
        cursor: pointer;
        touch-action: none; /* Prevent browser handling of touch gestures */
        -webkit-user-select: none; /* Prevent text selection on iOS */
        user-select: none; /* Prevent text selection */
        -webkit-touch-callout: none; /* Disable callout on long press */
      }

      /* Make touch targets larger on mobile */
      @media (max-width: 768px) {
        .interactive-ratings-symbol {
          min-width: 24px;
          min-height: 24px;
          padding: 2px;
        }
      }
    `;
    
    const styleEl = document.createElement('style');
    styleEl.id = 'interactive-ratings-style';
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }

  onunload() {
    console.log('Unloading Interactive Ratings plugin');
    const styleEl = document.getElementById('interactive-ratings-style');
    if (styleEl) styleEl.remove();
    this.removeRatingsOverlay();
  }
}

module.exports = InteractiveRatingsPlugin;