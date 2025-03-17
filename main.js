const { Plugin } = require("obsidian");

// Define symbol patterns as a global constant
const SYMBOL_PATTERNS = [
  { full: '★', empty: '☆', half: null },    // Stars
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

class StarRatingPlugin extends Plugin {
  async onload() {
    console.log('Loading Star Rating plugin');

    // For editing mode, add event listener to the app's workspace
    this.registerDomEvent(document, 'mousemove', (evt) => {
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
      
      // Check if target is in the editor
      const editorEl = editor.editorComponent.editorEl;
      if (!editorEl.contains(evt.target)) return;
      
      // Process the event
      this.handleEditorHover(evt, editor);
    });

    // Add CSS to the document
    this.addStyle();
  }

  handleEditorHover(event, editor) {
    // Clear any existing overlay
    if (this.starOverlay && !this.isMouseOverElement(event, this.starOverlay)) {
      this.removeStarOverlay();
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
        const end = start + 5;
        
        // Calculate character position range
        const startPos = {line: editorPos.line, ch: start};
        const endPos = {line: editorPos.line, ch: end};
        
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
          if (!this.starOverlay || this.starOverlay.dataset.linePosition !== `${editorPos.line}-${start}`) {
            this.createEditorOverlay(editor, editorPos.line, start, pattern, originalRating, symbolSet);
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
    for (const char of pattern) {
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

  createEditorOverlay(editor, line, start, symbols, originalRating, symbolSet) {
    // Get coordinates for the position
    const posCoords = editor.coordsAtPos({line: line, ch: start});
    if (!posCoords) return;
    
    // Create container for the overlay
    const overlay = document.createElement('div');
    overlay.className = 'star-rating-editor-overlay';
    overlay.style.position = 'fixed';
    overlay.style.zIndex = '1000';
    overlay.style.backgroundColor = 'var(--background-primary)';
    overlay.style.left = `${posCoords.left}px`;

    // TODO Calculate a more precise vertical position
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
    
    const symbolCount = symbols.length;
    overlay.dataset.symbolCount = symbolCount;

    // Add symbols to the overlay
    for (let i = 0; i < symbolCount; i++) {
      const symbolSpan = document.createElement('span');
      symbolSpan.className = 'star-rating-star';
      symbolSpan.textContent = symbols[i];
      symbolSpan.dataset.position = i.toString();
      symbolSpan.dataset.originalChar = symbols[i];

      symbolSpan.style.padding = '0';
      symbolSpan.style.margin = '0';
      symbolSpan.style.height = 'auto';
      symbolSpan.style.display = 'inline-block';
      symbolSpan.style.width = `${100 / symbolCount}%`; // Make each star take equal width
      
      overlay.appendChild(symbolSpan);
    }
    
    // Add event listeners
    this.addHoverListeners(overlay);
    
    // Add click listener to update text
    overlay.addEventListener('click', (e) => {
      const containerRect = overlay.getBoundingClientRect();
      const symbolCount = parseInt(overlay.dataset.symbolCount);
      const starWidth = containerRect.width / symbolCount;
      const relativeX = e.clientX - containerRect.left;
      const clickedStarIndex = Math.floor(relativeX / starWidth);
      const positionWithinStar = (relativeX % starWidth) / starWidth;
      
      // Determine if we should use half star or full star based on where within the star was clicked
      const supportsHalf = overlay.dataset.supportsHalf === 'true';
      const useHalfStar = supportsHalf && positionWithinStar < 0.5;
      
      let newRating = clickedStarIndex + (useHalfStar ? 0.5 : 1);
      const full = overlay.dataset.full;
      const empty = overlay.dataset.empty;
      const half = overlay.dataset.half;
      
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

      // Update the editor
      editor.replaceRange(
        newSymbols,
        {line: line, ch: start},
        {line: line, ch: start + symbolCount}
      );
      
      this.removeStarOverlay();
    });
    
    // Add to document
    document.body.appendChild(overlay);
    this.starOverlay = overlay;
  }

  removeStarOverlay() {
    if (this.starOverlay && this.starOverlay.parentNode) {
      this.starOverlay.parentNode.removeChild(this.starOverlay);
      this.starOverlay = null;
    }
  }

  addHoverListeners(container) {
    const stars = container.querySelectorAll('.star-rating-star');
    const full = container.dataset.full;
    const empty = container.dataset.empty;
    const half = container.dataset.half;
    const supportsHalf = container.dataset.supportsHalf === 'true';
    
    container.addEventListener('mousemove', (e) => {
      const containerRect = container.getBoundingClientRect();
      const symbolCount = parseInt(container.dataset.symbolCount);
      const starWidth = containerRect.width / symbolCount;
      const relativeX = e.clientX - containerRect.left;
      const hoveredStarIndex = Math.floor(relativeX / starWidth);
      const positionWithinStar = (relativeX % starWidth) / starWidth;
      
      // Determine if we're in the first or second half of the star
      const useHalfStar = supportsHalf && positionWithinStar < 0.5;
      
      // Calculate current rating with half-star precision if supported
      const currentRating = hoveredStarIndex + (useHalfStar ? 0.5 : 1);
      container.dataset.currentRating = currentRating.toString();
      
      stars.forEach((star, index) => {
        if (index < Math.floor(currentRating)) {
          star.textContent = full;
        } else if (supportsHalf && index === Math.floor(currentRating) && currentRating % 1 !== 0) {
          star.textContent = half;
        } else {
          star.textContent = empty;
        }
      });
    });
    
    container.addEventListener('mouseleave', () => {
      // Reset to original state
      stars.forEach((star) => {
        const originalChar = star.dataset.originalChar || empty;
        star.textContent = originalChar;
      });
    });
  }

  addStyle() {
    const css = `
      .star-rating-container {
        display: inline-block;
        cursor: pointer;
      }
      
      .star-rating-star {
        display: inline-block;
        transition: transform 0.1s ease;
      }
      
      .star-rating-editor-overlay {
        display: inline-block;
        cursor: pointer;
      }
    `;
    
    const styleEl = document.createElement('style');
    styleEl.id = 'star-rating-style';
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }

  onunload() {
    console.log('Unloading Star Rating plugin');
    const styleEl = document.getElementById('star-rating-style');
    if (styleEl) styleEl.remove();
    this.removeStarOverlay();
  }
}

module.exports = StarRatingPlugin;