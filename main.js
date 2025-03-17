const { Plugin } = require("obsidian");

class StarRatingPlugin extends Plugin {
  async onload() {
    console.log('Loading Star Rating plugin');

    // Register the markdown post processor for Reading mode
    this.registerMarkdownPostProcessor((element, context) => {
      this.processStarRatings(element);
    });

    // For editing mode, add event listener to the app's workspace
    this.registerDomEvent(document, 'mouseover', (evt) => {
      // Check if we're in editor mode
      const activeLeaf = this.app.workspace.activeLeaf;
      if (!activeLeaf || !activeLeaf.view || activeLeaf.view.getMode() !== 'source') return;
      
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

  processStarRatings(element) {
    // Find all text nodes in the document
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    const nodesToProcess = [];
    let currentNode;
    
    // Collect all text nodes
    while ((currentNode = walker.nextNode())) {
      if (currentNode.nodeValue.match(/[★☆]{5}/)) {
        nodesToProcess.push(currentNode);
      }
    }

    // Process each node containing star patterns
    nodesToProcess.forEach(textNode => {
      const text = textNode.nodeValue;
      const matches = text.match(/([★☆]{5})/g);
      
      if (!matches) return;
      
      let lastIndex = 0;
      const fragments = [];
      
      // Split the text into fragments with star ratings converted to interactive elements
      for (const match of matches) {
        const index = text.indexOf(match, lastIndex);
        
        // Add text before the match
        if (index > lastIndex) {
          fragments.push(document.createTextNode(text.substring(lastIndex, index)));
        }
        
        // Create interactive rating container
        const ratingContainer = document.createElement('span');
        ratingContainer.className = 'star-rating-container';
        ratingContainer.style.display = 'inline-block';
        ratingContainer.style.cursor = 'pointer';
        
        // Add individual star elements
        for (let i = 0; i < 5; i++) {
          const star = document.createElement('span');
          star.className = 'star-rating-star';
          star.textContent = match[i] === '★' ? '★' : '☆';
          star.dataset.position = i.toString();
          star.dataset.originalChar = match[i];
          ratingContainer.appendChild(star);
        }
        
        // Add hover event listeners
        this.addHoverListeners(ratingContainer);
        
        fragments.push(ratingContainer);
        lastIndex = index + match.length;
      }
      
      // Add any remaining text
      if (lastIndex < text.length) {
        fragments.push(document.createTextNode(text.substring(lastIndex)));
      }
      
      // Replace the original text node with the fragments
      const parent = textNode.parentNode;
      fragments.forEach(fragment => {
        parent.insertBefore(fragment, textNode);
      });
      parent.removeChild(textNode);
    });
  }

  handleEditorHover(event, editor) {
    // Clear any existing overlay
    this.removeStarOverlay();
    
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
    let foundMatch = false;
    
    while ((match = starRegex.exec(line)) !== null) {
      const start = match.index;
      const end = start + 5;
      
      // Check if the cursor is within this sequence
      if (editorPos.ch >= start && editorPos.ch <= end) {
        foundMatch = true;
        
        // Create overlay
        this.createEditorOverlay(editor, editorPos.line, start, match[0]);
        break;
      }
    }
  }

  createEditorOverlay(editor, line, start, stars) {
    // Get coordinates for the position
    const posCoords = editor.coordsAtPos({line: line, ch: start});
    if (!posCoords) return;
    
    // Create container for the overlay
    const overlay = document.createElement('div');
    overlay.className = 'star-rating-editor-overlay';
    overlay.style.position = 'absolute';
    overlay.style.zIndex = '1000';
    overlay.style.backgroundColor = 'var(--background-primary)';
    overlay.style.borderRadius = '4px';
    overlay.style.padding = '2px';
    overlay.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
    overlay.style.left = `${posCoords.left}px`;
    overlay.style.top = `${posCoords.top}px`;
    
    // Add stars to the overlay
    for (let i = 0; i < 5; i++) {
      const star = document.createElement('span');
      star.className = 'star-rating-star';
      star.textContent = stars[i];
      star.dataset.position = i.toString();
      star.dataset.originalChar = stars[i];
      overlay.appendChild(star);
    }
    
    // Add event listeners
    this.addHoverListeners(overlay);
    
    // Add click listener to update text
    overlay.addEventListener('click', (e) => {
      const target = e.target;
      if (!target.classList.contains('star-rating-star')) return;
      
      const position = parseInt(target.dataset.position);
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
    
    // Add mouseleave to remove overlay
    overlay.addEventListener('mouseleave', () => {
      setTimeout(() => this.removeStarOverlay(), 300);
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
        color: gold;
        font-size: 1.2em;
        cursor: pointer;
      }
      
      .star-rating-star {
        display: inline-block;
        transition: transform 0.1s ease;
      }
      
      .star-rating-star:hover {
        transform: scale(1.2);
      }
      
      .star-rating-editor-overlay {
        display: inline-block;
        color: gold;
        font-size: 1.2em;
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