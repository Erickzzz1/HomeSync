/**
 * AuthViewModel - Capa de lógica de presentación (MVVM)
 * 
 * Gestiona la lógica de autenticación y actúa como intermediario
 * entre las vistas y el repositorio. Implementa validaciones adicionales
 * y mantiene el estado de la UI.
 * 
 * Responsabilidades:
 * - Validación de entrada desde la UI
 * - Coordinación de operaciones de autenticación
 * - Gestión de estados de carga y errores
 * - Transformación de datos para la presentación
 */

import AuthRepository from '../repositories/AuthRepository';
import { SignUpData, SignInData, AuthResult } from '../repositories/interfaces/IAuthRepository';
import { User } from 'firebase/auth';

/**
 * Estados posibles de una operación de autenticación
 */
export enum AuthStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

/**
 * Estado del ViewModel de autenticación
 */
export interface AuthState {
  status: AuthStatus;
  user: User | null;
  error: string | null;
  isAuthenticated: boolean;
}

/**
 * Errores de validación del formulario
 */
export interface ValidationErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  displayName?: string;
}

class AuthViewModel {
  private authRepository: AuthRepository;
  private state: AuthState;
  private listeners: Set<(state: AuthState) => void>;

  constructor() {
    this.authRepository = new AuthRepository();
    this.state = {
      status: AuthStatus.IDLE,
      user: null,
      error: null,
      isAuthenticated: false
    };
    this.listeners = new Set();

    // Observar cambios en el estado de autenticación
    this.initAuthStateListener();
  }

  /**
   * Inicializa el listener de estado de autenticación
   */
  private initAuthStateListener(): void {
    this.authRepository.onAuthStateChanged((user) => {
      this.updateState({
        user,
        isAuthenticated: !!user,
        status: AuthStatus.IDLE,
        error: null
      });
    });
  }

  /**
   * Registra un nuevo usuario
   * Aplica validaciones antes de proceder
   * 
   * @param email Correo electrónico
   * @param password Contraseña
   * @param confirmPassword Confirmación de contraseña
   * @param displayName Nombre del usuario (opcional)
   * @returns Resultado de la operación
   */
  async signUp(
    email: string,
    password: string,
    confirmPassword: string,
    displayName?: string
  ): Promise<AuthResult> {
    // Validar campos antes de proceder
    const validationErrors = this.validateSignUpForm(email, password, confirmPassword, displayName);
    
    if (Object.keys(validationErrors).length > 0) {
      const errorMessage = Object.values(validationErrors)[0];
      this.updateState({
        status: AuthStatus.ERROR,
        error: errorMessage
      });
      return {
        success: false,
        error: errorMessage,
        errorCode: 'VALIDATION_ERROR'
      };
    }

    // Actualizar estado a LOADING
    this.updateState({
      status: AuthStatus.LOADING,
      error: null
    });

    // HU-02: Normalización de datos antes de enviar
    // Email: toLowerCase y trim
    const normalizedEmail = email.trim().toLowerCase();
    
    // Nombre: trim y reemplazar múltiples espacios por uno solo
    let normalizedDisplayName: string | undefined = undefined;
    if (displayName) {
      let normalized = displayName.trim();
      normalized = normalized.replace(/\s+/g, ' '); // Reemplazar múltiples espacios por uno solo
      if (normalized.length > 0) {
        normalizedDisplayName = normalized;
      }
    }

    // Ejecutar registro con datos normalizados
    const signUpData: SignUpData = {
      email: normalizedEmail,
      password,
      displayName: normalizedDisplayName
    };

    const result = await this.authRepository.signUp(signUpData);

    // Actualizar estado según resultado
    if (result.success) {
      this.updateState({
        status: AuthStatus.SUCCESS,
        user: result.user || null,
        isAuthenticated: true,
        error: null
      });
    } else {
      this.updateState({
        status: AuthStatus.ERROR,
        error: result.error || 'Error desconocido'
      });
    }

    return result;
  }

  /**
   * Inicia sesión con credenciales
   * 
   * @param email Correo electrónico
   * @param password Contraseña
   * @returns Resultado de la operación
   */
  async signIn(email: string, password: string): Promise<AuthResult> {
    // Validar campos
    const validationErrors = this.validateSignInForm(email, password);
    
    if (Object.keys(validationErrors).length > 0) {
      const errorMessage = Object.values(validationErrors)[0];
      this.updateState({
        status: AuthStatus.ERROR,
        error: errorMessage
      });
      return {
        success: false,
        error: errorMessage,
        errorCode: 'VALIDATION_ERROR'
      };
    }

    this.updateState({
      status: AuthStatus.LOADING,
      error: null
    });

    const signInData: SignInData = {
      email: email.trim(),
      password
    };

    const result = await this.authRepository.signIn(signInData);

    if (result.success) {
      this.updateState({
        status: AuthStatus.SUCCESS,
        user: result.user || null,
        isAuthenticated: true,
        error: null
      });
    } else {
      this.updateState({
        status: AuthStatus.ERROR,
        error: result.error || 'Error desconocido'
      });
    }

    return result;
  }

  /**
   * Cierra la sesión del usuario actual
   * 
   * @returns Resultado de la operación
   */
  async signOut(): Promise<AuthResult> {
    this.updateState({
      status: AuthStatus.LOADING,
      error: null
    });

    const result = await this.authRepository.signOut();

    if (result.success) {
      this.updateState({
        status: AuthStatus.IDLE,
        user: null,
        isAuthenticated: false,
        error: null
      });
    } else {
      this.updateState({
        status: AuthStatus.ERROR,
        error: result.error || 'Error al cerrar sesión'
      });
    }

    return result;
  }

  /**
   * Valida el formulario de registro
   * Principio de Seguridad: Validación exhaustiva de entrada
   * 
   * @returns Objeto con errores de validación (vacío si todo es válido)
   */
  validateSignUpForm(
    email: string,
    password: string,
    confirmPassword: string,
    displayName?: string
  ): ValidationErrors {
    const errors: ValidationErrors = {};

    // Validar email
    if (!email || !email.trim()) {
      errors.email = 'El correo electrónico es requerido';
    } else if (!this.isValidEmail(email)) {
      errors.email = 'El formato del correo electrónico no es válido';
    }

    // Validar contraseña
    if (!password) {
      errors.password = 'La contraseña es requerida';
    } else if (password.length < 8) {
      errors.password = 'La contraseña debe tener al menos 8 caracteres';
    } else if (password.length > 128) {
      errors.password = 'La contraseña es demasiado larga';
    } else if (!this.isStrongPassword(password)) {
      errors.password = 'La contraseña debe contener letras y números';
    }

    // Validar confirmación de contraseña
    if (!confirmPassword) {
      errors.confirmPassword = 'Debes confirmar la contraseña';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden';
    }

    // Validar nombre (opcional)
    if (displayName) {
      if (displayName.length < 2) {
        errors.displayName = 'El nombre debe tener al menos 2 caracteres';
      } else if (displayName.length > 50) {
        errors.displayName = 'El nombre no puede exceder 50 caracteres';
      }
    }

    return errors;
  }

  /**
   * Valida el formulario de inicio de sesión
   * 
   * Requisitos de seguridad:
   * - Email: formato válido
   * - Contraseña: mínimo 8 caracteres
   * 
   * @returns Objeto con errores de validación
   */
  validateSignInForm(email: string, password: string): ValidationErrors {
    const errors: ValidationErrors = {};

    // Validar email
    if (!email || !email.trim()) {
      errors.email = 'El correo electrónico es requerido';
    } else if (!this.isValidEmail(email)) {
      errors.email = 'El formato del correo electrónico no es válido';
    }

    // Validar contraseña
    if (!password) {
      errors.password = 'La contraseña es requerida';
    } else if (password.length < 8) {
      errors.password = 'La contraseña debe tener al menos 8 caracteres';
    }

    return errors;
  }

  /**
   * Valida formato de email
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Verifica si la contraseña es suficientemente fuerte
   * Requiere al menos una letra y un número
   */
  private isStrongPassword(password: string): boolean {
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    return hasLetter && hasNumber;
  }

  /**
   * Obtiene el estado actual
   */
  getState(): AuthState {
    return { ...this.state };
  }

  /**
   * Suscribe un listener a cambios de estado
   * 
   * @param listener Función a ejecutar cuando cambia el estado
   * @returns Función para cancelar la suscripción
   */
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Actualiza el estado y notifica a los listeners
   */
  private updateState(partialState: Partial<AuthState>): void {
    this.state = { ...this.state, ...partialState };
    this.listeners.forEach(listener => listener(this.state));
  }

  /**
   * Limpia el error actual
   */
  clearError(): void {
    this.updateState({ error: null });
  }
}

export default AuthViewModel;

