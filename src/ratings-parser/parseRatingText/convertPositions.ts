import { getUnicodeCharLength } from '../../utils/getUnicodeCharLength';
import { getUnicodeSubstring } from '../../utils/getUnicodeSubstring';
import { utf16ToUnicodePosition } from '../../utils/utf16ToUnicodePosition';
import { LOGGING_ENABLED } from '../../constants';

/**
 * Convert UTF-16 positions to Unicode and extract text after symbols
 */
export function convertPositions(line: string, utf16Start: number, utf16End: number): {
  unicodeStart: number;
  unicodeEnd: number;
  afterSymbols: string;
} {
  // Convert UTF-16 positions to Unicode character positions
  const unicodeStart = utf16ToUnicodePosition(line, utf16Start);
  const unicodeEnd = utf16ToUnicodePosition(line, utf16End);
  
  // Get the substring after the symbols using Unicode-aware functions
  const afterSymbols = getUnicodeSubstring(line, unicodeEnd, getUnicodeCharLength(line));

  if (LOGGING_ENABLED) {
    console.debug('[InteractiveRatings] convertPositions debug', {
      utf16Start,
      utf16End,
      unicodeStart,
      unicodeEnd,
      afterSymbols: afterSymbols.substring(0, 40) + '...',
      lineLength: line.length,
      unicodeLineLength: getUnicodeCharLength(line)
    });
  }

  return { unicodeStart, unicodeEnd, afterSymbols };
}