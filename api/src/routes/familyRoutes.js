/**
 * Rutas de gestión de familia
 */

import express from 'express';
import {
  getMyShareCode,
  getFamilyMembers,
  addFamilyMember,
  removeFamilyMember
} from '../controllers/familyController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.get('/share-code', verifyToken, getMyShareCode);
router.get('/members', verifyToken, getFamilyMembers);
router.post('/members', verifyToken, addFamilyMember);
router.delete('/members', verifyToken, removeFamilyMember);

export default router;

