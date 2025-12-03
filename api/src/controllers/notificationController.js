/**
 * Controlador de notificaciones
 * 
 * Maneja el registro de tokens de notificación y el envío de notificaciones push
 */

import { firestore } from '../config/firebase.js';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { Expo } from 'expo-server-sdk';

// Crear cliente de Expo
const expo = new Expo();

/**
 * Registra o actualiza el token de notificación de un usuario
 */
export const registerNotificationToken = async (req, res) => {
  try {
    const { token, platform } = req.body;
    const userId = req.user.uid;

    if (!token || !token.trim()) {
      return res.status(400).json({
        success: false,
        error: 'El token de notificación es requerido',
        errorCode: 'VALIDATION_ERROR'
      });
    }

    // Verificar que el token es válido
    if (!Expo.isExpoPushToken(token)) {
      return res.status(400).json({
        success: false,
        error: 'Token de notificación inválido',
        errorCode: 'INVALID_TOKEN'
      });
    }

    // Obtener o crear documento del usuario
    const userDocRef = doc(firestore, 'users', userId);
    let userDoc = await getDoc(userDocRef);

    const updateData = {
      notificationToken: token,
      notificationPlatform: platform || 'unknown',
      notificationTokenUpdatedAt: new Date().toISOString()
    };

    if (userDoc.exists()) {
      // Actualizar documento existente
      await updateDoc(userDocRef, updateData);
    } else {
      // Crear documento si no existe
      await setDoc(userDocRef, {
        uid: userId,
        email: req.user.email || null,
        displayName: req.user.displayName || null,
        shareCode: null, // Se generará después si es necesario
        familyMembers: [],
        ...updateData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Token de notificación registrado correctamente'
    });
  } catch (error) {
    console.error('Error al registrar token de notificación:', error);
    res.status(500).json({
      success: false,
      error: 'Error al registrar el token de notificación',
      errorCode: 'REGISTER_TOKEN_ERROR'
    });
  }
};

/**
 * Envía una notificación push a un usuario
 * @param {string} userId - UID del usuario destinatario
 * @param {string} title - Título de la notificación
 * @param {string} body - Cuerpo de la notificación
 * @param {object} data - Datos adicionales para la notificación
 */
export async function sendNotificationToUser(userId, title, body, data = {}) {
  try {
    // Obtener token de notificación del usuario
    const userDocRef = doc(firestore, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      console.warn(`Usuario ${userId} no encontrado para enviar notificación`);
      return false;
    }

    const userData = userDoc.data();
    const notificationToken = userData.notificationToken;

    if (!notificationToken) {
      console.warn(`Usuario ${userId} no tiene token de notificación registrado`);
      return false;
    }

    // Verificar que el token es válido
    if (!Expo.isExpoPushToken(notificationToken)) {
      console.warn(`Token de notificación inválido para usuario ${userId}`);
      return false;
    }

    // Crear mensaje de notificación
    const message = {
      to: notificationToken,
      sound: 'default',
      title: title,
      body: body,
      data: data,
      priority: 'high',
      channelId: 'default'
    };

    // Enviar notificación
    const chunks = expo.chunkPushNotifications([message]);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error al enviar chunk de notificaciones:', error);
      }
    }

    // Verificar errores en los tickets
    for (const ticket of tickets) {
      if (ticket.status === 'error') {
        if (ticket.details && ticket.details.error) {
          console.error('Error en ticket de notificación:', ticket.details.error);
          // Si el token es inválido, podríamos eliminarlo del usuario
          if (ticket.details.error === 'DeviceNotRegistered') {
            // El token ya no es válido, eliminarlo
            await updateDoc(userDocRef, {
              notificationToken: null,
              notificationTokenUpdatedAt: new Date().toISOString()
            });
          }
        }
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error al enviar notificación:', error);
    return false;
  }
}

