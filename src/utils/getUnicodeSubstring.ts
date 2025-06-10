/**
 * Get a substring with proper Unicode character handling
 */
export function getUnicodeSubstring(str: string, start: number, end: number): string {
  return [...str].slice(start, end).join('');
}