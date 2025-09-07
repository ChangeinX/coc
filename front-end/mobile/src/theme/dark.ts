export const darkTheme = {
  name: 'dark' as const,
  colors: {
    // Base colors
    background: '#0F172A',
    surface: '#1E293B',
    surfaceSecondary: '#334155',
    surfaceTertiary: '#475569',
    
    // Text colors
    text: '#F8FAFC',
    textSecondary: '#CBD5E1',
    textMuted: '#94A3B8',
    textInverse: '#0F172A',
    
    // Primary colors (brighter in dark mode)
    primary: '#60A5FA',
    primaryLight: '#93C5FD',
    primaryDark: '#3B82F6',
    primaryMuted: 'rgba(96, 165, 250, 0.2)',
    
    // Accent colors
    accent: '#34D399',
    accentLight: '#6EE7B7',
    accentMuted: 'rgba(52, 211, 153, 0.2)',
    
    // Status colors
    success: '#34D399',
    successLight: '#6EE7B7',
    successMuted: 'rgba(52, 211, 153, 0.2)',
    
    warning: '#FBBF24',
    warningLight: '#FCD34D',
    warningMuted: 'rgba(251, 191, 36, 0.2)',
    
    error: '#F87171',
    errorLight: '#FCA5A5',
    errorMuted: 'rgba(248, 113, 113, 0.2)',
    
    // Border and divider colors
    border: '#374151',
    borderLight: '#4B5563',
    borderDark: '#1F2937',
    divider: '#374151',
    
    // Shadow colors (darker and more prominent)
    shadowLight: 'rgba(0, 0, 0, 0.2)',
    shadow: 'rgba(0, 0, 0, 0.3)',
    shadowDark: 'rgba(0, 0, 0, 0.4)',
    
    // Card and elevation
    cardBackground: '#1E293B',
    cardBorder: '#374151',
    cardShadow: 'rgba(0, 0, 0, 0.3)',
    
    // Interactive states
    ripple: 'rgba(96, 165, 250, 0.24)',
    highlight: 'rgba(96, 165, 250, 0.2)',
    pressed: 'rgba(96, 165, 250, 0.16)',
    
    // Tab bar and navigation
    tabBarBackground: '#1E293B',
    tabBarBorder: '#374151',
    tabBarActive: '#60A5FA',
    tabBarInactive: '#94A3B8',
    
    // Input colors
    inputBackground: '#374155',
    inputBorder: '#4B5563',
    inputBorderFocused: '#60A5FA',
    inputPlaceholder: '#6B7280',
  },
  
  // Gradients for native styling
  gradients: {
    primary: ['#60A5FA', '#93C5FD'],
    background: ['#0F172A', '#1E293B'],
    card: ['#1E293B', '#334155'],
  },
  
  // Typography system (same as light)
  typography: {
    fontSize: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      '2xl': 24,
      '3xl': 30,
      '4xl': 36,
    },
    fontWeight: {
      normal: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
    },
  },
  
  // Spacing system (same as light)
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    '2xl': 32,
    '3xl': 40,
    '4xl': 48,
  },
  
  // Border radius (same as light)
  borderRadius: {
    none: 0,
    sm: 4,
    base: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 999,
  },
  
  // Shadows for elevation (more prominent in dark)
  shadows: {
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
    },
    base: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 8,
    },
  },
};

