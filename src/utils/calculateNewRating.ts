import { LOGGING_ENABLED } from '../constants';

/**
 * Calculate the new rating based on cursor position
 */
export function calculateNewRating(overlay: HTMLElement, clientX: number): number {
  const containerRect = overlay.getBoundingClientRect();
  const symbolCount = parseInt(overlay.dataset.symbolCount);
  const symbolWidth = containerRect.width / symbolCount;
  const relativeX = clientX - containerRect.left;
  const hoveredSymbolIndex = Math.floor(relativeX / symbolWidth);
  const positionWithinSymbol = (relativeX % symbolWidth) / symbolWidth;

  // Determine if we should use half symbol or full symbol
  const supportsHalf = overlay.dataset.supportsHalf === 'true';
  const useHalfSymbol = supportsHalf && positionWithinSymbol < 0.5;

  // Calculate rating
  let newRating = hoveredSymbolIndex + (useHalfSymbol ? 0.5 : 1);
  if (newRating < 0) {
    newRating = 0;
  }

  if (LOGGING_ENABLED) {
    console.debug(`[InteractiveRatings] Calculated new rating`, {
      clientX,
      containerRect: {
        left: containerRect.left,
        width: containerRect.width
      },
      symbolCount,
      symbolWidth,
      relativeX,
      hoveredSymbolIndex,
      positionWithinSymbol,
      supportsHalf,
      useHalfSymbol,
      newRating
    });
  }

  return newRating;
}