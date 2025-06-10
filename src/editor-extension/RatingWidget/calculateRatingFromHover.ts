import { isFullOnlySymbol } from '../../utils/isFullOnlySymbol';

/**
 * Calculate rating from hover position with full-only validation
 */
export function calculateRatingFromHover(
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
  
  // More responsive half-symbol detection for hover
  if (position <= 0.5) {
    return symbolIndex + 0.5;
  } else {
    return symbolIndex + 1;
  }
}