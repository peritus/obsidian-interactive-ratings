import { LOGGING_ENABLED } from './constants';
import { Coordinates, EditorInteractionEvent } from './types';

/**
 * Check if an event is interacting with a specific DOM element
 */
export function isInteractingWithElement(
  event: EditorInteractionEvent,
  element: HTMLElement
): boolean {
  const rect = element.getBoundingClientRect();
  const { clientX, clientY, pointerType } = event;

  const isInteracting = (
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom
  );

  if (LOGGING_ENABLED) {
    console.debug(`[InteractiveRatings] Checking interaction with element (${pointerType || 'pointer'})`, {
      clientX,
      clientY,
      rect: {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom
      },
      isInteracting
    });
  };

  return isInteracting;
}

/**
 * Check if an interaction event is within a specific region defined by coordinates
 */
export function isInteractionWithinRegion(
  event: EditorInteractionEvent,
  startCoords: Coordinates,
  endCoords: Coordinates,
  buffer: number = 5
): boolean {
  const { clientX, clientY } = event;

  const isWithin = (
    clientX >= startCoords.left - buffer &&
    clientX <= endCoords.right + buffer &&
    clientY >= startCoords.top - buffer &&
    clientY <= endCoords.bottom + buffer
  );

  return isWithin;
}