/**
 * Escape special regex characters, handling Unicode properly
 */
export function escapeRegexChar(char: string): string {
  return char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}