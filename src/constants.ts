import { SymbolSet } from './types';

// Global logging control - set to false for production, true for debugging
export const LOGGING_ENABLED = false;

// Define symbol patterns as a global constant
export const SYMBOL_PATTERNS: SymbolSet[] = [
  { full: '★', empty: '☆', half: null },    // Symbols
  { full: '✦', empty: '✧', half: null },    // Star symbols
  { full: '🌕', empty: '🌑', half: '🌗' },   // Moon phases
  { full: '●', empty: '○', half: '◐' },     // Circles
  { full: '■', empty: '□', half: '◧' },     // Squares
  { full: '▲', empty: '△', half: null },    // Triangles (no half)

  // Heart symbols
  { full: '❤️', empty: '🤍', half: null },   // Red hearts
  { full: '🧡', empty: '🤍', half: null },   // Orange hearts
  { full: '💛', empty: '🤍', half: null },   // Yellow hearts
  { full: '💚', empty: '🤍', half: null },   // Green hearts
  { full: '💙', empty: '🤍', half: null },   // Blue hearts
  { full: '💜', empty: '🤍', half: null },   // Purple hearts
  { full: '🖤', empty: '🤍', half: null },   // Black hearts
  { full: '🤎', empty: '🤍', half: null },   // Brown hearts

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

  // Full-only symbols (same symbol for full and empty, no half)
  { full: '🎥', empty: '🎥', half: null },    // Movie cameras
  { full: '🏆', empty: '🏆', half: null },    // Trophies
  { full: '⭐', empty: '⭐', half: null },    // Gold stars
  { full: '💎', empty: '💎', half: null },    // Diamonds
  { full: '🔥', empty: '🔥', half: null },    // Fire
  { full: '⚡', empty: '⚡', half: null },    // Lightning
  { full: '🎯', empty: '🎯', half: null },    // Target/bullseye
  { full: '🚀', empty: '🚀', half: null },    // Rockets
  { full: '💰', empty: '💰', half: null },    // Money bags
  { full: '🎖️', empty: '🎖️', half: null },   // Military medals
];

// Interaction constants
export const INTERACTION_BUFFER = 5; // Buffer for interaction detection
export const OVERLAY_VERTICAL_ADJUSTMENT = 2.1; // Vertical alignment for overlay