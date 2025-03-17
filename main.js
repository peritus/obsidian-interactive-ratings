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
    
    // Check for star sequences
    const starRegex = /[★☆]{5}/g;
    let match;
    
    while ((match = starRegex.exec(line)) !== null) {
      const start = match.index;
      const end = start + 5;
      
      // Calculate character position range
      const startPos = {line: editorPos.line, ch: start};
      const endPos = {line: editorPos.line, ch: end};
      
      // Get screen coordinates for start and end of star pattern
      const startCoords = editor.coordsAtPos(startPos);
      const endCoords = editor.coordsAtPos(endPos);
      
      if (!startCoords || !endCoords) continue;
      
      // Check if mouse is inside the star region
      if (this.isMouseWithinRegion(event, startCoords, endCoords)) {
        // Calculate original rating
        const originalRating = match[0].split('').filter(char => char === '★').length;
        
        // Create overlay if it doesn't exist or is for a different star pattern
        if (!this.starOverlay || this.starOverlay.dataset.linePosition !== `${editorPos.line}-${start}`) {
          this.createEditorOverlay(editor, editorPos.line, start, match[0], originalRating);
        }
        
        return;
      }
    }
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

  createEditorOverlay(editor, line, start, stars, originalRating) {
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
    
    // Add stars to the overlay
    for (let i = 0; i < 5; i++) {
      const star = document.createElement('span');
      star.className = 'star-rating-star';
      star.textContent = stars[i];
      star.dataset.position = i.toString();
      star.dataset.originalChar = stars[i];

      star.style.padding = '0';
      star.style.margin = '0';
      star.style.height = 'auto';
      star.style.display = 'inline-block';

      overlay.appendChild(star);
    }
    
    // Add event listeners
    this.addHoverListeners(overlay);
    
    // Add click listener to update text and log ratings
    overlay.addEventListener('click', (e) => {
      const target = e.target;
      if (!target.classList.contains('star-rating-star')) return;
      
      const position = parseInt(target.dataset.position);
      const originalRating = parseInt(overlay.dataset.originalRating);
      
      console.log(`Original rating: ${originalRating}/5, Current hover position: ${position + 1}/5`);
      
      let newStars = '';
      
      for (let i = 0; i < 5; i++) {
        newStars += i <= position ? '★' : '☆';
      }
      
      // Update the editor
      editor.replaceRange(
        newStars,
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
    
    container.addEventListener('mousemove', (e) => {
      const containerRect = container.getBoundingClientRect();
      const starWidth = containerRect.width / 5;
      const relativeX = e.clientX - containerRect.left;
      const hoveredPosition = Math.floor(relativeX / starWidth);
      
      // Update current hover position
      container.dataset.currentHoverPosition = (hoveredPosition + 1).toString();
      
      stars.forEach((star, index) => {
        if (index <= hoveredPosition) {
          star.textContent = '★';
        } else {
          star.textContent = '☆';
        }
      });
    });
    
    container.addEventListener('mouseleave', () => {
      // Reset to original state
      stars.forEach((star) => {
        const originalChar = star.dataset.originalChar || '☆';
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