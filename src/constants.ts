import { SymbolSet } from './types';

// Global logging control - set at build time via environment variable
export const LOGGING_ENABLED = process.env.LOGGING_ENABLED === 'true';

// Define symbol patterns as a global constant
export const SYMBOL_PATTERNS: SymbolSet[] = [
  { full: '★', empty: '☆', half: null },    // Symbols
  { full: '✦', empty: '✧', half: null },    // Star symbols
  { full: '●', empty: '○', half: '◐' },     // Circles
  { full: '■', empty: '□', half: '◧' },     // Squares
  { full: '▲', empty: '△', half: null },    // Triangles (no half)

  // Progress bar patterns
  { full: '█', empty: '▁', half: null  },   // Block progress
  { full: '⣿', empty: '⣀', half: '⡇' },     // Braille dots
  { full: '⬤', empty: '○', half: null },   // Solid/empty circles
  { full: '■', empty: '□', half: null },    // Solid/empty squares
  { full: '▰', empty: '▱', half: null },    // Dotted squares
  { full: '◼', empty: '▭', half: null },    // Filled/empty rectangles
  { full: '▮', empty: '▯', half: null },    // Vertical bars
  { full: '⬤', empty: '◯', half: null },   // Bold circles
  { full: '⚫', empty: '⚪', half: null },   // Black/white circles
  { full: '█', empty: '░', half: null },    // Block/light shade
];

// Interaction constants
export const INTERACTION_BUFFER = 5; // Buffer for interaction detection
export const OVERLAY_VERTICAL_ADJUSTMENT = 2.1; // Vertical alignment for overlay