/**
 * Interface for rating match data with optional rating text
 */
export interface RatingMatch {
  pattern: string;
  start: number;
  end: number;
  symbolSet: any;
  rating: number;
  ratingText?: any | null;
}