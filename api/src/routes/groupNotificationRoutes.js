/**
 * Rutas de notificaciones de grupos familiares
 */

import express from 'express';
import {
  getMyGroupNotifications,
  markNotificationAsRead,
  deleteGroupNotification,
  markAllNotificationsAsRead
} from '../controllers/groupNotificationController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.get('/', verifyToken, getMyGroupNotifications);
router.put('/:notificationId/read', verifyToken, markNotificationAsRead);
router.put('/read-all', verifyToken, markAllNotificationsAsRead);
router.delete('/:notificationId', verifyToken, deleteGroupNotification);

export default router;

