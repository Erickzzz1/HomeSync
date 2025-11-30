/**
 * Middleware de autenticación
 * 
 * Verifica el token de Firebase en las peticiones
 * 
 * Nota: Para producción, se recomienda usar Firebase Admin SDK
 * con service account para verificación más robusta de tokens.
 */

import { auth } from '../config/firebase.js';

/**
 * Middleware para verificar el token de autenticación
 * 
 * En este caso, verificamos que el token esté presente y
 * lo decodificamos básicamente. Para una verificación más robusta,
 * se recomienda usar Firebase Admin SDK con service account.
 */
export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token de autenticación requerido',
        errorCode: 'UNAUTHORIZED'
      });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Verificar token con Firebase Auth
    // Usamos una verificación básica decodificando el JWT
    // Para producción, usar Firebase Admin SDK con service account
    try {
      // Decodificar el token JWT (sin verificar la firma en este caso)
      // En producción, usar adminAuth.verifyIdToken(token)
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Token inválido');
      }
      
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
      const decodedToken = JSON.parse(jsonPayload);
      
      // Verificar que el token no haya expirado
      if (decodedToken.exp && decodedToken.exp * 1000 < Date.now()) {
        return res.status(401).json({
          success: false,
          error: 'Token expirado',
          errorCode: 'TOKEN_EXPIRED'
        });
      }
      
      // Agregar información del usuario al request
      req.user = {
        uid: decodedToken.user_id || decodedToken.sub || decodedToken.uid,
        email: decodedToken.email,
        displayName: decodedToken.name || decodedToken.display_name
      };
      
      next();
    } catch (decodeError) {
      // console.error('Error al decodificar token:', decodeError);
      return res.status(401).json({
        success: false,
        error: 'Token inválido',
        errorCode: 'INVALID_TOKEN'
      });
    }
  } catch (error) {
    console.error('Error al verificar token:', error);
    return res.status(401).json({
      success: false,
      error: 'Token inválido o expirado',
      errorCode: 'INVALID_TOKEN'
    });
  }
};
