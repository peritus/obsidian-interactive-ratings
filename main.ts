import { MarkdownView, Plugin } from 'obsidian';

function getUnicodeCharLength(str) {
  return [...str].length;
}

function getUnicodeSubstring(str, start, end) {
  return [...str].slice(start, end).join('');
}

// Extract rating calculation from the click handler
function calculateNewRating(overlay, clientX) {
  const containerRect = overlay.getBoundingClientRect();
  const symbolCount = parseInt(overlay.dataset.symbolCount);
  const symbolWidth = containerRect.width / symbolCount;
  const relativeX = clientX - containerRect.left;
  const hoveredSymbolIndex = Math.floor(relativeX / symbolWidth);
  const positionWithinSymbol = (relativeX % symbolWidth) / symbolWidth;
  
  // Determine if we should use half symbol or full symbol
  const supportsHalf = overlay.dataset.supportsHalf === 'true';
  const useHalfSymbol = supportsHalf && positionWithinSymbol < 0.5;
  
  // Calculate rating
  let newRating = hoveredSymbolIndex + (useHalfSymbol ? 0.5 : 1);
  if (newRating < 0) {
    newRating = 0;
  }
  
  return newRating;
}

// Extract the function to generate new symbol string
function generateSymbolsString(rating, symbolCount, full, empty, half, supportsHalf) {
  let newSymbols = '';
  
  for (let i = 0; i < symbolCount; i++) {
    if (i < Math.floor(rating)) {
      newSymbols += full;
    } else if (supportsHalf && i === Math.floor(rating) && rating % 1 !== 0) {
      newSymbols += half;
    } else {
      newSymbols += empty;
    }
  }
  
  return newSymbols;
}

// Extract the function to format rating text
function formatRatingText(format, newRating, symbolCount, denominator, supportsHalf: boolean) {
  let newNumerator;
  if (format.includes('percent')) {
    newNumerator = Math.round((newRating / symbolCount) * 100);
  } else {
    newNumerator = newRating;
    if (!supportsHalf) {
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

// Extract the function to update the rating in the editor
function updateRatingInEditor(editor, line, start, newSymbols, updatedRatingText, originalSymbols, hasRatingText, ratingEndPosition) {
  let startPos = {line: line, ch: start};
  let endPos;

  if (hasRatingText === 'true') {
    // Use the stored rating end position
    endPos = {line: line, ch: parseInt(ratingEndPosition)};
  } else {
    // If there's no rating text, just replace the symbols
    endPos = {line: line, ch: start + getUnicodeCharLength(originalSymbols)};
  }

  // Replace the entire content
  editor.replaceRange(
    newSymbols + updatedRatingText,
    startPos,
    endPos
  );
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

class InteractiveRatingsPlugin extends Plugin {

  ratingsOverlay: HTMLElement | null;

  async onload() {
    // For editing mode, add event listener to the app's workspace
    this.registerDomEvent(document, 'mousemove', (evt) => {
      // Check if we're in editor mode using getActiveViewOfType instead of activeLeaf
      const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (!markdownView) return;
      
      // Check if the view is in source mode
      const isSourceMode = markdownView.getMode() !== 'preview';
      if (!isSourceMode) return;
      
      // Get the editor using the markdownView
      const editor = markdownView.editor;
      if (!editor) return;
  
      // Process the event
      this.handleEditorInteraction(evt, editor, 'mouse');
    });
  
    // Add touch event handlers
    this.registerDomEvent(document, 'touchstart', (evt) => {

      const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (!markdownView) return;
      
      const isSourceMode = markdownView.getMode() !== 'preview';
      if (!isSourceMode) return;
      
      const editor = markdownView.editor;
      if (!editor) return;
  
      this.handleEditorInteraction(evt, editor, 'touch');
    });
  
    // Touch move handler to update rating during drag
    this.registerDomEvent(document, 'touchmove', (evt) => {
      if (this.ratingsOverlay) {
        // Prevent scrolling when interacting with ratings
        evt.preventDefault();
        
        const clientX = evt.touches[0].clientX;
        const rating = calculateNewRating(this.ratingsOverlay, clientX);
        this.updateOverlayDisplay(this.ratingsOverlay, rating);
      }
    });
  
    // Touch end to finalize the selection
    this.registerDomEvent(document, 'touchend', (evt) => {
      if (this.ratingsOverlay) {
        const rating = parseFloat(this.ratingsOverlay.dataset.currentRating);
        this.applyRatingUpdate(rating);
        this.removeRatingsOverlay();
      }
    });
  }
  
  updateRatingInEditor(editor, line, start, newSymbols, updatedRatingText, originalSymbols, hasRatingText, ratingEndPosition) {
    let startPos = {line: line, ch: start};
    let endPos;
  
    if (hasRatingText === 'true') {
      // Use the stored rating end position
      endPos = {line: line, ch: parseInt(ratingEndPosition)};
    } else {
      // If there's no rating text, just replace the symbols
      endPos = {line: line, ch: start + getUnicodeCharLength(originalSymbols)};
    }
  
    // Replace the entire content
    editor.replaceRange(
      newSymbols + updatedRatingText,
      startPos,
      endPos
    );
  }
  
  updateOverlayDisplay(overlay, rating) {
    overlay.dataset.currentRating = rating.toString();
    
    const symbols = overlay.querySelectorAll('.interactive-ratings-symbol');
    const full = overlay.dataset.full;
    const empty = overlay.dataset.empty;
    const half = overlay.dataset.half;
    const supportsHalf = overlay.dataset.supportsHalf === 'true';
    
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
  
  applyRatingUpdate(rating) {
    const overlay = this.ratingsOverlay;
    if (!overlay) return;
    
    const editor = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
    if (!editor) return;
    
    const line = parseInt(overlay.dataset.linePosition.split('-')[0]);
    const start = parseInt(overlay.dataset.linePosition.split('-')[1]);
    const symbolCount = parseInt(overlay.dataset.symbolCount);
    const full = overlay.dataset.full;
    const empty = overlay.dataset.empty;
    const half = overlay.dataset.half;
    const supportsHalf = overlay.dataset.supportsHalf === 'true';
    const hasRatingText = overlay.dataset.hasRatingText;
    const originalSymbols = overlay.dataset.originalSymbols;
    
    // Generate new symbols string
    const newSymbols = generateSymbolsString(rating, symbolCount, full, empty, half, supportsHalf);
    
    // Handle rating text update
    let updatedRatingText = '';
    if (hasRatingText === 'true') {
      const format = overlay.dataset.ratingFormat;
      const denominator = parseInt(overlay.dataset.ratingDenominator);
      if (rating > denominator) {
        rating = denominator;
      }
      updatedRatingText = formatRatingText(format, rating, symbolCount, denominator, supportsHalf);
    }
    
    // Update the document
    this.updateRatingInEditor(
      editor, 
      line, 
      start, 
      newSymbols, 
      updatedRatingText, 
      originalSymbols, 
      hasRatingText, 
      overlay.dataset.ratingEndPosition
    );
  }

  handleEditorInteraction(event, editor, eventType) {
    // Clear any existing overlay if not interacting with it
    if (this.ratingsOverlay && !this.isInteractingWithElement(event, this.ratingsOverlay, eventType)) {
      this.removeRatingsOverlay();
    }
    
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    // Get the active markdown view
    const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!markdownView) return;

    // Get the editor container element (this should be stable across Obsidian versions)
    const editorEl = markdownView.contentEl.querySelector('.cm-editor');
    if (!editorEl) return;
    
    // Get editor position - works differently for mouse vs touch
    const editorPos = eventType === 'mouse' 
      ? editor.posAtMouse(event)
      : editor.posAtCoords({
          left: eventType === 'touch' ? event.touches[0].clientX : event.clientX, 
          top: eventType === 'touch' ? event.touches[0].clientY : event.clientY
        });
      
    if (!editorPos) return;
    
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
        
        // Check if interaction is inside the region
        if (this.isInteractionWithinRegion(event, startCoords, endCoords, eventType)) {
          // Determine pattern type by checking characters
          const pattern = match[0];
          const symbolSet = this.getSymbolSetForPattern(pattern);
          
          if (!symbolSet) continue;
          
          // Calculate original rating (count full symbols as 1.0 and half symbols as 0.5)
          const originalRating = this.calculateRating(pattern, symbolSet);
          
          // Create overlay if it doesn't exist or is for a different pattern
          if (!this.ratingsOverlay || this.ratingsOverlay.dataset.linePosition !== `${editorPos.line}-${start}`) {
            this.createEditorOverlay(editor, editorPos.line, start, pattern, originalRating, symbolSet, ratingText);
          }
          
          return;
        }
      }
    }
  }
  
  isInteractingWithElement(event, element, eventType) {
    const rect = element.getBoundingClientRect();
    const clientX = eventType === 'mouse' ? event.clientX : event.touches[0].clientX;
    const clientY = eventType === 'mouse' ? event.clientY : event.touches[0].clientY;
    
    return (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    );
  }
  
  isInteractionWithinRegion(event, startCoords, endCoords, eventType) {
    // Add a small buffer to make clicking/touching easier
    const buffer = 5; // Increased buffer for touch
    
    const clientX = eventType === 'mouse' ? event.clientX : event.touches[0].clientX;
    const clientY = eventType === 'mouse' ? event.clientY : event.touches[0].clientY;
    
    return (
      clientX >= startCoords.left - buffer &&
      clientX <= endCoords.right + buffer &&
      clientY >= startCoords.top - buffer &&
      clientY <= endCoords.bottom + buffer
    );
  }

  parseRatingText(line, start, end) {
    // Get the substring after the symbols using Unicode-aware functions
    const afterSymbols = getUnicodeSubstring(line, end, getUnicodeCharLength(line));
  
    // Check for rating patterns
    const ratingTextMatch = afterSymbols.match(/^\s*(?:\(([\d\.]+)\/(\d+)\)|([\d\.]+)\/(\d+)|(?:\()?(\d+)%(?:\))?)/);
  
    if (ratingTextMatch) {
      let format = '';
      let numerator = 0;
      let denominator = 0;
  
      if (ratingTextMatch[1] && ratingTextMatch[2]) {
        // (14.5/33) format
        format = 'fraction-parentheses';
        numerator = parseFloat(ratingTextMatch[1]);
        denominator = parseInt(ratingTextMatch[2]);
      } else if (ratingTextMatch[3] && ratingTextMatch[4]) {
        // 14.5/33 format
        format = 'fraction';
        numerator = parseFloat(ratingTextMatch[3]);
        denominator = parseInt(ratingTextMatch[4]);
      } else if (ratingTextMatch[5]) {
        // 60% or (60%) format
        format = afterSymbols.includes('(') ? 'percent-parentheses' : 'percent';
        numerator = parseInt(ratingTextMatch[5]);
        denominator = 100;
      }
  
      // Calculate the end position correctly with Unicode-aware calculations
      const endPosition = end + ratingTextMatch[0].length;
  
      return {
        format,
        numerator,
        denominator,
        text: ratingTextMatch[0],
        endPosition: endPosition
      };
    }
  
    return null;
  }
  

  handleEditorHover(event, editor) {
    // Clear any existing overlay
    if (this.ratingsOverlay && !this.isMouseOverElement(event, this.ratingsOverlay)) {
      this.removeRatingsOverlay();
    }
    
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    
    // Get the editor's info at the current position
    const editorPos = editor.posAtMouse(event);
    if (!editorPos) return;
    
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
        
        // Check if mouse is inside the region
        if (this.isMouseWithinRegion(event, startCoords, endCoords)) {
          // Determine pattern type by checking characters
          const pattern = match[0];
          const symbolSet = this.getSymbolSetForPattern(pattern);
          
          if (!symbolSet) continue;
          
          // Calculate original rating (count full symbols as 1.0 and half symbols as 0.5)
          const originalRating = this.calculateRating(pattern, symbolSet);
          
          // Create overlay if it doesn't exist or is for a different pattern
          if (!this.ratingsOverlay || this.ratingsOverlay.dataset.linePosition !== `${editorPos.line}-${start}`) {
            this.createEditorOverlay(editor, editorPos.line, start, pattern, originalRating, symbolSet, ratingText);
          }
          
          return;
        }
      }
    }
  }

  getSymbolSetForPattern(pattern) {
    // Find the symbol set that matches the pattern
    for (const symbolSet of SYMBOL_PATTERNS) {
      if (pattern.includes(symbolSet.full) || pattern.includes(symbolSet.empty) || 
          (symbolSet.half && pattern.includes(symbolSet.half))) {
        return symbolSet;
      }
    }
    return null;
  }

  calculateRating(pattern, symbolSet) {
    let rating = 0;
    // Use array spread to properly iterate over Unicode characters
    for (const char of [...pattern]) {
      if (char === symbolSet.full) rating += 1.0;
      else if (symbolSet.half && char === symbolSet.half) rating += 0.5;
    }
    return rating;
  }

  isMouseWithinRegion(event, startCoords, endCoords) {
    // Add a small buffer to make clicking easier
    const buffer = 2;
    
    return (
      event.clientX >= startCoords.left - buffer &&
      event.clientX <= endCoords.right + buffer &&
      event.clientY >= startCoords.top - buffer &&
      event.clientY <= endCoords.bottom + buffer
    );
  }
  
  isMouseOverElement(event, element) {
    const rect = element.getBoundingClientRect();
    return (
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    );
  }

  createEditorOverlay(editor, line, start, symbols, originalRating, symbolSet, ratingText) {
    // Get coordinates for the position
    const posCoords = editor.coordsAtPos({line: line, ch: start});
    if (!posCoords) return;
    
    // Create container for the overlay
    const overlay = document.createElement('div');

    overlay.tabIndex = 0;

    overlay.className = 'interactive-ratings-editor-overlay';
    overlay.style.position = 'fixed';
    overlay.style.zIndex = '1000';
    overlay.style.backgroundColor = 'var(--background-primary)';
    overlay.style.left = `${posCoords.left}px`;
  
    // Calculate a more precise vertical position
    const verticalAdjustment = 2.1;
    overlay.style.top = `${posCoords.top - verticalAdjustment}px`;
    
    // Store position information for comparison
    overlay.dataset.linePosition = `${line}-${start}`;
    
    // Store original rating and symbol information
    overlay.dataset.originalRating = originalRating;
    overlay.dataset.full = symbolSet.full;
    overlay.dataset.empty = symbolSet.empty;
    overlay.dataset.half = symbolSet.half || '';
    overlay.dataset.supportsHalf = symbolSet.half ? 'true' : 'false';
    overlay.dataset.originalSymbols = symbols;
  
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
    overlay.style.margin = '0';
    overlay.style.border = 'none';
    overlay.style.boxSizing = 'border-box';
    
    // Prevent any text selection that might cause movement
    overlay.style.userSelect = 'none';
    
    // Use Unicode-aware character counting
    const symbolCount = getUnicodeCharLength(symbols);
    overlay.dataset.symbolCount = symbolCount.toString();
  
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
      
      overlay.appendChild(symbolSpan);
    }
    
    // Add event listeners for mouse interactions
    this.addInteractionListeners(overlay);
    
    // Add to document
    document.body.appendChild(overlay);
    this.ratingsOverlay = overlay;
    this.ratingsOverlay.focus();
  }
  
  removeRatingsOverlay() {
    if (this.ratingsOverlay && this.ratingsOverlay.parentNode) {
      this.ratingsOverlay.blur();
      this.ratingsOverlay.parentNode.removeChild(this.ratingsOverlay);
      this.ratingsOverlay = null;
    }
  }

  addInteractionListeners(container) {
    const symbols = container.querySelectorAll('.interactive-ratings-symbol');
    const full = container.dataset.full;
    const empty = container.dataset.empty;
    const half = container.dataset.half;
    const supportsHalf = container.dataset.supportsHalf === 'true';
    
    // Mouse move handler
    container.addEventListener('mousemove', (e) => {
      const rating = calculateNewRating(container, e.clientX);
      this.updateOverlayDisplay(container, rating);
    });
    
    // Reset on mouse leave
    container.addEventListener('mouseleave', () => {
      // Reset to original state
      symbols.forEach((symbol) => {
        const originalChar = symbol.dataset.originalChar || empty;
        symbol.textContent = originalChar;
      });
    });
    
    // Click handler for mouse
    container.addEventListener('click', (e) => {
      const rating = calculateNewRating(container, e.clientX);
      this.applyRatingUpdate(rating);
      this.removeRatingsOverlay();
    });
  }

  onunload() {
    const styleEl = document.getElementById('interactive-ratings-style');
    if (styleEl) styleEl.remove();
    this.removeRatingsOverlay();
  }
}

module.exports = InteractiveRatingsPlugin;