/**
 * AuthRepository - Implementación del Repository Pattern
 * 
 * Implementa la interfaz IAuthRepository utilizando Firebase Authentication.
 * Aplica principios de codificación segura en todas las operaciones.
 * 
 * Principios de Seguridad Implementados:
 * - Manejo robusto de errores con try-catch
 * - Validación de datos de entrada
 * - Mensajes de error amigables sin exponer detalles técnicos
 * - Uso de comunicación cifrada (HTTPS por defecto en Firebase)
 * - Gestión segura de tokens (manejada por Firebase SDK)
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  updateProfile,
  User,
  AuthError
} from 'firebase/auth';
import FirebaseService from '../services/FirebaseService';
import {
  IAuthRepository,
  AuthResult,
  SignUpData,
  SignInData
} from './interfaces/IAuthRepository';

class AuthRepository implements IAuthRepository {
  private firebaseService: FirebaseService;

  constructor() {
    this.firebaseService = FirebaseService.getInstance();
  }

  /**
   * Registra un nuevo usuario en Firebase Authentication
   * 
   * Seguridad:
   * - Valida formato de email y contraseña antes de enviar
   * - Maneja errores específicos de Firebase
   * - No expone detalles técnicos al usuario
   * 
   * @param data Datos de registro validados
   * @returns Resultado de la operación con información del usuario o error
   */
  async signUp(data: SignUpData): Promise<AuthResult> {
    try {
      const auth = this.firebaseService.getAuth();

      // Validación adicional antes de enviar a Firebase
      const validationError = this.validateSignUpData(data);
      if (validationError) {
        return {
          success: false,
          error: validationError,
          errorCode: 'VALIDATION_ERROR'
        };
      }

      // Crear usuario en Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );

      // Si se proporciona nombre, actualizar perfil
      if (data.displayName && userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName: data.displayName
        });
      }

      console.log('✅ Usuario registrado exitosamente:', userCredential.user.email);

      return {
        success: true,
        user: userCredential.user
      };
    } catch (error) {
      console.error('❌ Error en registro:', error);
      return this.handleAuthError(error as AuthError);
    }
  }

  /**
   * Inicia sesión con email y contraseña
   * 
   * @param data Credenciales de inicio de sesión
   * @returns Resultado de la operación
   */
  async signIn(data: SignInData): Promise<AuthResult> {
    try {
      const auth = this.firebaseService.getAuth();

      const validationError = this.validateSignInData(data);
      if (validationError) {
        return {
          success: false,
          error: validationError,
          errorCode: 'VALIDATION_ERROR'
        };
      }

      const userCredential = await signInWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );

      console.log('✅ Inicio de sesión exitoso:', userCredential.user.email);

      return {
        success: true,
        user: userCredential.user
      };
    } catch (error) {
      console.error('❌ Error en inicio de sesión:', error);
      return this.handleAuthError(error as AuthError);
    }
  }

  /**
   * Cierra la sesión del usuario actual
   * 
   * @returns Resultado de la operación
   */
  async signOut(): Promise<AuthResult> {
    try {
      const auth = this.firebaseService.getAuth();
      await firebaseSignOut(auth);

      console.log('✅ Sesión cerrada exitosamente');

      return {
        success: true
      };
    } catch (error) {
      console.error('❌ Error al cerrar sesión:', error);
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
    const auth = this.firebaseService.getAuth();
    return auth.currentUser;
  }

  /**
   * Observa cambios en el estado de autenticación
   * 
   * @param callback Función a ejecutar cuando cambia el estado
   * @returns Función para cancelar la suscripción
   */
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    const auth = this.firebaseService.getAuth();
    return firebaseOnAuthStateChanged(auth, callback);
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

  /**
   * Maneja errores de Firebase Authentication
   * Convierte códigos de error técnicos en mensajes amigables
   * Principio de Seguridad: No exponer detalles técnicos
   * 
   * @param error Error de Firebase
   * @returns Resultado con mensaje de error amigable
   */
  private handleAuthError(error: AuthError): AuthResult {
    let errorMessage: string;

    switch (error.code) {
      case 'auth/email-already-in-use':
        errorMessage = 'Este correo electrónico ya está registrado';
        break;
      case 'auth/invalid-email':
        errorMessage = 'El correo electrónico no es válido';
        break;
      case 'auth/operation-not-allowed':
        errorMessage = 'La operación no está permitida. Contacta al administrador';
        break;
      case 'auth/weak-password':
        errorMessage = 'La contraseña es muy débil. Usa al menos 6 caracteres';
        break;
      case 'auth/user-disabled':
        errorMessage = 'Esta cuenta ha sido deshabilitada';
        break;
      case 'auth/user-not-found':
        errorMessage = 'No existe una cuenta con este correo electrónico';
        break;
      case 'auth/wrong-password':
        errorMessage = 'Contraseña incorrecta';
        break;
      case 'auth/invalid-credential':
        // Firebase 9+ usa este código para credenciales inválidas
        // Puede ser email o password incorrecto, pero por seguridad no especificamos cuál
        errorMessage = 'Contraseña incorrecta';
        break;
      case 'auth/invalid-login-credentials':
        // Código alternativo en algunas versiones
        errorMessage = 'Contraseña incorrecta';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Demasiados intentos fallidos. Intenta más tarde';
        break;
      case 'auth/network-request-failed':
        errorMessage = 'Error de conexión. Verifica tu internet';
        break;
      default:
        errorMessage = 'Ocurrió un error inesperado. Intenta nuevamente';
        console.error('Error no manejado:', error.code);
    }

    return {
      success: false,
      error: errorMessage,
      errorCode: error.code
    };
  }
}

export default AuthRepository;

