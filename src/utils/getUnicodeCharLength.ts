/**
 * Get the length of a string in Unicode grapheme clusters
 * This properly handles ZWJ sequences, variation selectors, and complex emoji
 */
export function getUnicodeCharLength(str: string): number {
  const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
  return Array.from(segmenter.segment(str)).length;
}