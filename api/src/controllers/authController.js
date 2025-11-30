/**
 * Controlador de autenticación
 * 
 * Maneja las operaciones de autenticación usando Firebase
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile
} from 'firebase/auth';
import { auth } from '../config/firebase.js';

/**
 * Registra un nuevo usuario
 */
export const signUp = async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    // Validación
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email y contraseña son requeridos',
        errorCode: 'VALIDATION_ERROR'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'La contraseña debe tener al menos 6 caracteres',
        errorCode: 'VALIDATION_ERROR'
      });
    }

    // Crear usuario en Firebase
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Actualizar perfil si se proporciona nombre
    if (displayName && userCredential.user) {
      await updateProfile(userCredential.user, {
        displayName: displayName
      });
    }

    // Obtener token de ID
    const token = await userCredential.user.getIdToken();

    // Preparar respuesta
    const user = {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      displayName: userCredential.user.displayName,
      emailVerified: userCredential.user.emailVerified
    };

    res.json({
      success: true,
      user,
      token
    });
  } catch (error) {
    // console.error('Error en registro:', error);
    const errorMessage = handleAuthError(error);
    res.status(400).json({
      success: false,
      error: errorMessage,
      errorCode: error.code || 'AUTH_ERROR'
    });
  }
};

/**
 * Inicia sesión con email y contraseña
 */
export const signIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validación
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email y contraseña son requeridos',
        errorCode: 'VALIDATION_ERROR'
      });
    }

    // Iniciar sesión en Firebase
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Obtener token de ID
    const token = await userCredential.user.getIdToken();

    // Preparar respuesta
    const user = {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      displayName: userCredential.user.displayName,
      emailVerified: userCredential.user.emailVerified
    };

    res.json({
      success: true,
      user,
      token
    });
  } catch (error) {
    console.error('Error en inicio de sesión:', error);
    const errorMessage = handleAuthError(error);
    res.status(400).json({
      success: false,
      error: errorMessage,
      errorCode: error.code || 'AUTH_ERROR'
    });
  }
};

/**
 * Cierra la sesión del usuario actual
 */
export const signOut = async (req, res) => {
  try {
    await firebaseSignOut(auth);
    res.json({
      success: true
    });
  } catch (error) {
    // console.error('Error al cerrar sesión:', error);
    res.status(400).json({
      success: false,
      error: 'No se pudo cerrar la sesión',
      errorCode: 'SIGN_OUT_ERROR'
    });
  }
};

/**
 * Obtiene el usuario actual basado en el token
 */
export const getCurrentUser = async (req, res) => {
  try {
    // El middleware verifyToken ya verificó el token y agregó req.user
    // Usamos la información del token decodificado
    const user = {
      uid: req.user.uid,
      email: req.user.email,
      displayName: req.user.displayName,
      emailVerified: true // Asumimos verificado si el token es válido
    };

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(400).json({
      success: false,
      error: 'No se pudo obtener el usuario',
      errorCode: 'GET_USER_ERROR'
    });
  }
};

/**
 * Maneja errores de Firebase Authentication
 */
function handleAuthError(error) {
  switch (error.code) {
    case 'auth/email-already-in-use':
      return 'Este correo electrónico ya está registrado';
    case 'auth/invalid-email':
      return 'El correo electrónico no es válido';
    case 'auth/operation-not-allowed':
      return 'La operación no está permitida';
    case 'auth/weak-password':
      return 'La contraseña es muy débil. Usa al menos 6 caracteres';
    case 'auth/user-disabled':
      return 'Esta cuenta ha sido deshabilitada';
    case 'auth/user-not-found':
      return 'No existe una cuenta con este correo electrónico';
    case 'auth/wrong-password':
      return 'Contraseña incorrecta';
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'Contraseña incorrecta';
    case 'auth/too-many-requests':
      return 'Demasiados intentos fallidos. Intenta más tarde';
    case 'auth/network-request-failed':
      return 'Error de conexión. Verifica tu internet';
    default:
      return 'Ocurrió un error inesperado. Intenta nuevamente';
  }
}
