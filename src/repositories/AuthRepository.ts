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
    try {
      const token = await ApiService.getToken();
      if (token) {
        const response = await ApiService.get<ApiAuthResponse>('/api/auth/me');
        if (response.success && response.user) {
          const user = this.apiUserToFirebaseUser(response.user);
          this.notifyAuthStateChange(user);
          return;
        }
      }
    } catch (error) {
      // console.log('No hay sesión activa');
    }
    this.notifyAuthStateChange(null);
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

      // Enviar petición a la API
      const response = await ApiService.post<ApiAuthResponse>('/api/auth/signup', {
        email: data.email,
        password: data.password,
        displayName: data.displayName
      });

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Error al registrar usuario',
          errorCode: response.errorCode
        };
      }

      // Guardar token
      if (response.token) {
        await ApiService.saveToken(response.token);
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
      return {
        success: false,
        error: error.message || 'Ocurrió un error al registrar el usuario',
        errorCode: 'SIGNUP_ERROR'
      };
    }
  }

  /**
   * Inicia sesión con email y contraseña a través de la API
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
        return {
          success: false,
          error: response.error || 'Error al iniciar sesión',
          errorCode: response.errorCode
        };
      }

      // Guardar token
      if (response.token) {
        await ApiService.saveToken(response.token);
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
      return {
        success: false,
        error: error.message || 'Ocurrió un error al iniciar sesión',
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

    if (!data.password || data.password.length < 6) {
      return 'La contraseña debe tener al menos 6 caracteres';
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
}

export default AuthRepository;
