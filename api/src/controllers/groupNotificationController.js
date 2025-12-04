/**
 * Controlador de notificaciones de grupos familiares
 * 
 * Maneja las operaciones relacionadas con mensajes de notificación de grupos:
 * - Obtener notificaciones del usuario
 * - Marcar notificaciones como leídas
 * - Eliminar notificaciones
 */

import { collection, doc, getDoc, getDocs, query, where, updateDoc, deleteDoc, orderBy, limit } from 'firebase/firestore';
import { firestore } from '../config/firebase.js';

const COLLECTION_NAME = 'groupNotifications';

/**
 * Obtiene todas las notificaciones de grupos del usuario
 */
export const getMyGroupNotifications = async (req, res) => {
  try {
    const userId = req.user.uid;
    console.log('Obteniendo notificaciones para usuario:', userId);

    // Buscar notificaciones del usuario
    const notificationsRef = collection(firestore, COLLECTION_NAME);
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      limit(50) // Limitar a las últimas 50 notificaciones
    );
    const querySnapshot = await getDocs(q);

    console.log(`Total de documentos encontrados: ${querySnapshot.size}`);

    const notifications = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const notification = {
        id: doc.id,
        groupId: data.groupId,
        groupName: data.groupName,
        type: data.type,
        message: data.message,
        adminId: data.adminId,
        adminName: data.adminName,
        createdAt: data.createdAt,
        read: data.read || false
      };
      notifications.push(notification);
      console.log('Notificación encontrada:', {
        id: notification.id,
        type: notification.type,
        message: notification.message
      });
    });

    // Ordenar por fecha (más recientes primero) en memoria
    notifications.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

    console.log(`Total de notificaciones procesadas: ${notifications.length}`);

    res.json({
      success: true,
      notifications
    });
  } catch (error) {
    console.error('Error al obtener notificaciones de grupos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener las notificaciones',
      errorCode: 'GET_NOTIFICATIONS_ERROR'
    });
  }
};

/**
 * Marca una notificación como leída
 */
export const markNotificationAsRead = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { notificationId } = req.params;

    // Verificar que la notificación existe y pertenece al usuario
    const notificationDocRef = doc(collection(firestore, COLLECTION_NAME), notificationId);
    const notificationDoc = await getDoc(notificationDocRef);

    if (!notificationDoc.exists()) {
      return res.status(404).json({
        success: false,
        error: 'Notificación no encontrada',
        errorCode: 'NOTIFICATION_NOT_FOUND'
      });
    }

    const notificationData = notificationDoc.data();

    if (notificationData.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'No tienes acceso a esta notificación',
        errorCode: 'ACCESS_DENIED'
      });
    }

    // Marcar como leída
    await updateDoc(notificationDocRef, {
      read: true
    });

    res.json({
      success: true
    });
  } catch (error) {
    console.error('Error al marcar notificación como leída:', error);
    res.status(500).json({
      success: false,
      error: 'Error al marcar la notificación como leída',
      errorCode: 'MARK_READ_ERROR'
    });
  }
};

/**
 * Elimina una notificación
 */
export const deleteGroupNotification = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { notificationId } = req.params;

    // Verificar que la notificación existe y pertenece al usuario
    const notificationDocRef = doc(collection(firestore, COLLECTION_NAME), notificationId);
    const notificationDoc = await getDoc(notificationDocRef);

    if (!notificationDoc.exists()) {
      return res.status(404).json({
        success: false,
        error: 'Notificación no encontrada',
        errorCode: 'NOTIFICATION_NOT_FOUND'
      });
    }

    const notificationData = notificationDoc.data();

    if (notificationData.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'No tienes acceso a esta notificación',
        errorCode: 'ACCESS_DENIED'
      });
    }

    // Eliminar la notificación
    await deleteDoc(notificationDocRef);

    res.json({
      success: true
    });
  } catch (error) {
    console.error('Error al eliminar notificación:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar la notificación',
      errorCode: 'DELETE_NOTIFICATION_ERROR'
    });
  }
};

/**
 * Marca todas las notificaciones del usuario como leídas
 */
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.uid;

    // Buscar todas las notificaciones no leídas del usuario
    const notificationsRef = collection(firestore, COLLECTION_NAME);
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('read', '==', false)
    );
    const querySnapshot = await getDocs(q);

    // Actualizar todas como leídas
    const updatePromises = querySnapshot.docs.map(doc =>
      updateDoc(doc.ref, { read: true })
    );

    await Promise.all(updatePromises);

    res.json({
      success: true,
      count: querySnapshot.size
    });
  } catch (error) {
    console.error('Error al marcar todas las notificaciones como leídas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al marcar las notificaciones como leídas',
      errorCode: 'MARK_ALL_READ_ERROR'
    });
  }
};

