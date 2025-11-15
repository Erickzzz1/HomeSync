/**
 * App.tsx - Punto de entrada principal de la aplicación HomeSync
 * 
 * Configura:
 * - Firebase Service (Singleton)
 * - Redux Provider para estado global
 * - React Navigation para navegación
 * - Observador de autenticación
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { Provider } from 'react-redux';
import { store } from './src/store/store';
import FirebaseService from './src/services/FirebaseService';
import RootNavigator from './src/navigation/AppNavigator';
import { setUser } from './src/store/slices/authSlice';
import { clearTasks } from './src/store/slices/taskSlice';
import AuthRepository from './src/repositories/AuthRepository';

/**
 * Componente principal de la aplicación
 */
export default function App() {
  useEffect(() => {
    // Inicializar Firebase al arrancar la aplicación
    try {
      const firebaseService = FirebaseService.getInstance();
      firebaseService.initialize();

      // Configurar listener de autenticación persistente
      const authRepository = new AuthRepository();
      const unsubscribe = authRepository.onAuthStateChanged((user) => {
        store.dispatch(setUser(user));
        // Limpiar tareas cuando el usuario se desautentica
        if (!user) {
          store.dispatch(clearTasks());
        }
      });

      // Cleanup al desmontar
      return () => unsubscribe();
    } catch (error) {
      console.error('Error al inicializar la aplicación:', error);
    }
  }, []);

  return (
    <Provider store={store}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <RootNavigator />
    </Provider>
  );
}

