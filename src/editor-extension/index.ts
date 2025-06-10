// Import the main plugin for use in the extension array
import { ratingViewPlugin } from './ratingViewPlugin';

// Export the main extension
export { ratingViewPlugin } from './ratingViewPlugin';

// Export additional components if needed
export { RatingWidget } from './RatingWidget';
export { RatingMatch } from './RatingMatch';

// Export the extension array
export const ratingEditorExtension = [ratingViewPlugin];