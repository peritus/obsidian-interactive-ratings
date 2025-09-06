import { LOGGING_ENABLED, BASE_SYMBOL_PATTERNS, updateSymbolPatterns } from '../constants';
import { InteractiveRatingsSettings } from '../types';

/**
 * Update symbol patterns based on user settings
 */
export function updateSymbolPatternsFromSettings(settings: InteractiveRatingsSettings): void {
  // Start with base patterns (all the existing ones except the customizable emojis)
  const newPatterns = [...BASE_SYMBOL_PATTERNS];
  
  // Add emoji patterns from settings
  if (settings.supportedEmojis) {
    // Split the emoji string into individual grapheme clusters (handling ZWJ sequences properly)
    const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
    const emojis = Array.from(segmenter.segment(settings.supportedEmojis), segment => segment.segment);
    
    for (const emoji of emojis) {
      if (emoji.trim()) { // Skip empty characters and whitespace
        newPatterns.push({
          full: emoji,
          empty: emoji,
          half: null
        });
      }
    }
  }
  
  // Update the global symbol patterns
  updateSymbolPatterns(newPatterns);
  
  if (LOGGING_ENABLED) {
    const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
    console.debug('[InteractiveRatings] Updated symbol patterns from settings', {
      supportedEmojis: settings.supportedEmojis,
      parsedEmojis: settings.supportedEmojis ? Array.from(segmenter.segment(settings.supportedEmojis), segment => segment.segment) : [],
      totalPatterns: newPatterns.length
    });
  }
}