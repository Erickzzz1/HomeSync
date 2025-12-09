/**
 * App.tsx - Punto de entrada principal de la aplicación HomeSync
 * 
 * Configura:
 * - Redux Provider para estado global
 * - React Navigation para navegación
 * - Observador de autenticación (a través de la API)
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { StatusBar } from 'react-native';
import { Provider } from 'react-redux';
import { store } from './src/store/store';
import RootNavigator from './src/navigation/AppNavigator';
import { setUser } from './src/store/slices/authSlice';
import { clearTasks, setTasks } from './src/store/slices/taskSlice';
import AuthRepository from './src/repositories/AuthRepository';
import { Colors } from './src/constants/design';
import ErrorBoundary from './src/components/ErrorBoundary';
import { subscribeToTasks } from './src/services/TaskFirestoreService';
import { checkFirebaseAuthState } from './src/services/FirebaseService';
import { Unsubscribe } from 'firebase/firestore';
import NetInfo from '@react-native-community/netinfo';

/**
 * Componente principal de la aplicación
 */
export default function App() {
  const unsubscribeTasksRef = useRef<Unsubscribe | null>(null);
  const unsubscribeNetInfoRef = useRef<any>(null);

  /**
   * Configura el listener de tareas en tiempo real
   * Espera a que Firebase Auth restaure la sesión si es necesario
   */
  const setupTasksListener = useCallback(async (userId: string) => {
    // Limpiar listener anterior si existe
    if (unsubscribeTasksRef.current) {
      unsubscribeTasksRef.current();
      unsubscribeTasksRef.current = null;
    }

    try {
      console.log('[App] Configurando listener de tareas para:', userId);
      
      // Verificar si Firebase Auth tiene una sesión persistente
      // Firebase Auth debería mantener la sesión automáticamente, pero puede tardar
      console.log('[App] Verificando sesión de Firebase Auth...');
      const hasFirebaseAuth = await checkFirebaseAuthState();
      
      if (!hasFirebaseAuth) {
        console.warn('[App] Firebase Auth no tiene sesión. Las tareas pueden no cargarse.');
        console.warn('[App] El usuario debería hacer login nuevamente para sincronizar Firebase Auth.');
        // Aún así intentar configurar el listener, puede que funcione con reglas públicas
      } else {
        console.log('[App] Firebase Auth tiene sesión, configurando listener de tareas...');
      }

      unsubscribeTasksRef.current = subscribeToTasks(
        userId,
        (tasks) => {
          console.log('[App] Tareas recibidas:', tasks.length);
          // Actualizar tareas en Redux
          store.dispatch(setTasks(tasks));
        },
        (error) => {
          console.error('[App] Error en listener de tareas:', error);
          // En caso de error, mantener las tareas actuales o limpiar
          store.dispatch(setTasks([]));
        }
      );
    } catch (error) {
      console.error('[App] Error al configurar listener de tareas:', error);
    }
  }, []);

  useEffect(() => {
    // Configurar listener de autenticación persistente
    // Ahora se conecta a la API en lugar de Firebase directamente
    let unsubscribe: (() => void) | null = null;
    
    try {
      const authRepository = new AuthRepository();
      unsubscribe = authRepository.onAuthStateChanged((user) => {
        try {
          console.log('[App] Cambio en estado de autenticación. Usuario:', user?.uid || 'null');
          store.dispatch(setUser(user));
          
          // Limpiar listener de tareas anterior si existe
          if (unsubscribeTasksRef.current) {
            console.log('[App] Limpiando listener de tareas anterior');
            unsubscribeTasksRef.current();
            unsubscribeTasksRef.current = null;
          }
          
          if (user) {
            console.log('[App] Usuario autenticado, configurando listener de tareas para:', user.uid);
            // Configurar listener de tareas cuando el usuario se autentica
            setupTasksListener(user.uid);
          } else {
            console.log('[App] Usuario no autenticado, limpiando tareas');
            // Limpiar tareas cuando el usuario se desautentica
            store.dispatch(clearTasks());
          }
        } catch (error) {
          console.error('[App] Error al actualizar estado de autenticación:', error);
        }
      });
    } catch (error) {
      console.error('Error al inicializar la aplicación:', error);
      // Asegurar que la app no se cierre por este error
    }

    // Configurar listener de conexión de red
    unsubscribeNetInfoRef.current = NetInfo.addEventListener(state => {
      const isOnline = state.isConnected ?? false;
      const currentUser = store.getState().auth.user;
      
      if (currentUser && isOnline) {
        // Si hay usuario y hay conexión, configurar listener de tareas
        if (!unsubscribeTasksRef.current) {
          setupTasksListener(currentUser.uid);
        }
      } else if (!isOnline) {
        // Si no hay conexión, limpiar listener
        if (unsubscribeTasksRef.current) {
          unsubscribeTasksRef.current();
          unsubscribeTasksRef.current = null;
        }
      }
    });

    // Cleanup al desmontar
    return () => {
      try {
        if (unsubscribe) {
          unsubscribe();
        }
        if (unsubscribeTasksRef.current) {
          unsubscribeTasksRef.current();
        }
        if (unsubscribeNetInfoRef.current) {
          unsubscribeNetInfoRef.current();
        }
      } catch (error) {
        console.error('Error al limpiar listeners:', error);
      }
    };
  }, [setupTasksListener]);

  return (
    <ErrorBoundary>
      <Provider store={store}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.blue} />
        <RootNavigator />
      </Provider>
    </ErrorBoundary>
  );
}

