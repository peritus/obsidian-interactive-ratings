import { LOGGING_ENABLED } from './constants';
import { calculateNewRating, formatRatingText, generateSymbolsString } from './utils';

/**
 * Inline Rating Widget - Custom HTML Element with improved structure
 * Container: <interactive-rating>
 *   - <interactive-rating-data-pattern> (symbols only, interactive)
 *   - <interactive-rating-text> (text label, non-interactive)
 */
export class InlineRatingWidget extends HTMLElement {
  private originalPattern: string = '';
  private originalRating: number = 0;
  private currentRating: number = 0;
  private symbolCount: number = 0;
  private isInteracting: boolean = false;
  
  // DOM elements
  private symbolsElement: HTMLElement | null = null;
  private textElement: HTMLElement | null = null;
  
  // Symbol set properties
  private fullSymbol: string = '';
  private emptySymbol: string = '';
  private halfSymbol: string = '';
  private supportsHalf: boolean = false;
  
  // Rating text properties
  private hasRatingText: boolean = false;
  private ratingFormat: string = '';
  private ratingNumerator: number = 0;
  private ratingDenominator: number = 0;
  private originalRatingText: string = '';

  connectedCallback() {
    this.className = 'interactive-ratings-inline-widget';
    this.initializeFromDataset();
    this.createStructure();
    this.setupEventListeners();
    this.render();
    
    if (LOGGING_ENABLED) {
      console.debug('[InteractiveRatings] Inline rating widget connected', {
        originalPattern: this.originalPattern,
        originalRating: this.originalRating,
        hasRatingText: this.hasRatingText
      });
    }
  }

  disconnectedCallback() {
    if (LOGGING_ENABLED) {
      console.debug('[InteractiveRatings] Inline rating widget disconnected');
    }
  }

  /**
   * Initialize widget properties from dataset
   */
  private initializeFromDataset(): void {
    this.originalPattern = this.dataset.pattern || '';
    this.originalRating = parseFloat(this.dataset.originalRating || '0');
    this.currentRating = this.originalRating;
    
    // Symbol set
    this.fullSymbol = this.dataset.symbolSetFull || '★';
    this.emptySymbol = this.dataset.symbolSetEmpty || '☆';
    this.halfSymbol = this.dataset.symbolSetHalf || '';
    this.supportsHalf = this.dataset.supportsHalf === 'true';
    
    // Calculate symbol count from original pattern
    this.symbolCount = [...this.originalPattern].length;
    
    // Rating text
    this.hasRatingText = this.dataset.hasRatingText === 'true';
    if (this.hasRatingText) {
      this.ratingFormat = this.dataset.ratingFormat || '';
      this.ratingNumerator = parseFloat(this.dataset.ratingNumerator || '0');
      this.ratingDenominator = parseInt(this.dataset.ratingDenominator || '5');
      this.originalRatingText = this.dataset.ratingText || '';
    }
  }

  /**
   * Create the improved DOM structure
   */
  private createStructure(): void {
    // Clear any existing content
    this.innerHTML = '';
    
    // Create symbols element (interactive)
    this.symbolsElement = document.createElement('interactive-rating-data-pattern');
    this.symbolsElement.className = 'interactive-rating-symbols';
    this.appendChild(this.symbolsElement);
    
    // Create text element (non-interactive) if needed
    if (this.hasRatingText) {
      this.textElement = document.createElement('interactive-rating-text');
      this.textElement.className = 'interactive-rating-text';
      this.appendChild(this.textElement);
    }
  }

  /**
   * Setup event listeners for interaction
   */
  private setupEventListeners(): void {
    // Only attach interactive events to the symbols element
    if (this.symbolsElement) {
      this.symbolsElement.addEventListener('pointerenter', this.handlePointerEnter.bind(this));
      this.symbolsElement.addEventListener('pointerleave', this.handlePointerLeave.bind(this));
      this.symbolsElement.addEventListener('pointermove', this.handlePointerMove.bind(this));
      this.symbolsElement.addEventListener('pointerdown', this.handlePointerDown.bind(this));
      this.symbolsElement.addEventListener('pointerup', this.handlePointerUp.bind(this));
      
      // Touch events for better mobile support
      this.symbolsElement.style.touchAction = 'none';
    }
    
    // Keyboard accessibility on the container
    this.tabIndex = 0;
    this.setAttribute('role', 'slider');
    this.setAttribute('aria-valuemin', '0');
    this.setAttribute('aria-valuemax', this.symbolCount.toString());
    this.setAttribute('aria-valuenow', this.currentRating.toString());
    
    this.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  /**
   * Handle pointer enter - start interaction mode
   */
  private handlePointerEnter(event: PointerEvent): void {
    if (this.symbolsElement) {
      this.symbolsElement.classList.add('interactive-ratings-hover');
    }
    
    if (LOGGING_ENABLED) {
      console.debug('[InteractiveRatings] Widget pointer enter');
    }
  }

  /**
   * Handle pointer leave - end interaction mode
   */
  private handlePointerLeave(event: PointerEvent): void {
    if (!this.isInteracting && this.symbolsElement) {
      this.symbolsElement.classList.remove('interactive-ratings-hover');
      this.currentRating = this.originalRating;
      this.render();
    }
    
    if (LOGGING_ENABLED) {
      console.debug('[InteractiveRatings] Widget pointer leave');
    }
  }

  /**
   * Handle pointer move - update rating preview
   */
  private handlePointerMove(event: PointerEvent): void {
    if (this.symbolsElement && this.symbolsElement.classList.contains('interactive-ratings-hover')) {
      const rating = this.calculateRatingFromPosition(event.clientX);
      this.currentRating = rating;
      this.render();
      
      if (LOGGING_ENABLED) {
        console.debug('[InteractiveRatings] Widget rating preview', { rating });
      }
    }
  }

  /**
   * Handle pointer down - start interaction
   */
  private handlePointerDown(event: PointerEvent): void {
    this.isInteracting = true;
    event.preventDefault();
    
    if (this.symbolsElement) {
      try {
        this.symbolsElement.setPointerCapture(event.pointerId);
      } catch (e) {
        // Ignore pointer capture errors
      }
    }
    
    if (LOGGING_ENABLED) {
      console.debug('[InteractiveRatings] Widget interaction started');
    }
  }

  /**
   * Handle pointer up - finalize rating
   */
  private handlePointerUp(event: PointerEvent): void {
    if (this.isInteracting) {
      const finalRating = this.calculateRatingFromPosition(event.clientX);
      this.applyRating(finalRating);
      this.isInteracting = false;
      
      if (this.symbolsElement) {
        this.symbolsElement.classList.remove('interactive-ratings-hover');
        
        try {
          if (this.symbolsElement.hasPointerCapture(event.pointerId)) {
            this.symbolsElement.releasePointerCapture(event.pointerId);
          }
        } catch (e) {
          // Ignore pointer capture errors
        }
      }
      
      if (LOGGING_ENABLED) {
        console.info('[InteractiveRatings] Widget rating applied', { finalRating });
      }
    }
  }

  /**
   * Handle keyboard navigation
   */
  private handleKeyDown(event: KeyboardEvent): void {
    let newRating = this.currentRating;
    
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        newRating = Math.max(0, this.currentRating - (this.supportsHalf ? 0.5 : 1));
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        newRating = Math.min(this.symbolCount, this.currentRating + (this.supportsHalf ? 0.5 : 1));
        break;
      case 'Home':
        newRating = 0;
        break;
      case 'End':
        newRating = this.symbolCount;
        break;
      case 'Enter':
      case ' ':
        this.applyRating(this.currentRating);
        return;
      default:
        return; // Don't prevent default for other keys
    }
    
    event.preventDefault();
    this.currentRating = newRating;
    this.render();
    this.setAttribute('aria-valuenow', this.currentRating.toString());
  }

  /**
   * Calculate rating from mouse/touch position (only considers symbols element)
   */
  private calculateRatingFromPosition(clientX: number): number {
    if (!this.symbolsElement) return this.currentRating;
    
    const rect = this.symbolsElement.getBoundingClientRect();
    const symbolWidth = rect.width / this.symbolCount;
    const relativeX = clientX - rect.left;
    
    let rating = Math.min(Math.max(0, relativeX / symbolWidth), this.symbolCount);
    
    if (this.supportsHalf) {
      // Round to nearest 0.5
      rating = Math.round(rating * 2) / 2;
    } else {
      // Round to nearest integer
      rating = Math.round(rating);
    }
    
    return rating;
  }

  /**
   * Apply the rating and update the source document
   */
  private applyRating(rating: number): void {
    // TODO: Implement document update
    // This will need access to the editor and source location
    this.originalRating = rating;
    this.currentRating = rating;
    this.render();
    
    if (LOGGING_ENABLED) {
      console.info('[InteractiveRatings] Rating applied to widget', { rating });
    }
  }

  /**
   * Render the current rating display
   */
  private render(): void {
    // Generate symbols string
    const symbolsString = generateSymbolsString(
      this.currentRating,
      this.symbolCount,
      this.fullSymbol,
      this.emptySymbol,
      this.halfSymbol,
      this.supportsHalf
    );
    
    // Update symbols element
    if (this.symbolsElement) {
      this.symbolsElement.textContent = symbolsString;
    }
    
    // Generate and update rating text if applicable
    if (this.hasRatingText && this.textElement) {
      let adjustedRating = this.currentRating;
      if (this.currentRating > this.ratingDenominator) {
        adjustedRating = this.ratingDenominator;
      }
      
      const ratingTextString = formatRatingText(
        this.ratingFormat,
        adjustedRating,
        this.symbolCount,
        this.ratingDenominator,
        this.supportsHalf
      );
      
      this.textElement.textContent = ratingTextString;
    }
    
    // Update accessibility
    this.setAttribute('aria-valuenow', this.currentRating.toString());
    this.setAttribute('aria-valuetext', `${this.currentRating} out of ${this.symbolCount} stars`);
  }
}
