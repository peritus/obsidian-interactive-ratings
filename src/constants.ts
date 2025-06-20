import { SymbolSet } from './types';

// ============================================================================
// CRITICAL: DO NOT MODIFY THE LOGGING CONFIGURATION BELOW
// ============================================================================
// 
// Logging is controlled via esbuild's sophisticated build-time mechanism:
// - Production builds: `npm run build` (logging disabled)
// - Debug builds: `npm run build-debug` (logging enabled via LOGGING_ENABLED=true)
// 
// The value below is replaced at BUILD TIME by esbuild.config.js using the
// `define` feature. This ensures zero runtime overhead for production builds.
// 
// ⚠️  NEVER change this to a hardcoded boolean value!
// ⚠️  Use the npm scripts to control logging instead:
//     - `npm run build` for production (no logging)
//     - `npm run build-debug` for debug builds (with logging)
// 
// The esbuild configuration will replace `process.env.LOGGING_ENABLED` with
// the actual boolean value at compile time, so this becomes a constant in
// the final bundle with no runtime cost.
// ============================================================================
export const LOGGING_ENABLED = process.env.LOGGING_ENABLED === 'true';

// Base symbol patterns (excluding user-configurable emojis)
export const BASE_SYMBOL_PATTERNS: SymbolSet[] = [
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
];

// Mutable symbol patterns - starts with base patterns and user-configurable emojis are added dynamically
export let SYMBOL_PATTERNS: SymbolSet[] = [
  ...BASE_SYMBOL_PATTERNS,
  // User-configurable emojis are added dynamically from settings
];

/**
 * Update the global symbol patterns array
 */
export function updateSymbolPatterns(newPatterns: SymbolSet[]): void {
  SYMBOL_PATTERNS.length = 0; // Clear the array
  SYMBOL_PATTERNS.push(...newPatterns); // Add new patterns
}

// Interaction constants
export const INTERACTION_BUFFER = 5; // Buffer for interaction detection
export const OVERLAY_VERTICAL_ADJUSTMENT = 2.1; // Vertical alignment for overlay