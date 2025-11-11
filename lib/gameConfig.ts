// Game configuration and constants

export const FRUIT_LEVELS = 11

// Base radius for each fruit level at reference width (in pixels)
// These will be scaled proportionally based on actual canvas width
export const BASE_FRUIT_RADII = [15, 20, 25, 32, 40, 50, 62, 75, 90, 110, 135]

// Reference width for base radii (400px - the default canvas width)
export const REFERENCE_WIDTH = 400

// Calculate scaled radii based on actual canvas width
export function getScaledRadii(canvasWidth: number): number[] {
  const scale = canvasWidth / REFERENCE_WIDTH
  return BASE_FRUIT_RADII.map((radius) => radius * scale)
}

// Export FRUIT_RADII for backwards compatibility (same as BASE_FRUIT_RADII)
export const FRUIT_RADII = BASE_FRUIT_RADII

// Color palettes - designed to maximize distinction between adjacent levels
export const COLOR_PALETTES = {
  green: [
    "#86EFAC", // Level 0 - Light green (very light)
    "#15803D", // Level 1 - Green 700 (dark)
    "#4ADE80", // Level 2 - Green 400 (medium-light)
    "#166534", // Level 3 - Green 800 (very dark)
    "#22C55E", // Level 4 - Green 500 (medium)
    "#14532D", // Level 5 - Green 900 (darkest)
    "#86EFAC", // Level 6 - Light green (restart lighter)
    "#059669", // Level 7 - Emerald 600 (medium-dark)
    "#6EE7B7", // Level 8 - Emerald 300 (light)
    "#047857", // Level 9 - Emerald 700 (dark)
    "#34D399", // Level 10 - Emerald 400 (medium-light)
  ],
  blue: [
    "#BAE6FD", // Level 0 - Sky 200 (very light)
    "#0369A1", // Level 1 - Sky 700 (dark)
    "#38BDF8", // Level 2 - Sky 400 (medium-light)
    "#0C4A6E", // Level 3 - Sky 900 (very dark)
    "#0EA5E9", // Level 4 - Sky 500 (medium)
    "#075985", // Level 5 - Sky 800 (darker)
    "#7DD3FC", // Level 6 - Sky 300 (light)
    "#155E75", // Level 7 - Cyan 800 (dark)
    "#67E8F9", // Level 8 - Cyan 300 (very light)
    "#0E7490", // Level 9 - Cyan 700 (dark)
    "#22D3EE", // Level 10 - Cyan 400 (medium)
  ],
  purple: [
    "#E9D5FF", // Level 0 - Purple 200 (very light)
    "#7E22CE", // Level 1 - Purple 700 (dark)
    "#C084FC", // Level 2 - Purple 400 (medium-light)
    "#581C87", // Level 3 - Purple 900 (very dark)
    "#A855F7", // Level 4 - Purple 500 (medium)
    "#6B21A8", // Level 5 - Purple 800 (darker)
    "#D8B4FE", // Level 6 - Purple 300 (light)
    "#5B21B6", // Level 7 - Violet 800 (dark)
    "#DDD6FE", // Level 8 - Violet 200 (very light)
    "#6D28D9", // Level 9 - Violet 700 (dark)
    "#A78BFA", // Level 10 - Violet 400 (medium)
  ],
  orange: [
    "#FED7AA", // Level 0 - Orange 200 (very light)
    "#C2410C", // Level 1 - Orange 700 (dark)
    "#FB923C", // Level 2 - Orange 400 (medium-light)
    "#7C2D12", // Level 3 - Orange 900 (very dark)
    "#F97316", // Level 4 - Orange 500 (medium)
    "#9A3412", // Level 5 - Orange 800 (darker)
    "#FDBA74", // Level 6 - Orange 300 (light)
    "#991B1B", // Level 7 - Red 800 (dark)
    "#FCA5A5", // Level 8 - Red 300 (light)
    "#B91C1C", // Level 9 - Red 700 (dark)
    "#EF4444", // Level 10 - Red 500 (medium)
  ],
  pink: [
    "#FBCFE8", // Level 0 - Pink 200 (very light)
    "#BE185D", // Level 1 - Pink 700 (dark)
    "#F472B6", // Level 2 - Pink 400 (medium-light)
    "#831843", // Level 3 - Pink 900 (very dark)
    "#EC4899", // Level 4 - Pink 500 (medium)
    "#9F1239", // Level 5 - Pink 800 (darker)
    "#F9A8D4", // Level 6 - Pink 300 (light)
    "#9F1239", // Level 7 - Rose 800 (dark)
    "#FECDD3", // Level 8 - Rose 200 (very light)
    "#BE123C", // Level 9 - Rose 700 (dark)
    "#FB7185", // Level 10 - Rose 400 (medium)
  ],
  rainbow: [
    "#C4B5FD", // Level 0 - Violet 300 (light purple)
    "#15803D", // Level 1 - Green 700 (dark green)
    "#60A5FA", // Level 2 - Blue 400 (light blue)
    "#EA580C", // Level 3 - Orange 600 (dark orange)
    "#FDE047", // Level 4 - Yellow 300 (bright yellow)
    "#7C3AED", // Level 5 - Violet 600 (dark purple)
    "#34D399", // Level 6 - Emerald 400 (light green)
    "#DC2626", // Level 7 - Red 600 (bright red)
    "#7DD3FC", // Level 8 - Sky 300 (sky blue)
    "#C2410C", // Level 9 - Orange 700 (dark orange)
    "#A78BFA", // Level 10 - Violet 400 (medium purple)
  ],
}

export type ColorPalette = keyof typeof COLOR_PALETTES

// Default color palette
export const FRUIT_COLORS = COLOR_PALETTES.green

// Points awarded for each merge
export const MERGE_POINTS = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024]

// Game container dimensions
export const CONTAINER_WIDTH = 400
export const CONTAINER_HEIGHT = 600

// Drop zone at top
export const DROP_ZONE_HEIGHT = 80

// Danger line is at the bottom of the drop zone
export const DANGER_LINE_Y = DROP_ZONE_HEIGHT
export const DANGER_LINE_TIMEOUT = 2000 // How long fruit can be above line (ms)

// Power-up configuration
export const POWERUP_POINTS_THRESHOLD = 1000 // Points needed to earn a bomb
export const MAX_POWERUPS = 1 // Maximum number of bombs that can be stored

// Physics configuration
export const PHYSICS_FPS = 60 // Physics simulation frame rate
export const GRAVITY_Y = 1 // Gravity strength (y-axis)
export const RESTITUTION = 0.1 // Bounciness (0 = no bounce, 1 = perfect bounce)
export const FRICTION = 0.1 // Surface friction
export const AIR_RESISTANCE = 0.01 // Air resistance/drag
export const DENSITY = 0.001 // Circle density
export const WALL_THICKNESS = 50 // Container wall thickness
export const MERGE_TOLERANCE = 1.05 // Distance multiplier for merge detection (5% tolerance)

// Particle configuration
export const PARTICLE_COUNT = 10 // Number of particles in explosion
export const PARTICLE_MIN_SPEED = 100 // Minimum particle speed (pixels/second)
export const PARTICLE_MAX_SPEED = 200 // Maximum particle speed (pixels/second)
export const PARTICLE_LIFETIME = 500 // Particle lifetime in milliseconds
export const PARTICLE_SIZE_RATIO = 0.25 // Particle size relative to circle (1/4)
