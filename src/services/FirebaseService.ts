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
import { getAuth, Auth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
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
if (!FIREBASE_API_KEY || !FIREBASE_PROJECT_ID) {
  console.error('Error: Variables de entorno de Firebase no están definidas. Verifica tu archivo .env');
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
  // Solo inicializar si tenemos las configuraciones mínimas necesarias
  if (FIREBASE_API_KEY && FIREBASE_PROJECT_ID) {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      firestore = getFirestore(app);
    } else {
      app = getApps()[0];
      auth = getAuth(app);
      firestore = getFirestore(app);
    }
  } else {
    console.warn('Firebase no inicializado: Variables de entorno faltantes');
  }
} catch (error) {
  console.error('Error al inicializar Firebase:', error);
  // Continuar sin Firebase - la app puede funcionar sin él para algunas funciones
}

/**
 * Sincroniza la autenticación de la API con Firebase Auth
 * Esto es necesario para que onSnapshot funcione con las reglas de seguridad
 */
export const syncFirebaseAuth = async (email: string, password: string): Promise<boolean> => {
  try {
    if (!auth) {
      console.warn('Firebase Auth no está disponible');
      return false;
    }
    
    // Si ya hay un usuario autenticado, cerrar sesión primero
    if (auth.currentUser) {
      await signOut(auth);
    }

    // Autenticar en Firebase Auth con las mismas credenciales
    await signInWithEmailAndPassword(auth, email, password);
    return true;
  } catch (error) {
    console.error('Error al sincronizar autenticación con Firebase:', error);
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

export { auth, firestore };
export default { auth, firestore };

