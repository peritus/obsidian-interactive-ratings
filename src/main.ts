import { InteractiveRatingsPlugin } from './InteractiveRatingsPlugin';

// Re-export from core modules
export * from './constants';
export * from './utils';
export * from './types';
export * from './ratings-parser';
export * from './markdown-postprocessor';
export * from './inline-rating-widget';
export * from './editor-extension';

// Export the main plugin class
export default InteractiveRatingsPlugin;
