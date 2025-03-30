import { App, MarkdownView, Plugin } from 'obsidian';
import { LOGGING_ENABLED } from './constants';
import { handleEditorInteraction, handlePointerMove, handlePointerUp, isInSourceMode } from './event-handlers';
import { calculateNewRating } from './utils';
import { adaptEvent, ExtendedEditor } from './types';
import { addInteractionListeners, applyRatingUpdate, createEditorOverlay, removeRatingsOverlay, updateOverlayDisplay } from './ratings-overlay';

export class InteractiveRatingsPlugin extends Plugin {
  app: App;
  ratingsOverlay: HTMLElement | null;

  async onload() {
    if (LOGGING_ENABLED) {
      console.info(`[InteractiveRatings] Plugin loading`);
    }

    // Use pointer events for all interactions
    this.registerDomEvent(document, 'pointermove', (evt: PointerEvent) => {
      const { isSourceMode, editor } = isInSourceMode(this.app);
      
      // First handle potential rating detection
      if (isSourceMode && editor) {
        this.handleInteraction(evt, editor);
      }
      
      // Then handle overlay movement if it exists
      handlePointerMove(evt, this.ratingsOverlay, this.updateOverlayDisplay.bind(this));
    });

    // Add pointer down for initial detection and pointer capture
    this.registerDomEvent(document, 'pointerdown', (evt: PointerEvent) => {
      const { isSourceMode, editor } = isInSourceMode(this.app);
      if (isSourceMode && editor) {
        this.handleInteraction(evt, editor);
      }
      
      // If we have an overlay and the event is within it, capture the pointer
      if (this.ratingsOverlay && evt.target instanceof HTMLElement) {
        const rect = this.ratingsOverlay.getBoundingClientRect();
        if (
          evt.clientX >= rect.left && 
          evt.clientX <= rect.right && 
          evt.clientY >= rect.top && 
          evt.clientY <= rect.bottom
        ) {
          try {
            this.ratingsOverlay.setPointerCapture(evt.pointerId);
          } catch (e) {
            // Ignore errors with pointer capture
          }
        }
      }
    });

    // Pointer up to finalize the selection
    this.registerDomEvent(document, 'pointerup', (evt: PointerEvent) => {
      handlePointerUp(
        evt, 
        this.ratingsOverlay, 
        this.applyRatingUpdate.bind(this), 
        this.removeRatingsOverlay.bind(this)
      );
    });

    // Also handle pointer cancel to clean up
    this.registerDomEvent(document, 'pointercancel', (evt: PointerEvent) => {
      this.removeRatingsOverlay();
    });

    if (LOGGING_ENABLED) {
      console.info(`[InteractiveRatings] Plugin loaded successfully`);
    }
  }

  /**
   * Unified handler for all interactions to detect rating patterns
   */
  handleInteraction(event: PointerEvent, editor: ExtendedEditor): void {
    handleEditorInteraction(
      adaptEvent(event),
      editor,
      this.ratingsOverlay,
      this.removeRatingsOverlay.bind(this),
      this.createEditorOverlay.bind(this)
    );
  }

  /**
   * Create an editor overlay for ratings interaction
   */
  createEditorOverlay(
    editor: ExtendedEditor,
    line: number,
    start: number,
    pattern: string,
    originalRating: number,
    symbolSet: any,
    ratingText: any
  ): void {
    this.ratingsOverlay = createEditorOverlay(
      editor,
      line,
      start,
      pattern,
      originalRating,
      symbolSet,
      ratingText,
      this.addInteractionListeners.bind(this)
    );
  }

  /**
   * Update the overlay display based on user interaction
   */
  updateOverlayDisplay(overlay: HTMLElement, rating: number): void {
    updateOverlayDisplay(overlay, rating);
  }

  /**
   * Remove the ratings overlay
   */
  removeRatingsOverlay(): void {
    this.ratingsOverlay = removeRatingsOverlay(this.ratingsOverlay);
  }

  /**
   * Apply the rating update to the document
   */
  applyRatingUpdate(rating: number): void {
    const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
    const editor = markdownView?.editor as ExtendedEditor;
    if (!editor || !this.ratingsOverlay) return;

    applyRatingUpdate(editor, this.ratingsOverlay, rating);
  }

  /**
   * Add interaction listeners to the overlay
   */
  addInteractionListeners(container: HTMLElement): void {
    addInteractionListeners(
      container,
      this.applyRatingUpdate.bind(this),
      this.removeRatingsOverlay.bind(this)
    );
  }

  onunload() {
    const styleEl = document.getElementById('interactive-ratings-style');
    if (styleEl) styleEl.remove();
    this.removeRatingsOverlay();
  }
}