/**
 * Get a substring with proper Unicode grapheme cluster handling
 * This properly handles ZWJ sequences, variation selectors, and complex emoji
 */
export function getUnicodeSubstring(str: string, start: number, end: number): string {
  const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
  return Array.from(segmenter.segment(str), segment => segment.segment).slice(start, end).join('');
}