export const lightTheme = {
  name: 'light' as const,
  colors: {
    // Base colors
    background: '#F1F5F9',
    surface: '#FFFFFF',
    surfaceSecondary: '#F8FAFC',
    surfaceTertiary: '#E2E8F0',
    
    // Text colors
    text: '#1E293B',
    textSecondary: '#475569',
    textMuted: '#64748B',
    textInverse: '#FFFFFF',
    
    // Primary colors (based on Clash of Clans blue)
    primary: '#1E3A8A',
    primaryLight: '#3B82F6',
    primaryDark: '#1E40AF',
    primaryMuted: 'rgba(30, 58, 138, 0.1)',
    
    // Accent colors
    accent: '#059669',
    accentLight: '#10B981',
    accentMuted: 'rgba(5, 150, 105, 0.1)',
    
    // Status colors
    success: '#059669',
    successLight: '#10B981',
    successMuted: 'rgba(5, 150, 105, 0.1)',
    
    warning: '#D97706',
    warningLight: '#F59E0B',
    warningMuted: 'rgba(217, 119, 6, 0.1)',
    
    error: '#DC2626',
    errorLight: '#EF4444',
    errorMuted: 'rgba(220, 38, 38, 0.1)',
    
    // Border and divider colors
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    borderDark: '#CBD5E1',
    divider: '#E5E7EB',
    
    // Shadow colors
    shadowLight: 'rgba(0, 0, 0, 0.05)',
    shadow: 'rgba(0, 0, 0, 0.1)',
    shadowDark: 'rgba(0, 0, 0, 0.15)',
    
    // Card and elevation
    cardBackground: '#FFFFFF',
    cardBorder: '#E2E8F0',
    cardShadow: 'rgba(0, 0, 0, 0.05)',
    
    // Interactive states
    ripple: 'rgba(30, 58, 138, 0.12)',
    highlight: 'rgba(59, 130, 246, 0.1)',
    pressed: 'rgba(30, 58, 138, 0.08)',
    
    // Tab bar and navigation
    tabBarBackground: '#FFFFFF',
    tabBarBorder: '#E2E8F0',
    tabBarActive: '#1E3A8A',
    tabBarInactive: '#64748B',
    
    // Input colors
    inputBackground: '#FFFFFF',
    inputBorder: '#E2E8F0',
    inputBorderFocused: '#1E3A8A',
    inputPlaceholder: '#9CA3AF',
  },
  
  // Gradients for native styling
  gradients: {
    primary: ['#1E3A8A', '#3B82F6'],
    background: ['#F1F5F9', '#E2E8F0'],
    card: ['#FFFFFF', '#F8FAFC'],
  },
  
  // Typography system
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
  
  // Spacing system
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
  
  // Border radius
  borderRadius: {
    none: 0,
    sm: 4,
    base: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 999,
  },
  
  // Shadows for elevation
  shadows: {
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    base: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
    },
  },
};

