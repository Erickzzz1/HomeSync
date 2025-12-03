/**
 * Rutas de notificaciones
 */

import express from 'express';
import { registerNotificationToken } from '../controllers/notificationController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Registrar token de notificación
router.post('/register', verifyToken, registerNotificationToken);

export default router;

