import { isFullOnlySymbol } from '../../utils/isFullOnlySymbol';

/**
 * Calculate rating from click position with full-only validation
 */
export function calculateRatingFromClick(
  event: MouseEvent, 
  span: HTMLElement, 
  symbolIndex: number, 
  symbolSet: any
): number {
  const isFullOnly = isFullOnlySymbol(symbolSet);
  
  // For full-only symbols, don't support half ratings and enforce minimum rating of 1
  if (isFullOnly) {
    return Math.max(1, symbolIndex + 1);
  }
  
  if (!symbolSet.half) {
    // No half-symbol support, return full symbol rating
    return symbolIndex + 1;
  }
  
  const rect = span.getBoundingClientRect();
  const relativeX = event.clientX - rect.left;
  const symbolWidth = rect.width;
  const position = relativeX / symbolWidth;
  
  // If clicked on left half, use half symbol; if right half, use full symbol
  if (position <= 0.5) {
    return symbolIndex + 0.5;
  } else {
    return symbolIndex + 1;
  }
}