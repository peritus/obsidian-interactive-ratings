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

class InteractiveRatingsPlugin extends Plugin {
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
          if (!this.starOverlay || this.starOverlay.dataset.linePosition !== `${editorPos.line}-${start}`) {
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
    
    // Use Unicode-aware character counting
    const symbolCount = getUnicodeCharLength(symbols);
    overlay.dataset.symbolCount = symbolCount;

    // Add symbols to the overlay - properly iterate over Unicode characters
    const symbolsArray = [...symbols];
    for (let i = 0; i < symbolCount; i++) {
      const symbolSpan = document.createElement('span');
      symbolSpan.className = 'star-rating-star';
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
      if (newRating < 0) {
        newRating = 0;
      }
    
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
    
      // Handle rating text update
      let updatedRatingText = '';
      if (overlay.dataset.hasRatingText === 'true') {
        const format = overlay.dataset.ratingFormat;
        const denominator = parseInt(overlay.dataset.ratingDenominator);
    
        // Calculate new numerator based on rating
        let newNumerator;
        if (format.includes('percent')) {
          newNumerator = Math.round((newRating / symbolCount) * 100);
        } else {
          newNumerator = newRating;
          if (overlay.dataset.supportsHalf !== 'true') {
            newNumerator = Math.round(newNumerator);
          }
        }
    
        // Format the text based on the original format
        switch (format) {
          case 'fraction':
            updatedRatingText = ` ${newNumerator}/${denominator}`;
            break;
          case 'fraction-parentheses':
            updatedRatingText = ` (${newNumerator}/${denominator})`;
            break;
          case 'percent':
            updatedRatingText = ` ${newNumerator}%`;
            break;
          case 'percent-parentheses':
            updatedRatingText = ` (${newNumerator}%)`;
            break;
        }
      }
    
      // IMPORTANT: Make sure we're replacing the entire content, including the rating text
      let startPos = {line: line, ch: start};
      let endPos;
    
      if (overlay.dataset.hasRatingText === 'true') {
        // Use the stored rating end position
        endPos = {line: line, ch: parseInt(overlay.dataset.ratingEndPosition)};
      } else {
        // If there's no rating text, just replace the symbols
        endPos = {line: line, ch: start + getUnicodeCharLength(symbols)};
      }
    
      // Replace the entire content
      editor.replaceRange(
        newSymbols + updatedRatingText,
        startPos,
        endPos
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
      
      .interactive-ratings-editor-overlay {
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

module.exports = InteractiveRatingsPlugin;