/**
 * Rutas de grupos familiares
 */

import express from 'express';
import {
  createFamilyGroup,
  getMyFamilyGroups,
  getFamilyGroup,
  addGroupMember,
  removeGroupMember,
  updateGroupMemberRole,
  deleteFamilyGroup,
  leaveFamilyGroup
} from '../controllers/familyGroupController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Todas las rutas requieren autenticación
// Rutas más específicas primero
router.post('/', verifyToken, createFamilyGroup);
router.get('/', verifyToken, getMyFamilyGroups);
router.post('/:groupId/members', verifyToken, addGroupMember);
router.delete('/:groupId/members', verifyToken, removeGroupMember);
router.put('/:groupId/members/role', verifyToken, updateGroupMemberRole);
router.post('/:groupId/leave', verifyToken, leaveFamilyGroup);
// Rutas más generales al final
router.get('/:groupId', verifyToken, getFamilyGroup);
router.delete('/:groupId', verifyToken, deleteFamilyGroup);

export default router;

