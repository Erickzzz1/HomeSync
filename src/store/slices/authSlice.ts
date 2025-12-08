/**
 * authSlice - Redux Toolkit Slice para Autenticación
 * 
 * Maneja el estado global de autenticación en la aplicación
 * utilizando Redux Toolkit para simplificar la gestión de estado.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from 'firebase/auth';

/**
 * Estado de autenticación en Redux
 */
interface AuthState {
  user: {
    uid: string;
    email: string | null;
    displayName: string | null;
    emailVerified?: boolean;
  } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Estado inicial
 */
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true, // true al inicio para verificar sesión persistente
  error: null
};

/**
 * Slice de autenticación
 */
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Establece el usuario autenticado
     */
    setUser: (state, action: PayloadAction<User | null>) => {
      if (action.payload) {
        state.user = {
          uid: action.payload.uid,
          email: action.payload.email,
          displayName: action.payload.displayName,
          emailVerified: action.payload.emailVerified || false
        };
        state.isAuthenticated = true;
      } else {
        state.user = null;
        state.isAuthenticated = false;
      }
      state.isLoading = false;
      state.error = null;
    },

    /**
     * Establece el estado de carga
     */
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    /**
     * Establece un error de autenticación
     */
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
    },

    /**
     * Limpia el error actual
     */
    clearError: (state) => {
      state.error = null;
    },

    /**
     * Cierra la sesión (limpia el estado)
     */
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
    }
  }
});

// Exportar acciones
export const { setUser, setLoading, setError, clearError, logout } = authSlice.actions;

// Exportar reducer
export default authSlice.reducer;

