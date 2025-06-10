import { InteractiveRatingsPlugin } from './InteractiveRatingsPlugin';

// Re-export from core modules
export * from './constants';
export * from './types';

// Re-export from utils
export { getUnicodeCharLength } from './utils/getUnicodeCharLength';
export { getUnicodeSubstring } from './utils/getUnicodeSubstring';
export { utf16ToUnicodePosition } from './utils/utf16ToUnicodePosition';
export { isFullOnlySymbol } from './utils/isFullOnlySymbol';
export { generateSymbolsString } from './utils/generateSymbolsString';
export { generateSymbolsStringForDisk } from './utils/generateSymbolsStringForDisk';
export { calculateNewRating } from './utils/calculateNewRating';
export { formatRatingText } from './utils/formatRatingText';
export { updateSymbolPatternsFromSettings } from './utils/updateSymbolPatternsFromSettings';

// Re-export from ratings-parser
export { parseRatingText } from './ratings-parser/parseRatingText/parseRatingText';
export { getSymbolSetForPattern } from './ratings-parser/getSymbolSetForPattern';
export { calculateRating } from './ratings-parser/calculateRating';
export { escapeRegexChar } from './ratings-parser/escapeRegexChar';
export { generateSymbolRegexPatterns } from './ratings-parser/generateSymbolRegexPatterns';

// Re-export from editor-extension
export { ratingViewPlugin, ratingEditorExtension } from './editor-extension/ratingViewPlugin/ratingViewPlugin';
export { RatingWidget } from './editor-extension/RatingWidget/RatingWidget';
export { RatingMatch } from './editor-extension/RatingMatch';

// Export the main plugin class
export default InteractiveRatingsPlugin;