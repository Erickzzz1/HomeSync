/**
 * FirebaseService - Servicio para Firebase en el frontend
 * 
 * Configura Firebase Client SDK para usar onSnapshot
 * y otras operaciones en tiempo real desde React Native.
 * 
 * IMPORTANTE: Para que onSnapshot funcione con las reglas de seguridad,
 * el usuario debe estar autenticado en Firebase Auth. Este servicio
 * sincroniza la autenticación de la API con Firebase Auth.
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence, Auth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  FIREBASE_API_KEY, 
  FIREBASE_AUTH_DOMAIN, 
  FIREBASE_PROJECT_ID, 
  FIREBASE_STORAGE_BUCKET, 
  FIREBASE_MESSAGING_SENDER_ID, 
  FIREBASE_APP_ID 
} from '@env';
import ApiService from './ApiService';

// Configuración de Firebase
// Validar que las variables de entorno estén definidas
console.log('[FirebaseService] Verificando variables de entorno...');
console.log('[FirebaseService] FIREBASE_API_KEY:', FIREBASE_API_KEY ? 'DEFINIDA' : 'NO DEFINIDA');
console.log('[FirebaseService] FIREBASE_PROJECT_ID:', FIREBASE_PROJECT_ID ? 'DEFINIDA' : 'NO DEFINIDA');
console.log('[FirebaseService] FIREBASE_AUTH_DOMAIN:', FIREBASE_AUTH_DOMAIN ? 'DEFINIDA' : 'NO DEFINIDA');

if (!FIREBASE_API_KEY || !FIREBASE_PROJECT_ID) {
  console.error('[FirebaseService] ERROR: Variables de entorno de Firebase no están definidas. Verifica tu archivo .env');
  console.error('[FirebaseService] FIREBASE_API_KEY:', FIREBASE_API_KEY);
  console.error('[FirebaseService] FIREBASE_PROJECT_ID:', FIREBASE_PROJECT_ID);
}

const firebaseConfig = {
  apiKey: FIREBASE_API_KEY || '',
  authDomain: FIREBASE_AUTH_DOMAIN || '',
  projectId: FIREBASE_PROJECT_ID || '',
  storageBucket: FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID || '',
  appId: FIREBASE_APP_ID || ''
};

// Inicializar Firebase (si no está inicializado)
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;

try {
  console.log('[FirebaseService] Inicializando Firebase...');
  // Solo inicializar si tenemos las configuraciones mínimas necesarias
  if (FIREBASE_API_KEY && FIREBASE_PROJECT_ID) {
    console.log('[FirebaseService] Project ID:', FIREBASE_PROJECT_ID);
    if (getApps().length === 0) {
      console.log('[FirebaseService] Creando nueva instancia de Firebase');
      app = initializeApp(firebaseConfig);
      
      // Inicializar Auth con persistencia usando AsyncStorage
      try {
        console.log('[FirebaseService] Inicializando Firebase Auth con persistencia AsyncStorage...');
        auth = initializeAuth(app, {
          persistence: getReactNativePersistence(AsyncStorage)
        });
        console.log('[FirebaseService] Firebase Auth inicializado con persistencia');
      } catch (error: any) {
        // Si ya está inicializado, usar getAuth
        if (error.code === 'auth/already-initialized') {
          console.log('[FirebaseService] Firebase Auth ya inicializado, usando getAuth');
          auth = getAuth(app);
        } else {
          console.error('[FirebaseService] Error al inicializar Auth con persistencia:', error);
          auth = getAuth(app);
        }
      }
      
      firestore = getFirestore(app);
      console.log('[FirebaseService] Firebase inicializado exitosamente');
    } else {
      console.log('[FirebaseService] Usando instancia existente de Firebase');
      app = getApps()[0];
      
      // Intentar inicializar Auth con persistencia si no está inicializado
      try {
        auth = initializeAuth(app, {
          persistence: getReactNativePersistence(AsyncStorage)
        });
        console.log('[FirebaseService] Firebase Auth inicializado con persistencia');
      } catch (error: any) {
        // Si ya está inicializado, usar getAuth
        if (error.code === 'auth/already-initialized') {
          console.log('[FirebaseService] Firebase Auth ya inicializado, usando getAuth');
          auth = getAuth(app);
        } else {
          console.error('[FirebaseService] Error al inicializar Auth con persistencia:', error);
          auth = getAuth(app);
        }
      }
      
      firestore = getFirestore(app);
    }
    console.log('[FirebaseService] Auth disponible:', !!auth);
    console.log('[FirebaseService] Firestore disponible:', !!firestore);
  } else {
    console.error('[FirebaseService] ERROR: Variables de entorno faltantes');
    console.error('[FirebaseService] FIREBASE_API_KEY:', !!FIREBASE_API_KEY);
    console.error('[FirebaseService] FIREBASE_PROJECT_ID:', !!FIREBASE_PROJECT_ID);
  }
} catch (error) {
  console.error('[FirebaseService] ERROR al inicializar Firebase:', error);
  console.error('[FirebaseService] Stack trace:', error instanceof Error ? error.stack : 'N/A');
  // Continuar sin Firebase - la app puede funcionar sin él para algunas funciones
}

/**
 * Sincroniza la autenticación de la API con Firebase Auth
 * Esto es necesario para que onSnapshot funcione con las reglas de seguridad
 */
export const syncFirebaseAuth = async (email: string, password: string): Promise<boolean> => {
  try {
    console.log('[FirebaseService] syncFirebaseAuth llamado para:', email);
    if (!auth) {
      console.error('[FirebaseService] ERROR: Firebase Auth no está disponible');
      return false;
    }
    
    // Si ya hay un usuario autenticado, cerrar sesión primero
    if (auth.currentUser) {
      console.log('[FirebaseService] Cerrando sesión de usuario actual:', auth.currentUser.uid);
      await signOut(auth);
    }

    // Autenticar en Firebase Auth con las mismas credenciales
    console.log('[FirebaseService] Autenticando en Firebase Auth...');
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('[FirebaseService] Autenticación exitosa. Usuario:', userCredential.user.uid);
    return true;
  } catch (error: any) {
    console.error('[FirebaseService] ERROR al sincronizar autenticación con Firebase:', error);
    console.error('[FirebaseService] Código de error:', error?.code);
    console.error('[FirebaseService] Mensaje:', error?.message);
    return false;
  }
};

/**
 * Cierra la sesión en Firebase Auth
 */
export const signOutFirebase = async (): Promise<void> => {
  try {
    if (!auth) {
      return;
    }
    await signOut(auth);
  } catch (error) {
    console.error('Error al cerrar sesión en Firebase:', error);
  }
};

/**
 * Obtiene la instancia de Firebase Auth
 */
export const getFirebaseAuth = (): Auth | null => {
  return auth;
};

/**
 * Verifica si Firebase Auth tiene un usuario autenticado
 * Firebase Auth mantiene la sesión automáticamente, pero puede tardar un momento
 */
export const checkFirebaseAuthState = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!auth) {
      console.log('[FirebaseService] Auth no disponible');
      resolve(false);
      return;
    }

    // Firebase Auth debería mantener la sesión automáticamente
    // Esperar un momento para que se restaure la sesión persistente
    const checkUser = () => {
      if (auth.currentUser) {
        console.log('[FirebaseService] Usuario encontrado en Firebase Auth:', auth.currentUser.uid);
        resolve(true);
      } else {
        console.log('[FirebaseService] No hay usuario en Firebase Auth');
        resolve(false);
      }
    };

    // Intentar inmediatamente
    checkUser();

    // También escuchar cambios en el estado de autenticación
    // Firebase Auth puede tardar un momento en restaurar la sesión persistente
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log('[FirebaseService] Sesión de Firebase Auth restaurada:', user.uid);
        unsubscribe();
        resolve(true);
      } else {
        console.log('[FirebaseService] Firebase Auth no tiene sesión persistente');
        // Esperar un poco más antes de resolver como false
        setTimeout(() => {
          unsubscribe();
          resolve(false);
        }, 2000);
      }
    });
  });
};

export { auth, firestore };
export default { auth, firestore };

