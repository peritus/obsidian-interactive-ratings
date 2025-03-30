import { Editor, MarkdownView } from 'obsidian';

// Extend the Editor interface to include CM6 specific methods
export interface ExtendedEditor extends Editor {
    posAtMouse(event: MouseEvent): Position;
    posAtCoords(coords: {left: number, top: number}): Position;
    coordsAtPos(pos: Position): Coordinates;
    editorComponent: {
        editorEl: HTMLElement;
    };
}

export interface SymbolSet {
    full: string;
    empty: string;
    half: string | null;
}

export interface RatingText {
    format: string;
    numerator: number;
    denominator: number;
    text: string;
    endPosition: number;
}

export interface Position {
    line: number;
    ch: number;
}

export interface Coordinates {
    left: number;
    right?: number;
    top: number;
    bottom?: number;
}

export type InteractionType = 'mouse' | 'touch';

export interface EditorInteractionEvent {
    clientX: number;
    clientY: number;
    target: EventTarget | null;
    touches?: TouchList;
}

// Convert standard events to EditorInteractionEvent
export function adaptTouchEvent(event: TouchEvent): EditorInteractionEvent {
    return {
        clientX: event.touches[0]?.clientX || 0,
        clientY: event.touches[0]?.clientY || 0,
        target: event.target,
        touches: event.touches
    };
}

export function adaptMouseEvent(event: MouseEvent): EditorInteractionEvent {
    return {
        clientX: event.clientX,
        clientY: event.clientY,
        target: event.target
    };
}
