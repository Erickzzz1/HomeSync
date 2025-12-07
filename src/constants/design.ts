/**
 * Sistema de Diseño HomeSync
 * 
 * Define colores, tipografía, espaciado y otros valores de diseño
 * para mantener consistencia en toda la aplicación
 * 
 * Paleta de colores minimalista: Solo azul brillante, blanco y rojo
 */

export const Colors = {
  // Colores base (solo estos 3 colores se usan en toda la app)
  blue: '#007AFF', // Azul brillante (como WhatsApp verde)
  white: '#FFFFFF', // Blanco
  red: '#FF3B30', // Rojo (solo para botones de eliminar)
  
  // Alias para compatibilidad
  primary: '#007AFF', // Azul brillante
  background: '#FFFFFF', // Blanco
  backgroundSecondary: '#FFFFFF', // Blanco
  backgroundTertiary: '#F5F5F5', // Blanco ligeramente gris para contraste
  textPrimary: '#000000', // Negro para texto sobre blanco
  textSecondary: '#666666', // Gris para texto secundario
  textTertiary: '#999999', // Gris claro
  textInverse: '#FFFFFF', // Blanco para texto sobre azul
  border: '#E0E0E0', // Borde gris muy claro
  borderLight: '#F0F0F0',
  error: '#FF3B30', // Rojo para errores/eliminar
  shadow: 'rgba(0, 0, 0, 0.1)',
  shadowDark: 'rgba(0, 0, 0, 0.2)',
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  
  // Colores de prioridad (usando solo azul con diferentes intensidades)
  priorityHigh: '#007AFF', // Azul brillante
  priorityMedium: '#5AC8FA', // Azul claro
  priorityLow: '#AFDEFA', // Azul muy claro
};

export const Typography = {
  // Tamaños de fuente
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  
  // Pesos de fuente
  weights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  
  // Alturas de línea
  lineHeights: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
};

export const BorderRadius = {
  sm: 8,
  base: 12,
  md: 16,
  lg: 20,
  xl: 24,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2,
  },
  base: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 5,
  },
  lg: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
};

// Configuración de animaciones
export const Animations = {
  fast: 200,
  normal: 300,
  slow: 500,
};

