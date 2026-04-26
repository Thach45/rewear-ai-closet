/**
 * ReWear design tokens — Eco Green, Neon accents, Off-white (Gen-Z / Y2K)
 */
export const theme = {
  colors: {
    background: '#fafaf5',
    surface: '#ffffff',
    surfaceMuted: '#f0f0e8',
    ecoGreen: '#0d4f3c',
    ecoGreenLight: '#14805f',
    neon: '#c8ff00',
    neonSoft: '#e8ff99',
    accentPink: '#ff6b9d',
    text: '#1a1a12',
    textSecondary: '#5c5c52',
    border: '#e8e8dc',
    overlay: 'rgba(13, 79, 60, 0.06)',
    danger: '#dc2626',
  },
  radii: {
    sm: 10,
    md: 16,
    lg: 22,
    xl: 28,
    full: 9999,
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 22,
    xl: 28,
    xxl: 36,
  },
  shadow: {
    card: {
      shadowColor: '#0d4f3c',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
      elevation: 6,
    },
    soft: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
  },
} as const;

export type Theme = typeof theme;
