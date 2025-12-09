/**
 * AuthRepository - Implementación del Repository Pattern
 * 
 * Implementa la interfaz IAuthRepository utilizando la API backend.
 * Aplica principios de codificación segura en todas las operaciones.
 * 
 * Principios de Seguridad Implementados:
 * - Manejo robusto de errores con try-catch
 * - Validación de datos de entrada
 * - Mensajes de error amigables sin exponer detalles técnicos
 * - Gestión segura de tokens
 */

import ApiService from '../services/ApiService';
import { syncFirebaseAuth, signOutFirebase, getFirebaseAuth, firestore } from '../services/FirebaseService';
import { sendEmailVerification, reload } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import {
  IAuthRepository,
  AuthResult,
  SignUpData,
  SignInData
} from './interfaces/IAuthRepository';
import { User } from 'firebase/auth';

// Interfaz para la respuesta de la API
interface ApiUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
}

interface ApiAuthResponse {
  success: boolean;
  user?: ApiUser;
  token?: string;
  error?: string;
  errorCode?: string;
}

class AuthRepository implements IAuthRepository {
  private currentUser: User | null = null;
  private authStateListeners: Array<(user: User | null) => void> = [];
  private isCheckingAuth: boolean = false;

  constructor() {
    // Verificar si hay un token guardado al inicializar
    this.checkAuthState();
  }

  /**
   * Convierte un usuario de la API a un objeto User de Firebase
   */
  private apiUserToFirebaseUser(apiUser: ApiUser): User {
    // Crear un objeto que simule la estructura de User de Firebase
    return {
      uid: apiUser.uid,
      email: apiUser.email,
      displayName: apiUser.displayName,
      emailVerified: apiUser.emailVerified,
      // Propiedades requeridas por la interfaz User
      isAnonymous: false,
      metadata: {} as any,
      providerData: [],
      refreshToken: '',
      tenantId: null,
      delete: async () => {},
      getIdToken: async () => {
        const token = await ApiService.getToken();
        return token || '';
      },
      getIdTokenResult: async () => ({} as any),
      reload: async () => {},
      toJSON: () => ({}),
    } as User;
  }

  /**
   * Notifica a todos los listeners sobre cambios en el estado de autenticación
   */
  private notifyAuthStateChange(user: User | null) {
    this.currentUser = user;
    this.authStateListeners.forEach(callback => callback(user));
  }

  /**
   * Verifica el estado de autenticación actual
   */
  private async checkAuthState() {
    // Evitar llamadas múltiples simultáneas
    if (this.isCheckingAuth) {
      return;
    }

    this.isCheckingAuth = true;
    try {
      const token = await ApiService.getToken();
      if (token) {
        try {
          const response = await ApiService.get<ApiAuthResponse>('/api/auth/me');
          if (response && response.success && response.user) {
            const user = this.apiUserToFirebaseUser(response.user);
            this.notifyAuthStateChange(user);
            this.isCheckingAuth = false;
            return;
          }
        } catch (apiError: any) {
          // Silenciar errores 401 (no autenticado) - es un estado esperado
          if (apiError?.status !== 401 && apiError?.errorCode !== 'UNAUTHORIZED') {
            // Solo loguear errores inesperados
            console.error('Error al verificar estado de autenticación:', apiError);
          }
          // Si hay error, notificar que no hay usuario
          this.notifyAuthStateChange(null);
        }
      } else {
        // No hay token, notificar que no hay usuario
        this.notifyAuthStateChange(null);
      }
    } catch (error: any) {
      // Error al obtener token o cualquier otro error
      console.error('Error al verificar estado de autenticación:', error);
      // Notificar que no hay usuario para evitar estados inconsistentes
      this.notifyAuthStateChange(null);
    } finally {
      this.isCheckingAuth = false;
    }
  }

  /**
   * Registra un nuevo usuario a través de la API
   * 
   * @param data Datos de registro validados
   * @returns Resultado de la operación con información del usuario o error
   */
  async signUp(data: SignUpData): Promise<AuthResult> {
    try {
      // Validación adicional antes de enviar a la API
      const validationError = this.validateSignUpData(data);
      if (validationError) {
        return {
          success: false,
          error: validationError,
          errorCode: 'VALIDATION_ERROR'
        };
      }

      // HU-02: Solo enviar displayName si existe y no está vacío
      const requestData: any = {
        email: data.email,
        password: data.password
      };
      
      // Solo agregar displayName si existe y no está vacío
      if (data.displayName && data.displayName.trim().length > 0) {
        requestData.displayName = data.displayName;
      }

      // Enviar petición a la API
      const response = await ApiService.post<ApiAuthResponse>('/api/auth/signup', requestData);

      if (!response.success) {
        // HU-02: Manejo específico de errores
        const errorCode = response.errorCode || '';
        
        // Error de email ya registrado
        if (errorCode === 'auth/email-already-in-use' || 
            errorCode === 'EMAIL_ALREADY_EXISTS' ||
            response.error?.toLowerCase().includes('ya está registrado') ||
            response.error?.toLowerCase().includes('already exists')) {
          return {
            success: false,
            error: 'Este correo electrónico ya está registrado',
            errorCode: 'EMAIL_ALREADY_IN_USE'
          };
        }
        
        // Error de red
        if (errorCode === 'NETWORK_ERROR' || 
            response.error?.toLowerCase().includes('network') ||
            response.error?.toLowerCase().includes('conexión')) {
          return {
            success: false,
            error: 'Error de conexión. Verifica tu internet',
            errorCode: 'NETWORK_ERROR'
          };
        }
        
        // Otros errores
        return {
          success: false,
          error: 'Ocurrió un problema. Intenta más tarde',
          errorCode: response.errorCode || 'SIGNUP_ERROR'
        };
      }

      // Guardar token
      if (response.token) {
        await ApiService.saveToken(response.token);
      }

      // Sincronizar autenticación con Firebase Auth para que podamos enviar email de verificación
      if (response.user?.email && data.password) {
        try {
          await syncFirebaseAuth(data.email, data.password);
          // El email de verificación ya se envió automáticamente en el backend
        } catch (firebaseAuthError) {
          // No fallar el registro si falla la sincronización con Firebase
          console.warn('No se pudo sincronizar con Firebase Auth, pero el registro fue exitoso:', firebaseAuthError);
        }
      }

      // Convertir usuario de API a formato Firebase
      let user: User | undefined;
      if (response.user) {
        user = this.apiUserToFirebaseUser(response.user);
        this.notifyAuthStateChange(user);
      }

      // console.log('Usuario registrado exitosamente:', response.user?.email);

      return {
        success: true,
        user
      };
    } catch (error: any) {
      console.error('Error en registro:', error);
      
      // HU-02: Manejo específico de errores en catch
      const errorMessage = error.message || '';
      
      // Error de email ya registrado
      if (errorMessage.includes('email-already-in-use') ||
          errorMessage.includes('EMAIL_ALREADY_EXISTS') ||
          errorMessage.toLowerCase().includes('already exists')) {
        return {
          success: false,
          error: 'Este correo electrónico ya está registrado',
          errorCode: 'EMAIL_ALREADY_IN_USE'
        };
      }
      
      // Error de red
      if (errorMessage.toLowerCase().includes('network') || 
          errorMessage.toLowerCase().includes('fetch') ||
          errorMessage.toLowerCase().includes('internet') ||
          errorMessage.toLowerCase().includes('failed to fetch') ||
          errorMessage.toLowerCase().includes('network request failed')) {
        return {
          success: false,
          error: 'Error de conexión. Verifica tu internet',
          errorCode: 'NETWORK_ERROR'
        };
      }
      
      // Otros errores
      return {
        success: false,
        error: 'Ocurrió un problema. Intenta más tarde',
        errorCode: 'SIGNUP_ERROR'
      };
    }
  }

  /**
   * Inicia sesión con email y contraseña a través de la API
   * 
   * Principio de Seguridad: Nunca revela si el email existe o no
   * Todos los errores de credenciales devuelven el mismo mensaje genérico
   * 
   * @param data Credenciales de inicio de sesión
   * @returns Resultado de la operación
   */
  async signIn(data: SignInData): Promise<AuthResult> {
    try {
      const validationError = this.validateSignInData(data);
      if (validationError) {
        return {
          success: false,
          error: validationError,
          errorCode: 'VALIDATION_ERROR'
        };
      }

      // Enviar petición a la API
      const response = await ApiService.post<ApiAuthResponse>('/api/auth/signin', {
        email: data.email,
        password: data.password
      });

      if (!response.success) {
        // Errores de credenciales: siempre mensaje genérico
        const credentialErrors = [
          'auth/user-not-found',
          'auth/wrong-password',
          'auth/invalid-credential',
          'auth/invalid-login-credentials',
          'INVALID_CREDENTIALS',
          'WRONG_PASSWORD',
          'USER_NOT_FOUND'
        ];

        if (response.errorCode && credentialErrors.includes(response.errorCode)) {
          return {
            success: false,
            error: 'Correo o contraseña incorrectos',
            errorCode: 'INVALID_CREDENTIALS'
          };
        }

        // Error de red (sin conexión)
        if (response.errorCode === 'NETWORK_ERROR' || response.error?.toLowerCase().includes('network')) {
          return {
            success: false,
            error: 'No hay conexión a internet',
            errorCode: 'NETWORK_ERROR'
          };
        }

        // Otros errores
        return {
          success: false,
          error: 'No se pudo completar la solicitud. Inténtalo más tarde',
          errorCode: response.errorCode || 'SIGNIN_ERROR'
        };
      }

      // Guardar token
      if (response.token) {
        await ApiService.saveToken(response.token);
      }

      // Sincronizar autenticación con Firebase Auth para que onSnapshot funcione
      if (response.user?.email) {
        try {
          await syncFirebaseAuth(data.email, data.password);
        } catch (firebaseAuthError) {
          // No fallar el login si falla la sincronización con Firebase
          // onSnapshot seguirá funcionando con las reglas que permiten lectura autenticada
          console.warn('No se pudo sincronizar con Firebase Auth, pero el login fue exitoso:', firebaseAuthError);
        }
      }

      // Convertir usuario de API a formato Firebase
      let user: User | undefined;
      if (response.user) {
        user = this.apiUserToFirebaseUser(response.user);
        this.notifyAuthStateChange(user);
      }

      // console.log('Inicio de sesión exitoso:', response.user?.email);

      return {
        success: true,
        user
      };
    } catch (error: any) {
      console.error('Error en inicio de sesión:', error);
      
      // Detectar errores de red
      if (error.message?.toLowerCase().includes('network') || 
          error.message?.toLowerCase().includes('fetch') ||
          error.message?.toLowerCase().includes('internet') ||
          error.message?.toLowerCase().includes('failed to fetch') ||
          error.message?.toLowerCase().includes('network request failed')) {
        return {
          success: false,
          error: 'No hay conexión a internet',
          errorCode: 'NETWORK_ERROR'
        };
      }

      // Errores de credenciales del catch (si vienen del servidor)
      const credentialErrors = [
        'auth/user-not-found',
        'auth/wrong-password',
        'auth/invalid-credential',
        'auth/invalid-login-credentials'
      ];
      
      if (error.message && credentialErrors.some(code => error.message.includes(code))) {
        return {
          success: false,
          error: 'Correo o contraseña incorrectos',
          errorCode: 'INVALID_CREDENTIALS'
        };
      }

      // Otros errores
      return {
        success: false,
        error: 'No se pudo completar la solicitud. Inténtalo más tarde',
        errorCode: 'SIGNIN_ERROR'
      };
    }
  }

  /**
   * Cierra la sesión del usuario actual
   * 
   * @returns Resultado de la operación
   */
  async signOut(): Promise<AuthResult> {
    try {
      // Llamar a la API para cerrar sesión
      await ApiService.post('/api/auth/signout');

      // Cerrar sesión en Firebase Auth también
      await signOutFirebase();

      // Eliminar token local
      await ApiService.removeToken();

      // Notificar cambio de estado
      this.notifyAuthStateChange(null);

      // console.log('Sesión cerrada exitosamente');

      return {
        success: true
      };
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      // Aún así eliminar el token local
      await ApiService.removeToken();
      this.notifyAuthStateChange(null);
      return {
        success: false,
        error: 'No se pudo cerrar la sesión. Intenta nuevamente.',
        errorCode: 'SIGN_OUT_ERROR'
      };
    }
  }

  /**
   * Obtiene el usuario actualmente autenticado
   * 
   * @returns Usuario actual o null si no hay sesión
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Observa cambios en el estado de autenticación
   * 
   * @param callback Función a ejecutar cuando cambia el estado
   * @returns Función para cancelar la suscripción
   */
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    // Agregar callback a la lista
    this.authStateListeners.push(callback);

    // Ejecutar callback inmediatamente con el estado actual
    callback(this.currentUser);

    // Retornar función para cancelar suscripción
    return () => {
      const index = this.authStateListeners.indexOf(callback);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  /**
   * Valida los datos de registro
   * Principio de Seguridad: Validación de entrada
   * 
   * @param data Datos a validar
   * @returns Mensaje de error o null si es válido
   */
  private validateSignUpData(data: SignUpData): string | null {
    if (!data.email || !data.email.trim()) {
      return 'El correo electrónico es requerido';
    }

    if (!this.isValidEmail(data.email)) {
      return 'El formato del correo electrónico no es válido';
    }

    if (!data.password || data.password.length < 8) {
      return 'La contraseña debe tener al menos 8 caracteres';
    }

    if (data.displayName && data.displayName.length > 50) {
      return 'El nombre no puede exceder 50 caracteres';
    }

    return null;
  }

  /**
   * Valida los datos de inicio de sesión
   * 
   * @param data Datos a validar
   * @returns Mensaje de error o null si es válido
   */
  private validateSignInData(data: SignInData): string | null {
    if (!data.email || !data.email.trim()) {
      return 'El correo electrónico es requerido';
    }

    if (!data.password || !data.password.trim()) {
      return 'La contraseña es requerida';
    }

    return null;
  }

  /**
   * Valida formato de email
   * 
   * @param email Email a validar
   * @returns true si es válido
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Envía un email de verificación al usuario actual
   * 
   * @returns Resultado de la operación
   */
  async sendEmailVerification(): Promise<AuthResult> {
    try {
      const firebaseAuth = getFirebaseAuth();
      const currentUser = firebaseAuth.currentUser;

      if (!currentUser) {
        return {
          success: false,
          error: 'No hay usuario autenticado',
          errorCode: 'NO_USER'
        };
      }

      if (currentUser.emailVerified) {
        return {
          success: false,
          error: 'El correo electrónico ya está verificado',
          errorCode: 'ALREADY_VERIFIED'
        };
      }

      await sendEmailVerification(currentUser);

      // Actualizar Firestore para indicar que se envió el email de verificación
      // (aún no está verificado, pero se envió el email)
      try {
        const userDocRef = doc(firestore, 'users', currentUser.uid);
        await updateDoc(userDocRef, {
          emailVerified: false, // Aún no verificado, pero se envió el email
          updatedAt: new Date().toISOString()
        });
      } catch (firestoreError) {
        // No fallar si no se puede actualizar Firestore
        console.warn('No se pudo actualizar Firestore al enviar verificación:', firestoreError);
      }

      return {
        success: true
      };
    } catch (error: any) {
      console.error('Error al enviar email de verificación:', error);
      
      let errorMessage = 'No se pudo enviar el email de verificación';
      if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Demasiados intentos. Espera unos minutos antes de intentar nuevamente';
      }

      return {
        success: false,
        error: errorMessage,
        errorCode: error.code || 'SEND_VERIFICATION_ERROR'
      };
    }
  }

  /**
   * Recarga la información del usuario actual (para actualizar emailVerified)
   * También actualiza el documento en Firestore
   * 
   * @returns Resultado de la operación
   */
  async reloadUser(): Promise<AuthResult> {
    try {
      const firebaseAuth = getFirebaseAuth();
      const currentUser = firebaseAuth.currentUser;

      if (!currentUser) {
        return {
          success: false,
          error: 'No hay usuario autenticado',
          errorCode: 'NO_USER'
        };
      }

      // Recargar información del usuario
      await reload(currentUser);

      // Sincronizar el estado de verificación en Firestore
      try {
        const userDocRef = doc(firestore, 'users', currentUser.uid);
        await updateDoc(userDocRef, {
          emailVerified: currentUser.emailVerified,
          updatedAt: new Date().toISOString()
        });
      } catch (firestoreError) {
        // No fallar si no se puede actualizar Firestore
        console.warn('No se pudo actualizar emailVerified en Firestore:', firestoreError);
      }

      // Obtener información actualizada
      const updatedUser = this.apiUserToFirebaseUser({
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName,
        emailVerified: currentUser.emailVerified
      });

      // Actualizar estado local
      this.currentUser = updatedUser;
      this.notifyAuthStateChange(updatedUser);

      return {
        success: true,
        user: updatedUser
      };
    } catch (error: any) {
      console.error('Error al recargar usuario:', error);
      return {
        success: false,
        error: 'No se pudo actualizar la información del usuario',
        errorCode: error.code || 'RELOAD_ERROR'
      };
    }
  }
}

export default AuthRepository;
