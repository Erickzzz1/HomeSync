/**
 * store.ts - Configuración del Store de Redux
 * 
 * Configura el store principal de Redux con todos los slices
 */

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import taskReducer from './slices/taskSlice';

/**
 * Configuración del store de Redux
 */
export const store = configureStore({
  reducer: {
    auth: authReducer,
    tasks: taskReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignorar estas rutas para objetos no serializables de Firebase
        ignoredActions: ['auth/setUser'],
        ignoredPaths: ['auth.user']
      }
    })
});

// Tipos para TypeScript
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

