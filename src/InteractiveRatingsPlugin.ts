import { Plugin } from 'obsidian';
import { LOGGING_ENABLED } from './constants';
import { processRatings } from './markdown-postprocessor';
import { ratingEditorExtension } from './editor-extension';

export class InteractiveRatingsPlugin extends Plugin {
  async onload(): Promise<void> {
    if (LOGGING_ENABLED) {
      console.info('[InteractiveRatings] Plugin loading with inline ratings system');
    }

    // Register editor extension for interactive ratings in editing mode
    this.registerEditorExtension(ratingEditorExtension);

    // Keep markdown postprocessor for reading mode (optional - can be disabled if desired)
    this.registerMarkdownPostProcessor(processRatings);

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
