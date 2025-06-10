import { getUnicodeCharLength } from './getUnicodeCharLength';

/**
 * Convert UTF-16 byte position to Unicode character position
 */
export function utf16ToUnicodePosition(str: string, utf16Position: number): number {
  // Get the substring up to the UTF-16 position
  const utf16Substring = str.substring(0, utf16Position);
  // Return the Unicode character length of that substring
  return getUnicodeCharLength(utf16Substring);
}