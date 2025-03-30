import { App, MarkdownView, Plugin } from 'obsidian';
import { LOGGING_ENABLED } from './constants';
import { handleEditorInteraction, handleTouchEnd, handleTouchMove, isInSourceMode } from './event-handlers';
import { calculateNewRating } from './utils';
import { adaptMouseEvent, adaptTouchEvent, ExtendedEditor } from './types';
import { addInteractionListeners, applyRatingUpdate, createEditorOverlay, removeRatingsOverlay, updateOverlayDisplay } from './ratings-overlay';

export class InteractiveRatingsPlugin extends Plugin {
  app: App;
  ratingsOverlay: HTMLElement | null;

  async onload() {
    if (LOGGING_ENABLED) {
      console.info(`[InteractiveRatings] Plugin loading`);
    }

    // For editing mode, add event listener to the app's workspace
    this.registerDomEvent(document, 'mousemove', (evt: MouseEvent) => {
      const { isSourceMode, editor } = isInSourceMode(this.app);
      if (!isSourceMode || !editor) return;

      this.handleMouseMove(evt, editor);
    });

    // Add touch event handlers
    this.registerDomEvent(document, 'touchstart', (evt: TouchEvent) => {
      if (LOGGING_ENABLED) {
        console.debug(`[InteractiveRatings] Touch start event detected`, {
          touches: evt.touches.length,
          clientX: evt.touches[0]?.clientX,
          clientY: evt.touches[0]?.clientY,
          target: evt.target
        });
      }

      const { isSourceMode, editor } = isInSourceMode(this.app);
      if (!isSourceMode || !editor) return;

      this.handleTouchStart(evt, editor);
    });

    // Touch move handler to update rating during drag
    this.registerDomEvent(document, 'touchmove', (evt: TouchEvent) => {
      handleTouchMove(evt, this.ratingsOverlay, this.updateOverlayDisplay.bind(this));
    });

    // Touch end to finalize the selection
    this.registerDomEvent(document, 'touchend', (evt: TouchEvent) => {
      handleTouchEnd(evt, this.ratingsOverlay, this.applyRatingUpdate.bind(this), this.removeRatingsOverlay.bind(this));
    });

    if (LOGGING_ENABLED) {
      console.info(`[InteractiveRatings] Plugin loaded successfully`);
    }
  }

  /**
   * Handle mouse movement to detect rating patterns
   */
  handleMouseMove(event: MouseEvent, editor: ExtendedEditor): void {
    handleEditorInteraction(
      adaptMouseEvent(event),
      editor,
      'mouse',
      this.ratingsOverlay,
      this.removeRatingsOverlay.bind(this),
      this.createEditorOverlay.bind(this)
    );
  }

  /**
   * Handle touch start event to detect rating patterns
   */
  handleTouchStart(event: TouchEvent, editor: ExtendedEditor): void {
    handleEditorInteraction(
      adaptTouchEvent(event),
      editor,
      'touch',
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