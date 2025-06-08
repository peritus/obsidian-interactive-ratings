import { Plugin } from 'obsidian';
import { LOGGING_ENABLED } from './constants';
import { ratingEditorExtension } from './editor-extension';

export class InteractiveRatingsPlugin extends Plugin {
  async onload(): Promise<void> {
    if (LOGGING_ENABLED) {
      console.info('[InteractiveRatings] Plugin loading - edit mode only');
    }

    // Register editor extension for interactive ratings in editing mode only
    this.registerEditorExtension(ratingEditorExtension);

    if (LOGGING_ENABLED) {
      console.info('[InteractiveRatings] Plugin loaded successfully');
    }
  }

  onunload(): void {
    if (LOGGING_ENABLED) {
      console.info('[InteractiveRatings] Plugin unloaded');
    }
  }
}
