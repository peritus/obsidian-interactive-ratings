import { EditorView, DecorationSet, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { LOGGING_ENABLED } from '../../constants';
import { collectMatches } from './collectMatches';
import { filterOverlappingMatches } from './filterOverlappingMatches';
import { buildDecorationsFromMatches } from './buildDecorationsFromMatches';

/**
 * ViewPlugin to detect and replace rating patterns with interactive widgets
 */
export const ratingViewPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = this.buildDecorations(update.view);
      }
    }

    buildDecorations(view: EditorView): DecorationSet {
      const builder = new RangeSetBuilder();
      
      try {
        const text = view.state.doc.toString();
        const cursorPos = view.state.selection.main.head;
        
        // Collect all matches first
        const matches = collectMatches(text);
        
        // Filter overlapping matches
        const filteredMatches = filterOverlappingMatches(matches);
        
        // Build decorations from filtered matches
        buildDecorationsFromMatches(filteredMatches, cursorPos, builder);
        
      } catch (error) {
        if (LOGGING_ENABLED) {
          console.error('[InteractiveRatings] Error building decorations', error);
        }
      }
      
      return builder.finish();
    }
  },
  {
    decorations: v => v.decorations
  }
);

// Export the extension array
export const ratingEditorExtension = [ratingViewPlugin];