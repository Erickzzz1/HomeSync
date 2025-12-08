/**
 * IAuthRepository - Interfaz del Repository Pattern
 * 
 * Define el contrato para las operaciones de autenticación,
 * permitiendo abstraer la implementación específica de Firebase
 * y facilitar testing y mantenibilidad.
 */

import { User } from 'firebase/auth';

/**
 * Resultado de operaciones de autenticación
 */
export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
  errorCode?: string;
}

/**
 * Datos para registro de usuario
 */
export interface SignUpData {
  email: string;
  password: string;
  displayName?: string;
}

/**
 * Datos para inicio de sesión
 */
export interface SignInData {
  email: string;
  password: string;
}

/**
 * Interfaz del repositorio de autenticación
 * Abstrae las operaciones de autenticación del proveedor específico
 */
export interface IAuthRepository {
  /**
   * Registra un nuevo usuario
   * @param data Datos de registro del usuario
   * @returns Resultado de la operación
   */
  signUp(data: SignUpData): Promise<AuthResult>;

  /**
   * Inicia sesión con credenciales
   * @param data Datos de inicio de sesión
   * @returns Resultado de la operación
   */
  signIn(data: SignInData): Promise<AuthResult>;

  /**
   * Cierra la sesión del usuario actual
   * @returns Resultado de la operación
   */
  signOut(): Promise<AuthResult>;

  /**
   * Obtiene el usuario actualmente autenticado
   * @returns Usuario actual o null
   */
  getCurrentUser(): User | null;

  /**
   * Observa cambios en el estado de autenticación
   * @param callback Función a ejecutar cuando cambia el estado
   * @returns Función para cancelar la suscripción
   */
  onAuthStateChanged(callback: (user: User | null) => void): () => void;

  /**
   * Envía un email de verificación al usuario actual
   * @returns Resultado de la operación
   */
  sendEmailVerification(): Promise<AuthResult>;

  /**
   * Recarga la información del usuario actual (para actualizar emailVerified)
   * @returns Resultado de la operación
   */
  reloadUser(): Promise<AuthResult>;
}

