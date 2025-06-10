import { LOGGING_ENABLED } from '../../constants';
import { RatingText } from '../../types';

/**
 * Build the final RatingText result from matched patterns
 */
export function buildRatingTextResult(
  visibleMatch: RegExpMatchArray | null,
  htmlCommentMatch: RegExpMatchArray | null,
  totalMatchLength: number,
  utf16End: number
): RatingText | null {
  // Use visible rating if present, otherwise use comment
  const match = visibleMatch || htmlCommentMatch;
  const isComment = !visibleMatch && !!htmlCommentMatch;
  const hasBothFormats = !!(visibleMatch && htmlCommentMatch);

  if (match) {
    let format = '';
    let numerator = 0;
    let denominator = 0;

    if (isComment && htmlCommentMatch) {
      // Simplified HTML comment format: <!-- 3/5 -->
      format = 'comment-fraction';
      numerator = parseFloat(htmlCommentMatch[1]);
      denominator = parseInt(htmlCommentMatch[2]);
    } else if (match[1] && match[2]) {
      // (14.5/33) format
      format = 'fraction-parentheses';
      numerator = parseFloat(match[1]);
      denominator = parseInt(match[2]);
    } else if (match[3] && match[4]) {
      // 14.5/33 format
      format = 'fraction';
      numerator = parseFloat(match[3]);
      denominator = parseInt(match[4]);
    } else if (match[5]) {
      // 60% or (60%) format
      const hasParens = match[0].includes('(') && match[0].includes(')');
      format = hasParens ? 'percent-parentheses' : 'percent';
      numerator = parseInt(match[5]);
      denominator = 100;
    }

    // Calculate the end position correctly - use total length when both formats present
    const endPosition = utf16End + totalMatchLength;

    const result: RatingText = {
      format,
      numerator,
      denominator,
      text: match[0],
      endPosition: endPosition
    };

    if (LOGGING_ENABLED) {
      console.debug('[InteractiveRatings] Found rating text', {
        result,
        matchedText: match[0],
        isComment,
        hasPrecedence: !isComment,
        hasBothFormats,
        visibleMatchLength: visibleMatch ? visibleMatch[0].length : 0,
        commentMatchLength: htmlCommentMatch ? htmlCommentMatch[0].length : 0,
        totalMatchLength,
        calculatedEndPosition: endPosition
      });
    }

    return result;
  }

  return null;
}