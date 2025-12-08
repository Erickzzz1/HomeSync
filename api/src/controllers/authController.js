/**
 * Controlador de autenticación
 * 
 * Maneja las operaciones de autenticación usando Firebase
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  sendEmailVerification,
  applyActionCode,
  checkActionCode,
  verifyPasswordResetCode
} from 'firebase/auth';
import { collection, doc, setDoc } from 'firebase/firestore';
import { auth, firestore } from '../config/firebase.js';
import { generateUniqueShareCode } from '../utils/shareCodeGenerator.js';

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
    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
    } catch (authError) {
      // Si el error es que el email ya está en uso, intentar iniciar sesión
      if (authError.code === 'auth/email-already-in-use') {
        try {
          userCredential = await signInWithEmailAndPassword(auth, email, password);
        } catch (signInError) {
          const errorMessage = handleAuthError(authError);
          return res.status(400).json({
            success: false,
            error: errorMessage,
            errorCode: authError.code || 'AUTH_ERROR'
          });
        }
      } else {
        const errorMessage = handleAuthError(authError);
        return res.status(400).json({
          success: false,
          error: errorMessage,
          errorCode: authError.code || 'AUTH_ERROR'
        });
      }
    }

    // Si llegamos aquí, el usuario existe en Firebase Auth
    // Ahora intentamos crear el documento en Firestore, pero NO bloqueamos el registro si falla

    // Actualizar perfil si se proporciona nombre
    if (displayName && userCredential.user) {
      try {
        await updateProfile(userCredential.user, {
          displayName: displayName
        });
      } catch (profileError) {
        console.error('Error al actualizar perfil:', profileError);
        // No fallar el registro si falla la actualización del perfil
      }
    }

    // Generar shareCode único y crear documento en Firestore
    // Si falla, NO bloqueamos el registro - el documento se creará más tarde
    (async () => {
      try {
        const shareCode = await generateUniqueShareCode(firestore);
        
        // Crear documento del usuario en Firestore con shareCode
        const userDocRef = doc(collection(firestore, 'users'), userCredential.user.uid);
        await setDoc(userDocRef, {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: displayName || null,
          emailVerified: userCredential.user.emailVerified || false,
          shareCode: shareCode,
          familyMembers: [], // Array vacío inicial
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        console.log('Documento de usuario creado en Firestore exitosamente');
      } catch (firestoreError) {
        console.error('Error al crear documento en Firestore (no crítico):', firestoreError);
        // No hacemos nada - el documento se puede crear más tarde
        // El usuario puede funcionar sin el documento inicialmente
      }
    })(); // Ejecutar en segundo plano sin await

    // Enviar email de verificación
    try {
      await sendEmailVerification(userCredential.user);
      console.log('Email de verificación enviado a:', userCredential.user.email);
    } catch (verificationError) {
      console.error('Error al enviar email de verificación:', verificationError);
      // No fallar el registro si falla el envío del email
    }

    // Obtener token de ID
    const token = await userCredential.user.getIdToken();

    // Preparar respuesta - SIEMPRE devolvemos éxito si el usuario se creó en Firebase Auth
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
    // Este catch solo debería capturar errores antes de crear el usuario en Firebase Auth
    // Si el usuario ya se creó, no deberíamos llegar aquí
    console.error('Error crítico en registro (antes de crear usuario):', error);
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
 * Envía email de verificación al usuario actual
 * Nota: Esta funcionalidad se maneja mejor desde el cliente usando Firebase Auth SDK
 * Se mantiene aquí por compatibilidad pero se recomienda usar el método del repositorio
 */
export const sendVerificationEmail = async (req, res) => {
  try {
    // Esta funcionalidad se maneja mejor desde el cliente
    // El cliente puede usar sendEmailVerification directamente desde Firebase Auth
    res.json({
      success: true,
      message: 'Usa el método sendEmailVerification del AuthRepository en el cliente'
    });
  } catch (error) {
    console.error('Error al enviar email de verificación:', error);
    res.status(400).json({
      success: false,
      error: 'No se pudo enviar el email de verificación',
      errorCode: 'SEND_VERIFICATION_ERROR'
    });
  }
};

/**
 * Verifica el email usando el código de acción
 */
export const verifyEmail = async (req, res) => {
  try {
    const { actionCode } = req.body;

    if (!actionCode) {
      return res.status(400).json({
        success: false,
        error: 'Código de acción requerido',
        errorCode: 'VALIDATION_ERROR'
      });
    }

    // Verificar el código de acción
    await applyActionCode(auth, actionCode);

    res.json({
      success: true,
      message: 'Email verificado correctamente'
    });
  } catch (error) {
    console.error('Error al verificar email:', error);
    const errorMessage = handleAuthError(error);
    res.status(400).json({
      success: false,
      error: errorMessage,
      errorCode: error.code || 'VERIFY_EMAIL_ERROR'
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
