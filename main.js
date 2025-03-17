const { Plugin } = require("obsidian");

class StarRatingPlugin extends Plugin {
  async onload() {
    console.log('Loading Star Rating plugin');

    // Register the markdown post processor
    this.registerMarkdownPostProcessor((element, context) => {
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
            star.style.transition = 'opacity 0.1s ease';
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
    });

    // Add CSS to the document
    this.addStyle();
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
      // Reset to original state (could be improved to remember original state)
      stars.forEach((star, index) => {
        const originalChar = star.dataset.originalChar || '☆';
        star.textContent = originalChar;
      });
    });
    
    // Store original state when first encountered
    stars.forEach((star) => {
      star.dataset.originalChar = star.textContent;
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
  }
}

module.exports = StarRatingPlugin;