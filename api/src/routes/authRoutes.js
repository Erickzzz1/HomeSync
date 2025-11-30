/**
 * Rutas de autenticación
 */

import express from 'express';
import {
  signUp,
  signIn,
  signOut,
  getCurrentUser
} from '../controllers/authController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Rutas públicas
router.post('/signup', signUp);
router.post('/signin', signIn);
router.post('/signout', signOut);

// Rutas protegidas
router.get('/me', verifyToken, getCurrentUser);

export default router;
