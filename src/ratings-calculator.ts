import { LOGGING_ENABLED } from './constants';
import { Coordinates, EditorInteractionEvent, InteractionType } from './types';

/**
 * Check if an event is interacting with a specific DOM element
 */
export function isInteractingWithElement(
  event: EditorInteractionEvent, 
  element: HTMLElement, 
  eventType: InteractionType
): boolean {
  const rect = element.getBoundingClientRect();
  const clientX = eventType === 'mouse' ? event.clientX : event.touches[0].clientX;
  const clientY = eventType === 'mouse' ? event.clientY : event.touches[0].clientY;

  const isInteracting = (
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom
  );

  if (LOGGING_ENABLED) {
    console.debug(`[InteractiveRatings] Checking interaction with element (${eventType})`, {
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
  eventType: InteractionType,
  buffer: number = 5
): boolean {
  const clientX = eventType === 'mouse' ? event.clientX : event.touches[0].clientX;
  const clientY = eventType === 'mouse' ? event.clientY : event.touches[0].clientY;

  const isWithin = (
    clientX >= startCoords.left - buffer &&
    clientX <= endCoords.right + buffer &&
    clientY >= startCoords.top - buffer &&
    clientY <= endCoords.bottom + buffer
  );

  return isWithin;
}

/**
 * Check if mouse is over an element (simplified version of isInteractingWithElement for mouse)
 */
export function isMouseOverElement(event: MouseEvent, element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  const isOver = (
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom
  );

  if (LOGGING_ENABLED) {
    console.debug(`[InteractiveRatings] Checking if mouse is over element`, {
      mouseX: event.clientX,
      mouseY: event.clientY,
      rect: {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom
      },
      isOver
    });
  };

  return isOver;
}

/**
 * Check if mouse is within a region (simplified version for mouse events)
 */
export function isMouseWithinRegion(
  event: MouseEvent, 
  startCoords: Coordinates, 
  endCoords: Coordinates,
  buffer: number = 2
): boolean {
  const isWithin = (
    event.clientX >= startCoords.left - buffer &&
    event.clientX <= endCoords.right + buffer &&
    event.clientY >= startCoords.top - buffer &&
    event.clientY <= endCoords.bottom + buffer
  );

  return isWithin;
}
