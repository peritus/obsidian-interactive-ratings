import { InteractiveRatingsPlugin } from './InteractiveRatingsPlugin';

// Re-export from all modules
export * from './constants';
export * from './utils';
export * from './types';
export * from './ratings-parser';
export * from './ratings-calculator';
export * from './ratings-overlay';
export * from './event-handlers';

// Export the main plugin class
export default InteractiveRatingsPlugin;