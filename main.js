const { Plugin } = require("obsidian");

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
    
    // Define symbol patterns to detect - added the requested pairs
    const symbolPatterns = [
      /[★☆]{5}/g,               // Original star pattern
      /[●○]{5}/g,               // Circles (5)
      /[■□]{5}/g,               // Squares (6)
      /[▲△]{5}/g,               // Triangles (11)
    ];
    
    // Check for all symbol patterns
    for (const regex of symbolPatterns) {
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
          // Determine filled symbol by checking first character of pattern
          const pattern = match[0];
          const filledSymbol = pattern.charAt(0);
          const emptySymbol = pattern.charAt(pattern.length - 1) !== filledSymbol ? 
                              pattern.charAt(pattern.length - 1) : 
                              this.getEmptySymbolFor(filledSymbol);
          
          // Calculate original rating
          const originalRating = pattern.split('').filter(char => char === filledSymbol).length;
          
          // Create overlay if it doesn't exist or is for a different pattern
          if (!this.starOverlay || this.starOverlay.dataset.linePosition !== `${editorPos.line}-${start}`) {
            this.createEditorOverlay(editor, editorPos.line, start, pattern, originalRating, filledSymbol, emptySymbol);
          }
          
          return;
        }
      }
    }
  }

  // Helper function to get the empty symbol for a filled symbol
  getEmptySymbolFor(filledSymbol) {
    const symbolPairs = {
      '★': '☆',     // Original stars
      '●': '○',     // Circles
      '■': '□',     // Squares
      '▲': '△',     // Triangles
    };
    
    return symbolPairs[filledSymbol] || '☆'; // Default to empty star
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

  createEditorOverlay(editor, line, start, symbols, originalRating, filledSymbol, emptySymbol) {
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
    overlay.style.top = `${posCoords.top}px`;
    
    // Store position information for comparison
    overlay.dataset.linePosition = `${line}-${start}`;
    
    // Store original rating
    overlay.dataset.originalRating = originalRating;
    
    // Store symbols for this rating
    overlay.dataset.filledSymbol = filledSymbol;
    overlay.dataset.emptySymbol = emptySymbol;
    
    // Track current hover position
    overlay.dataset.currentHoverPosition = "0";

    // Get the editor element and compute its styles
    const editorEl = editor.editorComponent.editorEl;
    const editorStyles = window.getComputedStyle(editorEl);
    
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
    
    // Add symbols to the overlay
    for (let i = 0; i < 5; i++) {
      const symbolSpan = document.createElement('span');
      symbolSpan.className = 'star-rating-star';
      symbolSpan.textContent = symbols[i];
      symbolSpan.dataset.position = i.toString();
      symbolSpan.dataset.originalChar = symbols[i];

      symbolSpan.style.padding = '0';
      symbolSpan.style.margin = '0';
      symbolSpan.style.height = 'auto';
      symbolSpan.style.display = 'inline-block';

      overlay.appendChild(symbolSpan);
    }
    
    // Add event listeners
    this.addHoverListeners(overlay);
    
    // Add click listener to update text
    overlay.addEventListener('click', (e) => {
      const target = e.target;
      if (!target.classList.contains('star-rating-star')) return;
      
      const position = parseInt(target.dataset.position);
      const originalRating = parseInt(overlay.dataset.originalRating);
      const filledSymbol = overlay.dataset.filledSymbol;
      const emptySymbol = overlay.dataset.emptySymbol;
      
      console.log(`Original rating: ${originalRating}/5, Current hover position: ${position + 1}/5`);
      
      let newSymbols = '';
      
      for (let i = 0; i < 5; i++) {
        newSymbols += i <= position ? filledSymbol : emptySymbol;
      }
      
      // Update the editor
      editor.replaceRange(
        newSymbols,
        {line: line, ch: start},
        {line: line, ch: start + 5}
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
    const filledSymbol = container.dataset.filledSymbol;
    const emptySymbol = container.dataset.emptySymbol;
    
    container.addEventListener('mousemove', (e) => {
      const containerRect = container.getBoundingClientRect();
      const starWidth = containerRect.width / 5;
      const relativeX = e.clientX - containerRect.left;
      const hoveredPosition = Math.floor(relativeX / starWidth);
      
      // Update current hover position
      container.dataset.currentHoverPosition = (hoveredPosition + 1).toString();
      
      stars.forEach((star, index) => {
        if (index <= hoveredPosition) {
          star.textContent = filledSymbol;
        } else {
          star.textContent = emptySymbol;
        }
      });
    });
    
    container.addEventListener('mouseleave', () => {
      // Reset to original state
      stars.forEach((star) => {
        const originalChar = star.dataset.originalChar || emptySymbol;
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