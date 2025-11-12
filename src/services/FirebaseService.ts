/**
 * FirebaseService - Implementación del Singleton Pattern
 * 
 * Esta clase garantiza una única instancia de conexión con Firebase
 * en toda la aplicación, optimizando recursos y manteniendo coherencia
 * en el estado de autenticación.
 * 
 * Principios de Codificación Segura Aplicados:
 * - Variables de entorno para credenciales sensibles
 * - Inicialización segura y controlada
 * - Manejo de errores robusto
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  Auth,
  initializeAuth,
  browserLocalPersistence,
  getReactNativePersistence 
} from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
  FIREBASE_MEASUREMENT_ID
} from '@env';

class FirebaseService {
  private static instance: FirebaseService;
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private firestore: Firestore | null = null;
  private isInitialized: boolean = false;

  /**
   * Constructor privado para prevenir instanciación directa
   * (Implementación del patrón Singleton)
   */
  private constructor() {}

  /**
   * Obtiene la única instancia de FirebaseService
   * @returns {FirebaseService} Instancia única del servicio
   */
  public static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }

  /**
   * Inicializa Firebase con las credenciales del entorno
   * Aplica validación de configuración para seguridad
   * 
   * @throws {Error} Si faltan credenciales de configuración
   */
  public initialize(): void {
    if (this.isInitialized) {
      console.log('Firebase ya está inicializado');
      return;
    }

    try {
      // Validación de seguridad: Verificar que existan las variables de entorno
      this.validateFirebaseConfig();

      const firebaseConfig = {
        apiKey: FIREBASE_API_KEY,
        authDomain: FIREBASE_AUTH_DOMAIN,
        projectId: FIREBASE_PROJECT_ID,
        storageBucket: FIREBASE_STORAGE_BUCKET,
        messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
        appId: FIREBASE_APP_ID,
        measurementId: FIREBASE_MEASUREMENT_ID
      };

      // Inicializar la aplicación de Firebase
      this.app = initializeApp(firebaseConfig);

      // Inicializar Auth con persistencia según plataforma
      if (Platform.OS === 'web') {
        // Para web: usar getAuth con persistencia de navegador
        this.auth = getAuth(this.app);
        // Configurar persistencia para web
        this.auth.setPersistence(browserLocalPersistence).catch((error) => {
          console.warn('No se pudo configurar persistencia en web:', error);
        });
        console.log('🌐 Firebase inicializado para WEB');
      } else {
        // Para móvil: usar initializeAuth con AsyncStorage
        this.auth = initializeAuth(this.app, {
          persistence: getReactNativePersistence(AsyncStorage)
        });
        console.log('📱 Firebase inicializado para MÓVIL');
      }

      // Inicializar Firestore
      this.firestore = getFirestore(this.app);

      this.isInitialized = true;
      console.log('✅ Firebase inicializado correctamente');
    } catch (error) {
      console.error('❌ Error al inicializar Firebase:', error);
      throw new Error('No se pudo inicializar Firebase. Verifica la configuración.');
    }
  }

  /**
   * Valida que todas las credenciales de Firebase estén presentes
   * Principio de Seguridad: Fail-fast ante configuración incompleta
   * 
   * @throws {Error} Si falta alguna credencial requerida
   */
  private validateFirebaseConfig(): void {
    const requiredVars = {
      FIREBASE_API_KEY,
      FIREBASE_AUTH_DOMAIN,
      FIREBASE_PROJECT_ID,
      FIREBASE_STORAGE_BUCKET,
      FIREBASE_MESSAGING_SENDER_ID,
      FIREBASE_APP_ID
    };

    const missingVars = Object.entries(requiredVars)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingVars.length > 0) {
      throw new Error(
        `Faltan las siguientes variables de entorno: ${missingVars.join(', ')}\n` +
        'Por favor, configura tu archivo .env basándote en .env.example'
      );
    }
  }

  /**
   * Obtiene la instancia de Firebase Auth
   * @returns {Auth} Instancia de Firebase Authentication
   * @throws {Error} Si Firebase no ha sido inicializado
   */
  public getAuth(): Auth {
    if (!this.auth) {
      throw new Error('Firebase Auth no está inicializado. Llama a initialize() primero.');
    }
    return this.auth;
  }

  /**
   * Obtiene la instancia de Firestore
   * @returns {Firestore} Instancia de Firebase Firestore
   * @throws {Error} Si Firebase no ha sido inicializado
   */
  public getFirestore(): Firestore {
    if (!this.firestore) {
      throw new Error('Firestore no está inicializado. Llama a initialize() primero.');
    }
    return this.firestore;
  }

  /**
   * Verifica si Firebase está inicializado
   * @returns {boolean} True si está inicializado
   */
  public isReady(): boolean {
    return this.isInitialized;
  }
}

export default FirebaseService;

