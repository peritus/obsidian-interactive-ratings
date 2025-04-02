import { Editor } from 'obsidian';
import { LOGGING_ENABLED, OVERLAY_VERTICAL_ADJUSTMENT } from './constants';
import { ExtendedEditor, RatingText, SymbolSet } from './types';
import { calculateNewRating, formatRatingText, generateSymbolsString, getUnicodeCharLength } from './utils';

/**
 * Create an overlay for interactive rating editing
 */
export function createEditorOverlay(
  editor: ExtendedEditor,
  line: number,
  start: number,
  symbols: string,
  originalRating: number,
  symbolSet: SymbolSet,
  ratingText: RatingText | null,
  addInteractionListeners: (container: HTMLElement) => void
): HTMLElement | null {
  if (LOGGING_ENABLED) {
    console.group(`[InteractiveRatings] Creating editor overlay`);
  };
  if (LOGGING_ENABLED) {
    console.info(`[InteractiveRatings] Creating editor overlay`, {
      line,
      start,
      symbols,
      originalRating,
      symbolSet,
      ratingText: ratingText ? JSON.stringify(ratingText) : 'none'
    });
  };

  // First, remove all existing overlays
  document.querySelectorAll('.interactive-ratings-editor-overlay').forEach(el => {
    el.remove();
  });

  // Get coordinates for the position
  const posCoords = editor.coordsAtPos({ line: line, ch: start });
  if (!posCoords) {
    if (LOGGING_ENABLED) {
      console.warn(`[InteractiveRatings] Could not get coordinates for position`, { line, start });
      console.groupEnd();
    };
    return null;
  }

  // Create container for the overlay
  const overlay = document.createElement('div');

  overlay.tabIndex = 0;

  overlay.className = 'interactive-ratings-editor-overlay';
  // Set dynamic positioning based on editor coordinates
  overlay.style.left = `${posCoords.left}px`;
  overlay.style.top = `${posCoords.top - OVERLAY_VERTICAL_ADJUSTMENT}px`;

  // Store position information for comparison
  overlay.dataset.linePosition = `${line}-${start}`;

  // Store original rating and symbol information
  overlay.dataset.originalRating = originalRating.toString();
  overlay.dataset.full = symbolSet.full;
  overlay.dataset.empty = symbolSet.empty;
  overlay.dataset.half = symbolSet.half || '';
  overlay.dataset.supportsHalf = symbolSet.half ? 'true' : 'false';
  overlay.dataset.originalSymbols = symbols;

  if (ratingText) {
    overlay.dataset.hasRatingText = 'true';
    overlay.dataset.ratingFormat = ratingText.format;
    overlay.dataset.ratingNumerator = ratingText.numerator.toString();
    overlay.dataset.ratingDenominator = ratingText.denominator.toString();
    overlay.dataset.ratingText = ratingText.text;
    overlay.dataset.ratingEndPosition = ratingText.endPosition.toString();
  } else {
    overlay.dataset.hasRatingText = 'false';
  }

  // Track current hover position
  overlay.dataset.currentRating = "0";

  // Get the editor element and compute its styles that need to be applied dynamically
  const editorEl = editor.editorComponent.editorEl;
  const editorStyles = window.getComputedStyle(editorEl);

  // Apply editor-specific font properties which need to be computed at runtime
  overlay.style.fontFamily = editorStyles.fontFamily;
  overlay.style.fontSize = editorStyles.fontSize;
  overlay.style.fontWeight = editorStyles.fontWeight;
  overlay.style.letterSpacing = editorStyles.letterSpacing;
  overlay.style.lineHeight = editorStyles.lineHeight;
  overlay.style.verticalAlign = editorStyles.verticalAlign || 'baseline';

  // Use Unicode-aware character counting
  const symbolCount = getUnicodeCharLength(symbols);
  overlay.dataset.symbolCount = symbolCount.toString();

  if (LOGGING_ENABLED) {
    console.debug(`[InteractiveRatings] Constructed overlay element`, {
      position: `${posCoords.left}px, ${posCoords.top - OVERLAY_VERTICAL_ADJUSTMENT}px`,
      symbolCount,
      datasets: { ...overlay.dataset }
    });
  }

  // Add symbols to the overlay - properly iterate over Unicode characters
  const symbolsArray = [...symbols];
  for (let i = 0; i < symbolCount; i++) {
    const symbolSpan = document.createElement('span');
    symbolSpan.className = 'interactive-ratings-symbol';
    symbolSpan.textContent = symbolsArray[i];
    symbolSpan.dataset.position = i.toString();
    symbolSpan.dataset.originalChar = symbolsArray[i];

    overlay.appendChild(symbolSpan);
  }

  // Add event listeners for mouse interactions
  addInteractionListeners(overlay);

  // Add to document
  document.body.appendChild(overlay);
  overlay.focus();

  if (LOGGING_ENABLED) {
    console.info(`[InteractiveRatings] Editor overlay created successfully`);
    console.groupEnd();
  }

  return overlay;
}

/**
 * Update the rating overlay display based on the current rating
 */
export function updateOverlayDisplay(overlay: HTMLElement, rating: number): void {
  overlay.dataset.currentRating = rating.toString();

  const symbols = overlay.querySelectorAll('.interactive-ratings-symbol');
  const full = overlay.dataset.full;
  const empty = overlay.dataset.empty;
  const half = overlay.dataset.half;
  const supportsHalf = overlay.dataset.supportsHalf === 'true';

  if (LOGGING_ENABLED) {
    console.debug(`[InteractiveRatings] Updating overlay display`, {
      rating,
      full,
      empty,
      half,
      supportsHalf,
      symbolCount: symbols.length
    });
  }

  symbols.forEach((symbol, index) => {
    const oldContent = symbol.textContent;
    let newContent;

    if (index < Math.floor(rating)) {
      newContent = full;
    } else if (supportsHalf && index === Math.floor(rating) && rating % 1 !== 0) {
      newContent = half;
    } else {
      newContent = empty;
    }

    if (oldContent !== newContent) {
      if (LOGGING_ENABLED) {
        console.debug(`[InteractiveRatings] Symbol ${index} changing from ${oldContent} to ${newContent}`);
      }
      symbol.textContent = newContent;
    }
  });
}

/**
 * Remove the ratings overlay from the DOM
 */
export function removeRatingsOverlay(ratingsOverlay: HTMLElement | null): HTMLElement | null {
  if (LOGGING_ENABLED) {
    console.group(`[InteractiveRatings] Removing ratings overlay`);
  }

  if (ratingsOverlay) {
    if (ratingsOverlay.parentNode) {
      if (LOGGING_ENABLED) {
        console.info(`[InteractiveRatings] Removing ratings overlay from DOM`, {
          linePosition: ratingsOverlay.dataset.linePosition,
          currentRating: ratingsOverlay.dataset.currentRating
        });
      }

      ratingsOverlay.blur();
      ratingsOverlay.parentNode.removeChild(ratingsOverlay);
      return null;
    } else {
      console.warn("Ratings overlay exists but is not in DOM");
    }
  } else {
    console.debug("No ratings overlay to remove");
  }

  if (LOGGING_ENABLED) {
    console.groupEnd();
  }
  
  return ratingsOverlay;
}

/**
 * Update the rating in the editor
 */
export function updateRatingInEditor(
  editor: ExtendedEditor, 
  line: number, 
  start: number, 
  newSymbols: string, 
  updatedRatingText: string, 
  originalSymbols: string, 
  hasRatingText: string, 
  ratingEndPosition: string
): void {
  let startPos = { line: line, ch: start };
  let endPos;

  if (hasRatingText === 'true') {
    // Use the stored rating end position
    endPos = { line: line, ch: parseInt(ratingEndPosition) };
  } else {
    // If there's no rating text, just replace the symbols
    endPos = { line: line, ch: start + getUnicodeCharLength(originalSymbols) };
  }

  if (LOGGING_ENABLED) {
    console.info(`[InteractiveRatings] Updating document in editor`, {
      line,
      start,
      startPos,
      endPos,
      newSymbols,
      updatedRatingText,
      originalSymbols,
      hasRatingText,
      ratingEndPosition,
      finalContent: newSymbols + updatedRatingText
    });
  };

  // Replace the entire content
  editor.replaceRange(
    newSymbols + updatedRatingText,
    startPos,
    endPos
  );
}

/**
 * Apply the rating update to the editor
 */
export function applyRatingUpdate(
  editor: ExtendedEditor,
  overlay: HTMLElement,
  rating: number
): void {
  if (!overlay) return;

  const line = parseInt(overlay.dataset.linePosition.split('-')[0]);
  const start = parseInt(overlay.dataset.linePosition.split('-')[1]);
  const symbolCount = parseInt(overlay.dataset.symbolCount);
  const full = overlay.dataset.full;
  const empty = overlay.dataset.empty;
  const half = overlay.dataset.half;
  const supportsHalf = overlay.dataset.supportsHalf === 'true';
  const hasRatingText = overlay.dataset.hasRatingText;
  const originalSymbols = overlay.dataset.originalSymbols;

  if (LOGGING_ENABLED) {
    console.group(`[InteractiveRatings] Applying rating update`);
  };
  if (LOGGING_ENABLED) {
    console.info(`[InteractiveRatings] Rating update details`, {
      rating,
      line,
      start,
      symbolCount,
      full,
      empty,
      half,
      supportsHalf,
      hasRatingText,
      originalSymbols
    });
  };

  // Generate new symbols string
  const newSymbols = generateSymbolsString(rating, symbolCount, full, empty, half, supportsHalf);

  // Handle rating text update
  let updatedRatingText = '';
  if (hasRatingText === 'true') {
    const format = overlay.dataset.ratingFormat;
    const denominator = parseInt(overlay.dataset.ratingDenominator);
    let adjustedRating = rating;
    if (rating > denominator) {
      adjustedRating = denominator;
      if (LOGGING_ENABLED) {
        console.debug(`[InteractiveRatings] Rating capped to denominator`, { rating: adjustedRating, denominator });
      };
    }
    updatedRatingText = formatRatingText(format, adjustedRating, symbolCount, denominator, supportsHalf);
  }

  // Update the document
  updateRatingInEditor(
    editor,
    line,
    start,
    newSymbols,
    updatedRatingText,
    originalSymbols,
    hasRatingText,
    overlay.dataset.ratingEndPosition
  );

  if (LOGGING_ENABLED) {
    console.groupEnd();
  }
}

/**
 * Add interaction listeners to the overlay
 */
export function addInteractionListeners(
  container: HTMLElement,
  applyRatingFn: (rating: number) => void,
  removeOverlayFn: () => void
): void {
  if (LOGGING_ENABLED) {
    console.group(`[InteractiveRatings] Adding interaction listeners`);
    console.info("Adding interaction listeners to overlay", {
      linePosition: container.dataset.linePosition,
      symbolCount: container.dataset.symbolCount,
      supportsHalf: container.dataset.supportsHalf
    });
  }

  const symbols = container.querySelectorAll('.interactive-ratings-symbol');
  const full = container.dataset.full;
  const empty = container.dataset.empty;
  const half = container.dataset.half;
  const supportsHalf = container.dataset.supportsHalf === 'true';

  // Use pointer events for all interactions
  container.addEventListener('pointermove', (e) => {
    e.preventDefault(); // Prevent default behavior
    
    if (LOGGING_ENABLED) {
      console.debug(`[InteractiveRatings] Pointer move event on overlay`, {
        pointerType: e.pointerType,
        clientX: e.clientX,
        clientY: e.clientY,
        pointerId: e.pointerId
      });
    }

    const rating = calculateNewRating(container, e.clientX);
    updateOverlayDisplay(container, rating);
  });

  // Reset on pointer leave
  container.addEventListener('pointerleave', () => {
    if (LOGGING_ENABLED) {
      console.debug(`[InteractiveRatings] Pointer leave event on overlay`);
    }

    // Reset to original state
    symbols.forEach((symbol) => {
      const originalChar = (symbol as HTMLElement).dataset.originalChar || empty;
      symbol.textContent = originalChar;
    });
  });

  // Pointer down to capture the pointer
  container.addEventListener('pointerdown', (e) => {
    e.preventDefault(); // Prevent default behavior like cursor movement
    
    if (LOGGING_ENABLED) {
      console.debug(`[InteractiveRatings] Pointer down event on overlay`, {
        pointerType: e.pointerType,
        pointerId: e.pointerId
      });
    }

    // Capture pointer to ensure we get all events even if finger moves outside the element
    try {
      container.setPointerCapture(e.pointerId);
    } catch (e) {
      // Ignore errors with pointer capture
    }
  });

  // Pointer up to finalize the selection
  container.addEventListener('pointerup', (e) => {
    if (LOGGING_ENABLED) {
      console.info(`[InteractiveRatings] Pointer up event on overlay`, {
        pointerType: e.pointerType,
        clientX: e.clientX,
        clientY: e.clientY,
        pointerId: e.pointerId
      });
    }

    const rating = calculateNewRating(container, e.clientX);
    if (LOGGING_ENABLED) {
      console.debug(`[InteractiveRatings] Rating on pointer up`, { rating });
    }

    applyRatingFn(rating);
    removeOverlayFn();

    // Release pointer capture
    try {
      if (container.hasPointerCapture(e.pointerId)) {
        container.releasePointerCapture(e.pointerId);
      }
    } catch (e) {
      // Ignore errors with pointer capture
    }
  });

  if (LOGGING_ENABLED) {
    console.info("Interaction listeners added successfully");
    console.groupEnd();
  }
}
