# CSS Customization Guide

This guide explains how to customize the appearance of interactive rating symbols using CSS snippets in Obsidian.

## New Feature: Distinct CSS Classes for Selected/Unselected Symbols

As of this update, the Interactive Ratings plugin now provides distinct CSS classes for selected (filled) and unselected (empty) symbols, making it easy to customize their appearance.

### Available CSS Classes

#### For Regular Rating Systems (with filled/half/empty symbols):
- `.interactive-rating-symbol--rated` - Applied to selected/filled symbols (★)
- `.interactive-rating-symbol--half` - Applied to half-filled symbols (☆★)
- `.interactive-rating-symbol--empty` - Applied to unselected/empty symbols (☆)
- `.interactive-rating-symbol--normal` - Legacy class (no longer used for filled/empty distinction)

#### For Full-Only Rating Systems (symbols that don't have empty variants):
- `.interactive-rating-symbol--rated` - Applied to symbols within the rating
- `.interactive-rating-symbol--unrated` - Applied to symbols beyond the rating (grayed out)

### Example CSS Snippets

Here are some examples of how you can customize the appearance of rating symbols:

#### 1. Make Empty Symbols More Subtle
```css
.interactive-rating-symbol--empty {
  opacity: 0.3;
}
```

#### 2. Add Color to Filled, Half, and Empty Symbols
```css
.interactive-rating-symbol--rated {
  color: #FFD700; /* Gold color for filled stars */
}

.interactive-rating-symbol--half {
  color: #FFA500; /* Orange color for half stars */
}

.interactive-rating-symbol--empty {
  color: #CCCCCC; /* Light gray for empty stars */
}
```

#### 3. Create Gradient Effect for Half Symbols
```css
.interactive-rating-symbol--rated {
  color: #FFD700;
}

.interactive-rating-symbol--half {
  background: linear-gradient(90deg, #FFD700 50%, #CCCCCC 50%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.interactive-rating-symbol--empty {
  color: #CCCCCC;
}
```

#### 4. Add Hover Effects
```css
.interactive-rating-symbol--empty:hover {
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.interactive-rating-symbol--half:hover {
  opacity: 0.9;
  transform: scale(1.05);
  transition: all 0.2s ease;
}

.interactive-rating-symbol--rated:hover {
  transform: scale(1.1);
  transition: transform 0.2s ease;
}
```

#### 5. Different Styling for Different Symbol Types
```css
/* For star ratings */
.interactive-rating-symbol--rated:contains("★") {
  color: #FFD700;
}

.interactive-rating-symbol--half:contains("☆★") {
  color: #FFA500;
}

/* For heart ratings */
.interactive-rating-symbol--rated:contains("♥") {
  color: #FF6B9D;
}

.interactive-rating-symbol--half:contains("♡") {
  color: #FFB3D1;
}
```

#### 6. Add Drop Shadow to Filled and Half Symbols
```css
.interactive-rating-symbol--rated {
  text-shadow: 0 0 3px rgba(255, 215, 0, 0.6);
}

.interactive-rating-symbol--half {
  text-shadow: 0 0 2px rgba(255, 165, 0, 0.5);
}

.interactive-rating-symbol--empty {
  opacity: 0.4;
}
```

### How to Apply CSS Snippets in Obsidian

1. Open Obsidian Settings
2. Go to "Appearance" → "CSS snippets"
3. Click the folder icon to open the snippets folder
4. Create a new `.css` file (e.g., `rating-customization.css`)
5. Add your desired CSS rules
6. Enable the snippet in Obsidian's CSS snippets section

### Default Styling

By default, the plugin applies:
- **Filled symbols** (`.interactive-rating-symbol--rated`): Full opacity, no filters
- **Half symbols** (`.interactive-rating-symbol--half`): 80% opacity
- **Empty symbols** (`.interactive-rating-symbol--empty`): 50% opacity
- **High contrast mode**: Empty symbols get 30% opacity with grayscale filter, half symbols get 60% opacity with enhanced contrast for better accessibility

### Accessibility Considerations

The plugin includes automatic high contrast support. When users have high contrast mode enabled, empty and half symbols will automatically receive enhanced contrast styling. You can override this by providing your own high contrast styles:

```css
@media (prefers-contrast: high) {
  .interactive-rating-symbol--empty {
    opacity: 0.2 !important;
    filter: grayscale(100%) contrast(1.2) !important;
  }
  
  .interactive-rating-symbol--half {
    opacity: 0.5 !important;
    filter: contrast(1.3) !important;
  }
}
```

### Migration from Previous Versions

If you were previously using CSS that targeted `.interactive-rating-symbol` without state classes, your existing styles should still work. However, for more precise control, consider updating to use the new state-specific classes:

- Replace `.interactive-rating-symbol` with `.interactive-rating-symbol--rated` for filled symbols
- Add styles for `.interactive-rating-symbol--half` for half symbols
- Add styles for `.interactive-rating-symbol--empty` for empty symbols

This enhancement provides much more flexibility for customizing the visual appearance of your rating systems, with complete control over filled, half, and empty symbol states!