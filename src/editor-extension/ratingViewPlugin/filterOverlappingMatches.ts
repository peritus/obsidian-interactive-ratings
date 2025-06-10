import { RatingMatch } from '../RatingMatch';

/**
 * Filter overlapping matches, keeping the first one in each overlapping group
 */
export function filterOverlappingMatches(matches: RatingMatch[]): RatingMatch[] {
  // Sort matches by start position (required by RangeSetBuilder)
  const sortedMatches = [...matches].sort((a, b) => a.start - b.start);
  
  // Remove overlapping matches (keep the first one)
  const filteredMatches: RatingMatch[] = [];
  let lastEnd = -1;
  
  for (const match of sortedMatches) {
    if (match.start >= lastEnd) {
      filteredMatches.push(match);
      lastEnd = match.end;
    }
  }
  
  return filteredMatches;
}