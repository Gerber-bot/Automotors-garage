/**
 * Automotors Garage Design Tokens
 * Definitive design tokens for the commercial SaaS automotive platform.
 */

export const tokens = {
  colors: {
    surface: {
      background: '#020617', // slate-950: Main app dark canvas
      card: '#0b132b',       // dark navy / slate-900: Primary card surface
      cardElevated: '#111c3d', // elevated card / popover surface
      cardHover: '#172554',  // hover state for cards
      border: 'rgba(255, 255, 255, 0.08)', // subtle border
      borderHighlight: 'rgba(16, 185, 129, 0.3)', // emerald highlight border
    },
    text: {
      primary: '#f8fafc',    // slate-50: Main headings and body
      secondary: '#cbd5e1',  // slate-300: Supporting descriptions
      muted: '#94a3b8',      // slate-400: Metadata and form labels
      subtle: '#64748b',     // slate-500: Placeholders and subtle captions
      inverse: '#020617',    // dark text on bright badges
    },
    brand: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981',       // Primary Emerald Accent
      600: '#059669',       // Button hover / active accent
      700: '#047857',
      800: '#065f46',
      900: '#064e3b',
      950: '#022c22',
    },
    status: {
      success: {
        bg: 'rgba(16, 185, 129, 0.12)',
        border: 'rgba(16, 185, 129, 0.3)',
        text: '#34d399',
        dot: '#10b981',
      },
      warning: {
        bg: 'rgba(245, 158, 11, 0.12)',
        border: 'rgba(245, 158, 11, 0.3)',
        text: '#fbbf24',
        dot: '#f59e0b',
      },
      danger: {
        bg: 'rgba(244, 63, 94, 0.12)',
        border: 'rgba(244, 63, 94, 0.3)',
        text: '#fb7185',
        dot: '#f43f5e',
      },
      info: {
        bg: 'rgba(14, 165, 233, 0.12)',
        border: 'rgba(14, 165, 233, 0.3)',
        text: '#38bdf8',
        dot: '#0ea5e9',
      },
      inProgress: {
        bg: 'rgba(99, 102, 241, 0.12)',
        border: 'rgba(99, 102, 241, 0.3)',
        text: '#818cf8',
        dot: '#6366f1',
      },
      neutral: {
        bg: 'rgba(148, 163, 184, 0.1)',
        border: 'rgba(148, 163, 184, 0.2)',
        text: '#94a3b8',
        dot: '#64748b',
      },
    },
  },
  typography: {
    fonts: {
      sans: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
      mono: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
    },
    sizes: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',      // 16px (prevents iOS auto-zoom)
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem',// 30px
      '4xl': '2.25rem', // 36px
    },
  },
  radii: {
    sm: '0.25rem',   // 4px
    md: '0.375rem',  // 6px
    lg: '0.5rem',    // 8px
    xl: '0.75rem',   // 12px
    '2xl': '1rem',   // 16px
    full: '9999px',
  },
  shadows: {
    subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.4)',
    card: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.3)',
    glowEmerald: '0 0 20px -5px rgba(16, 185, 129, 0.35)',
    popover: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.5)',
  },
  breakpoints: {
    compact: '320px',
    mobile: '390px',
    phablet: '430px',
    tablet: '768px',
    laptop: '1024px',
    desktop: '1280px',
    wide: '1440px',
  },
  accessibility: {
    minTouchTarget: '44px',
    focusRing: 'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-950',
  },
} as const;

export type DesignTokens = typeof tokens;
