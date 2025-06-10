/**
 * Find rating patterns in text after symbols
 */
export function findRatingPatterns(afterSymbols: string): {
  visibleMatch: RegExpMatchArray | null;
  htmlCommentMatch: RegExpMatchArray | null;
  totalMatchLength: number;
} {
  // Check for regular rating patterns first (takes precedence over HTML comments)
  const ratingTextMatch = afterSymbols.match(/^\s*(?:\(([\d\.]+)\/(\d+)\)|([\d\.]+)\/(\d+)|(?:\()?(\d+)%(?:\))?)/);
  
  // Check for simplified HTML comment rating patterns (only basic fraction format)
  const commentMatch = afterSymbols.match(/^\s*<!--\s*([\d\.]+)\/(\d+)\s*-->/);

  // Look for both formats to handle precedence properly
  let visibleMatch = null;
  let htmlCommentMatch = null;
  let totalMatchLength = 0;

  if (ratingTextMatch) {
    visibleMatch = ratingTextMatch;
    totalMatchLength = ratingTextMatch[0].length;
    
    // Check if there's also an HTML comment after the visible rating
    const afterVisible = afterSymbols.substring(ratingTextMatch[0].length);
    const followingCommentMatch = afterVisible.match(/^\s*<!--\s*([\d\.]+)\/(\d+)\s*-->/);
    if (followingCommentMatch) {
      htmlCommentMatch = followingCommentMatch;
      totalMatchLength += followingCommentMatch[0].length;
    }
  } else if (commentMatch) {
    htmlCommentMatch = commentMatch;
    totalMatchLength = commentMatch[0].length;
  }

  return { visibleMatch, htmlCommentMatch, totalMatchLength };
}