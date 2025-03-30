import { Editor, MarkdownView } from 'obsidian';
import { LOGGING_ENABLED } from './constants';
import { isInteractionWithinRegion, isInteractingWithElement } from './ratings-calculator';
import { calculateRating, generateSymbolRegexPatterns, getSymbolSetForPattern, parseRatingText } from './ratings-parser';
import { EditorInteractionEvent, ExtendedEditor, InteractionType, RatingText } from './types';
import { calculateNewRating, getUnicodeCharLength } from './utils';

/**
 * Handle editor interactions (mouse or touch) to detect and process rating patterns
 */
export function handleEditorInteraction(
  event: EditorInteractionEvent,
  editor: ExtendedEditor,
  eventType: InteractionType,
  ratingsOverlay: HTMLElement | null,
  removeRatingsOverlayFn: () => void, 
  createEditorOverlayFn: (
    editor: ExtendedEditor, 
    line: number, 
    start: number, 
    symbols: string, 
    originalRating: number, 
    symbolSet: any, 
    ratingText: RatingText | null
  ) => void
): void {
  // Clear any existing overlay if not interacting with it
  if (ratingsOverlay && !isInteractingWithElement(event, ratingsOverlay, eventType)) {
    if (LOGGING_ENABLED) {
      console.debug(`[InteractiveRatings] Removing overlay as interaction moved away`);
    }
    removeRatingsOverlayFn();
  }

  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  // Get editor position - works differently for mouse vs touch
  const editorPos = eventType === 'mouse'
    ? editor.posAtMouse(event as MouseEvent)
    : editor.posAtCoords({
      left: eventType === 'touch' ? event.touches[0].clientX : event.clientX,
      top: eventType === 'touch' ? event.touches[0].clientY : event.clientY
    });

  if (!editorPos) return;

  // Get the line at the current position
  const line = editor.getLine(editorPos.line);

  // Generate regex patterns from the symbol sets
  const symbolRegexes = generateSymbolRegexPatterns();

  // Check for all symbol patterns
  for (const regex of symbolRegexes) {
    let match;
    while ((match = regex.exec(line)) !== null) {
      const start = match.index;
      const end = start + getUnicodeCharLength(match[0]);

      // Parse rating text if present
      const ratingText = parseRatingText(line, start, end);
      const textEndPosition = ratingText ? ratingText.endPosition : end;

      // Calculate character position range
      const startPos = { line: editorPos.line, ch: start };
      const endPos = { line: editorPos.line, ch: textEndPosition };

      // Get screen coordinates for start and end of pattern
      const startCoords = editor.coordsAtPos(startPos);
      const endCoords = editor.coordsAtPos(endPos);

      if (!startCoords || !endCoords) continue;

      // Check if interaction is inside the region
      if (isInteractionWithinRegion(event, startCoords, endCoords, eventType)) {
        // Determine pattern type by checking characters
        const pattern = match[0];

        if (LOGGING_ENABLED) {
          console.debug(`[InteractiveRatings] Detected rating pattern`, {
            pattern,
            line: editorPos.line,
            start,
            end,
            ratingText: ratingText ? JSON.stringify(ratingText) : 'none'
          });
        };

        const symbolSet = getSymbolSetForPattern(pattern);

        if (!symbolSet) continue;

        // Calculate original rating (count full symbols as 1.0 and half symbols as 0.5)
        const originalRating = calculateRating(pattern, symbolSet);

        if (LOGGING_ENABLED) {
          console.info(`[InteractiveRatings] Detected original rating`, {
            originalRating,
            pattern,
            symbolSet: JSON.stringify(symbolSet)
          });
        }

        // Create overlay if it doesn't exist or is for a different pattern
        if (!ratingsOverlay || ratingsOverlay.dataset.linePosition !== `${editorPos.line}-${start}`) {
          createEditorOverlayFn(editor, editorPos.line, start, pattern, originalRating, symbolSet, ratingText);
        }

        return;
      }
    }
  }
}

/**
 * Handle touch move event for rating overlays
 */
export function handleTouchMove(
  event: TouchEvent, 
  ratingsOverlay: HTMLElement | null,
  updateOverlayDisplayFn: (overlay: HTMLElement, rating: number) => void
): void {
  if (ratingsOverlay) {
    if (LOGGING_ENABLED) {
      console.debug(`[InteractiveRatings] Touch move event while overlay exists`, {
        touches: event.touches.length,
        clientX: event.touches[0]?.clientX,
        clientY: event.touches[0]?.clientY
      });
    }

    // Prevent scrolling when interacting with ratings
    event.preventDefault();

    const clientX = event.touches[0].clientX;
    const rating = calculateNewRating(ratingsOverlay, clientX);
    updateOverlayDisplayFn(ratingsOverlay, rating);
  }
}

/**
 * Handle touch end event for rating overlays
 */
export function handleTouchEnd(
  event: TouchEvent, 
  ratingsOverlay: HTMLElement | null,
  applyRatingUpdateFn: (rating: number) => void,
  removeRatingsOverlayFn: () => void
): void {
  if (ratingsOverlay) {
    if (LOGGING_ENABLED) {
      console.debug(`[InteractiveRatings] Touch end event while overlay exists`);
    }

    const rating = parseFloat(ratingsOverlay.dataset.currentRating);
    if (LOGGING_ENABLED) {
      console.info(`[InteractiveRatings] Finalizing rating from touch`, { rating });
    }

    applyRatingUpdateFn(rating);
    removeRatingsOverlayFn();
  }
}

// calculateNewRating imported from utils.ts

/**
 * Check if we are in source mode in an editor view
 */
export function isInSourceMode(app: any): {isSourceMode: boolean, editor: ExtendedEditor | null, markdownView: MarkdownView | null} {
  // Check if we're in editor mode using getActiveViewOfType
  const markdownView = app.workspace.getActiveViewOfType(MarkdownView);
  if (!markdownView) {
    return { isSourceMode: false, editor: null, markdownView: null };
  }

  // Check if the view is in source mode
  const isSourceMode = markdownView.getMode() !== 'preview';
  if (!isSourceMode) {
    return { isSourceMode: false, editor: null, markdownView: null };
  }

  // Get the editor using the markdownView
  const editor = markdownView.editor as ExtendedEditor;
  if (!editor) {
    return { isSourceMode: false, editor: null, markdownView: null };
  }

  return { isSourceMode: true, editor, markdownView };
}
