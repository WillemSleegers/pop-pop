// Game configuration and constants

export const FRUIT_LEVELS = 11;

// Radius for each fruit level (in pixels)
export const FRUIT_RADII = [15, 20, 25, 32, 40, 50, 62, 75, 90, 110, 135];

// Colors for each fruit level - Green palette
export const FRUIT_COLORS = [
  '#86EFAC', // Level 0 - Light green
  '#4ADE80', // Level 1 - Green 400
  '#22C55E', // Level 2 - Green 500
  '#16A34A', // Level 3 - Green 600
  '#15803D', // Level 4 - Green 700
  '#166534', // Level 5 - Green 800
  '#14532D', // Level 6 - Green 900
  '#059669', // Level 7 - Emerald 600
  '#047857', // Level 8 - Emerald 700
  '#065F46', // Level 9 - Emerald 800
  '#064E3B', // Level 10 - Emerald 900 (darkest)
];

// Points awarded for each merge
export const MERGE_POINTS = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];

// Game container dimensions
export const CONTAINER_WIDTH = 400;
export const CONTAINER_HEIGHT = 600;
export const DANGER_LINE_Y = 100; // Y position of danger line
export const DANGER_LINE_TIMEOUT = 2000; // How long fruit can be above line (ms)

// Drop zone at top
export const DROP_ZONE_HEIGHT = 80;
