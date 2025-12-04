/**
 * Controlador de grupos familiares
 * 
 * Maneja las operaciones relacionadas con grupos familiares:
 * - Crear grupos familiares con nombre
 * - Obtener lista de grupos del usuario
 * - Obtener detalles de un grupo
 * - Agregar miembros a un grupo específico
 * - Eliminar miembros de un grupo
 * - Eliminar grupos
 */

import { collection, doc, getDoc, getDocs, query, where, updateDoc, setDoc, addDoc, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { firestore } from '../config/firebase.js';
import { sendNotificationToUser } from './notificationController.js';

const COLLECTION_NAME = 'familyGroups';

/**
 * Crea un nuevo grupo familiar
 */
export const createFamilyGroup = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'El nombre del grupo es requerido',
        errorCode: 'NAME_REQUIRED'
      });
    }

    if (name.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'El nombre del grupo debe tener al menos 3 caracteres',
        errorCode: 'NAME_TOO_SHORT'
      });
    }

    if (name.trim().length > 50) {
      return res.status(400).json({
        success: false,
        error: 'El nombre del grupo no puede exceder 50 caracteres',
        errorCode: 'NAME_TOO_LONG'
      });
    }

    // Generar shareCode único para el grupo (verificar en users y familyGroups)
    const { generateUniqueShareCode } = await import('../utils/shareCodeGenerator.js');
    const shareCode = await generateUniqueShareCode(firestore, 10, ['users', 'familyGroups']);

    // Crear el grupo
    const groupData = {
      name: name.trim(),
      shareCode: shareCode,
      members: [userId], // El creador es el primer miembro
      roles: { [userId]: 'admin' }, // El creador es admin
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const groupsCollection = collection(firestore, COLLECTION_NAME);
    const docRef = await addDoc(groupsCollection, groupData);

    // Obtener el grupo creado
    const groupDoc = await getDoc(docRef);
    const group = {
      id: docRef.id,
      ...groupDoc.data()
    };

    res.json({
      success: true,
      group
    });
  } catch (error) {
    console.error('Error al crear grupo familiar:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear el grupo familiar',
      errorCode: 'CREATE_GROUP_ERROR'
    });
  }
};

/**
 * Obtiene todos los grupos familiares del usuario
 */
export const getMyFamilyGroups = async (req, res) => {
  try {
    const userId = req.user?.uid;

    if (!userId) {
      console.error('getMyFamilyGroups: Usuario no autenticado');
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado',
        errorCode: 'UNAUTHORIZED'
      });
    }

    console.log(`getMyFamilyGroups: Buscando grupos para usuario ${userId}`);

    // Buscar grupos donde el usuario es miembro
    const groupsCollection = collection(firestore, COLLECTION_NAME);
    const q = query(groupsCollection, where('members', 'array-contains', userId));
    
    console.log('getMyFamilyGroups: Ejecutando query...');
    const querySnapshot = await getDocs(q);
    console.log(`getMyFamilyGroups: Query completada, ${querySnapshot.size} grupos encontrados`);

    const groups = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      groups.push({
        id: doc.id,
        name: data.name,
        shareCode: data.shareCode,
        membersCount: data.members?.length || 0,
        createdBy: data.createdBy,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      });
    });

    // Ordenar por fecha de actualización (más recientes primero)
    groups.sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    res.json({
      success: true,
      groups
    });
  } catch (error) {
    console.error('Error al obtener grupos familiares:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Error al obtener los grupos familiares',
      errorCode: 'GET_GROUPS_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obtiene los detalles de un grupo familiar específico
 */
export const getFamilyGroup = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { groupId } = req.params;

    const groupDocRef = doc(collection(firestore, COLLECTION_NAME), groupId);
    const groupDoc = await getDoc(groupDocRef);

    if (!groupDoc.exists()) {
      return res.status(404).json({
        success: false,
        error: 'Grupo familiar no encontrado',
        errorCode: 'GROUP_NOT_FOUND'
      });
    }

    const groupData = groupDoc.data();

    // Verificar que el usuario es miembro del grupo
    if (!groupData.members || !groupData.members.includes(userId)) {
      return res.status(403).json({
        success: false,
        error: 'No tienes acceso a este grupo',
        errorCode: 'ACCESS_DENIED'
      });
    }

    // Obtener información de cada miembro
    const members = [];
    const familyRoles = groupData.roles || {};

    for (const memberId of groupData.members) {
      try {
        const memberDocRef = doc(collection(firestore, 'users'), memberId);
        const memberDoc = await getDoc(memberDocRef);

        if (memberDoc.exists()) {
          const memberData = memberDoc.data();
          const memberRole = familyRoles[memberId] || 'member';

          members.push({
            uid: memberData.uid,
            email: memberData.email,
            displayName: memberData.displayName || 'Sin nombre',
            shareCode: memberData.shareCode,
            role: memberRole
          });
        }
      } catch (memberError) {
        console.error(`Error al obtener información del miembro ${memberId}:`, memberError);
      }
    }

    const group = {
      id: groupDoc.id,
      name: groupData.name,
      shareCode: groupData.shareCode,
      members,
      roles: familyRoles,
      createdBy: groupData.createdBy,
      createdAt: groupData.createdAt,
      updatedAt: groupData.updatedAt
    };

    res.json({
      success: true,
      group
    });
  } catch (error) {
    console.error('Error al obtener grupo familiar:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener el grupo familiar',
      errorCode: 'GET_GROUP_ERROR'
    });
  }
};

/**
 * Agrega un miembro a un grupo familiar usando su shareCode
 */
export const addGroupMember = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { groupId } = req.params;
    const { shareCode } = req.body;

    if (!shareCode || typeof shareCode !== 'string' || shareCode.length !== 6) {
      return res.status(400).json({
        success: false,
        error: 'El código de compartir debe tener 6 caracteres',
        errorCode: 'INVALID_SHARE_CODE'
      });
    }

    // Verificar que el grupo existe y el usuario es miembro
    const groupDocRef = doc(collection(firestore, COLLECTION_NAME), groupId);
    const groupDoc = await getDoc(groupDocRef);

    if (!groupDoc.exists()) {
      return res.status(404).json({
        success: false,
        error: 'Grupo familiar no encontrado',
        errorCode: 'GROUP_NOT_FOUND'
      });
    }

    const groupData = groupDoc.data();

    if (!groupData.members || !groupData.members.includes(userId)) {
      return res.status(403).json({
        success: false,
        error: 'No tienes acceso a este grupo',
        errorCode: 'ACCESS_DENIED'
      });
    }

    // Buscar usuario con ese shareCode
    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, where('shareCode', '==', shareCode.toUpperCase()));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return res.status(404).json({
        success: false,
        error: 'Código de compartir inválido',
        errorCode: 'SHARE_CODE_NOT_FOUND'
      });
    }

    // Obtener el usuario encontrado
    const foundUserQueryDoc = querySnapshot.docs[0];
    const foundUserId = foundUserQueryDoc.id;
    const foundUserData = foundUserQueryDoc.data();

    // Validaciones
    if (foundUserId === userId) {
      return res.status(400).json({
        success: false,
        error: 'No puedes agregarte a ti mismo',
        errorCode: 'CANNOT_ADD_SELF'
      });
    }

    if (groupData.members.includes(foundUserId)) {
      return res.status(400).json({
        success: false,
        error: 'Este usuario ya está en el grupo',
        errorCode: 'MEMBER_ALREADY_EXISTS',
        message: 'El usuario con este código ya forma parte del grupo'
      });
    }

    // Obtener roles actuales
    const groupRoles = groupData.roles || {};

    // Obtener información del usuario que agrega
    const addingUserDocRef = doc(collection(firestore, 'users'), userId);
    const addingUserDoc = await getDoc(addingUserDocRef);
    const addingUserName = addingUserDoc.exists() 
      ? (addingUserDoc.data().displayName || addingUserDoc.data().email || 'Un usuario')
      : 'Un usuario';

    console.log('Agregando miembro al grupo:', {
      userId: userId,
      foundUserId: foundUserId,
      groupId: groupId,
      groupName: groupData.name,
      addingUserName: addingUserName
    });

    // El nuevo miembro será 'member' por defecto
    groupRoles[foundUserId] = 'member';

    // Agregar el miembro al grupo
    await updateDoc(groupDocRef, {
      members: arrayUnion(foundUserId),
      roles: groupRoles,
      updatedAt: new Date().toISOString()
    });

    console.log('Miembro agregado al grupo exitosamente');

    // Crear mensaje de notificación para el usuario agregado
    const groupNotificationRef = collection(firestore, 'groupNotifications');
    const notificationData = {
      userId: foundUserId,
      groupId: groupId,
      groupName: groupData.name,
      type: 'member_added',
      message: `${addingUserName} te ha agregado al grupo "${groupData.name}"`,
      adminId: userId,
      adminName: addingUserName,
      createdAt: new Date().toISOString(),
      read: false
    };
    
    console.log('Intentando crear notificación con datos:', notificationData);
    const notificationDocRef = await addDoc(groupNotificationRef, notificationData);
    console.log('Notificación de grupo creada exitosamente (member_added):', {
      id: notificationDocRef.id,
      data: notificationData
    });

    // Enviar notificación push al usuario agregado
    try {
      await sendNotificationToUser(
        foundUserId,
        'Fuiste agregado a un grupo',
        `${addingUserName} te ha agregado al grupo "${groupData.name}"`,
        {
          type: 'group_member_added',
          groupId: groupId,
          groupName: groupData.name,
          adminId: userId
        }
      );
    } catch (pushError) {
      console.error('Error al enviar notificación push (no crítico):', pushError);
      // No fallar toda la operación si la notificación push falla
    }

    res.json({
      success: true,
      member: {
        uid: foundUserData.uid,
        email: foundUserData.email,
        displayName: foundUserData.displayName || 'Sin nombre',
        shareCode: foundUserData.shareCode,
        role: 'member'
      }
    });
  } catch (error) {
    console.error('Error al agregar miembro al grupo:', error);
    res.status(500).json({
      success: false,
      error: 'Error al agregar el miembro al grupo',
      errorCode: 'ADD_GROUP_MEMBER_ERROR'
    });
  }
};

/**
 * Elimina un miembro de un grupo familiar
 */
export const removeGroupMember = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { groupId } = req.params;
    const { memberId } = req.body;

    if (!memberId) {
      return res.status(400).json({
        success: false,
        error: 'ID del miembro es requerido',
        errorCode: 'MEMBER_ID_REQUIRED'
      });
    }

    // Verificar que el grupo existe y el usuario es miembro
    const groupDocRef = doc(collection(firestore, COLLECTION_NAME), groupId);
    const groupDoc = await getDoc(groupDocRef);

    if (!groupDoc.exists()) {
      return res.status(404).json({
        success: false,
        error: 'Grupo familiar no encontrado',
        errorCode: 'GROUP_NOT_FOUND'
      });
    }

    const groupData = groupDoc.data();

    if (!groupData.members || !groupData.members.includes(userId)) {
      return res.status(403).json({
        success: false,
        error: 'No tienes acceso a este grupo',
        errorCode: 'ACCESS_DENIED'
      });
    }

    // Verificar que el usuario actual es admin
    const groupRoles = groupData.roles || {};
    const currentUserRole = groupRoles[userId] || 'member';

    if (currentUserRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Solo los administradores pueden eliminar miembros',
        errorCode: 'PERMISSION_DENIED'
      });
    }

    // Verificar que el miembro está en el grupo
    if (!groupData.members.includes(memberId)) {
      return res.status(400).json({
        success: false,
        error: 'Este usuario no está en el grupo',
        errorCode: 'MEMBER_NOT_FOUND'
      });
    }

    // Obtener información del admin que elimina y del grupo antes de eliminar
    const adminUserDocRef = doc(collection(firestore, 'users'), userId);
    const adminUserDoc = await getDoc(adminUserDocRef);
    const adminName = adminUserDoc.exists() 
      ? (adminUserDoc.data().displayName || adminUserDoc.data().email || 'Un administrador')
      : 'Un administrador';

    // Remover el rol del miembro eliminado
    delete groupRoles[memberId];

    // Remover el miembro del grupo
    await updateDoc(groupDocRef, {
      members: arrayRemove(memberId),
      roles: groupRoles,
      updatedAt: new Date().toISOString()
    });

    // Crear mensaje de notificación para el usuario eliminado
    const groupNotificationRef = collection(firestore, 'groupNotifications');
    await addDoc(groupNotificationRef, {
      userId: memberId,
      groupId: groupId,
      groupName: groupData.name,
      type: 'member_removed',
      message: `${adminName} te ha eliminado del grupo "${groupData.name}"`,
      adminId: userId,
      adminName: adminName,
      createdAt: new Date().toISOString(),
      read: false
    });

    // Enviar notificación push al usuario eliminado
    await sendNotificationToUser(
      memberId,
      'Fuiste eliminado del grupo',
      `${adminName} te ha eliminado del grupo "${groupData.name}"`,
      {
        type: 'group_member_removed',
        groupId: groupId,
        groupName: groupData.name,
        adminId: userId
      }
    );

    res.json({
      success: true
    });
  } catch (error) {
    console.error('Error al eliminar miembro del grupo:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar el miembro del grupo',
      errorCode: 'REMOVE_GROUP_MEMBER_ERROR'
    });
  }
};

/**
 * Actualiza el rol de un miembro en un grupo (solo admins)
 */
export const updateGroupMemberRole = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { groupId } = req.params;
    const { memberId, role } = req.body;

    if (!memberId || !role) {
      return res.status(400).json({
        success: false,
        error: 'ID del miembro y rol son requeridos',
        errorCode: 'MEMBER_ID_AND_ROLE_REQUIRED'
      });
    }

    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'El rol debe ser "admin" o "member"',
        errorCode: 'INVALID_ROLE'
      });
    }

    // Verificar que el grupo existe y el usuario es miembro
    const groupDocRef = doc(collection(firestore, COLLECTION_NAME), groupId);
    const groupDoc = await getDoc(groupDocRef);

    if (!groupDoc.exists()) {
      return res.status(404).json({
        success: false,
        error: 'Grupo familiar no encontrado',
        errorCode: 'GROUP_NOT_FOUND'
      });
    }

    const groupData = groupDoc.data();

    if (!groupData.members || !groupData.members.includes(userId)) {
      return res.status(403).json({
        success: false,
        error: 'No tienes acceso a este grupo',
        errorCode: 'ACCESS_DENIED'
      });
    }

    // Verificar que el usuario actual es admin
    const groupRoles = groupData.roles || {};
    const currentUserRole = groupRoles[userId] || 'member';

    if (currentUserRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Solo los administradores pueden cambiar roles',
        errorCode: 'PERMISSION_DENIED'
      });
    }

    // Verificar que el miembro existe en el grupo
    if (!groupData.members.includes(memberId)) {
      return res.status(400).json({
        success: false,
        error: 'Este usuario no está en el grupo',
        errorCode: 'MEMBER_NOT_FOUND'
      });
    }

    // Actualizar el rol
    groupRoles[memberId] = role;

    await updateDoc(groupDocRef, {
      roles: groupRoles,
      updatedAt: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Rol actualizado correctamente'
    });
  } catch (error) {
    console.error('Error al actualizar rol en grupo:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el rol',
      errorCode: 'UPDATE_GROUP_ROLE_ERROR'
    });
  }
};

/**
 * Elimina un grupo familiar (solo el creador o un admin)
 */
export const deleteFamilyGroup = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { groupId } = req.params;

    // Verificar que el grupo existe
    const groupDocRef = doc(collection(firestore, COLLECTION_NAME), groupId);
    const groupDoc = await getDoc(groupDocRef);

    if (!groupDoc.exists()) {
      return res.status(404).json({
        success: false,
        error: 'Grupo familiar no encontrado',
        errorCode: 'GROUP_NOT_FOUND'
      });
    }

    const groupData = groupDoc.data();

    // Verificar que el usuario es el creador o un admin
    const groupRoles = groupData.roles || {};
    const currentUserRole = groupRoles[userId] || 'member';
    const isCreator = groupData.createdBy === userId;
    const isAdmin = currentUserRole === 'admin';

    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Solo el creador o un administrador pueden eliminar el grupo',
        errorCode: 'PERMISSION_DENIED'
      });
    }

    // Obtener información del usuario que elimina
    const adminUserDocRef = doc(collection(firestore, 'users'), userId);
    const adminUserDoc = await getDoc(adminUserDocRef);
    const adminName = adminUserDoc.exists() 
      ? (adminUserDoc.data().displayName || adminUserDoc.data().email || 'Un administrador')
      : 'Un administrador';

    // Obtener todos los miembros del grupo (excepto el que elimina)
    const membersToNotify = groupData.members.filter(memberId => memberId !== userId);

    // Crear mensajes de notificación para todos los miembros
    const groupNotificationRef = collection(firestore, 'groupNotifications');
    const notificationPromises = membersToNotify.map(memberId => 
      addDoc(groupNotificationRef, {
        userId: memberId,
        groupId: groupId,
        groupName: groupData.name,
        type: 'group_deleted',
        message: `${adminName} ha eliminado el grupo "${groupData.name}"`,
        adminId: userId,
        adminName: adminName,
        createdAt: new Date().toISOString(),
        read: false
      })
    );

    // Enviar notificaciones push a todos los miembros
    const pushNotificationPromises = membersToNotify.map(memberId =>
      sendNotificationToUser(
        memberId,
        'Grupo eliminado',
        `${adminName} ha eliminado el grupo "${groupData.name}"`,
        {
          type: 'group_deleted',
          groupId: groupId,
          groupName: groupData.name,
          adminId: userId
        }
      )
    );

    // Esperar a que se creen los mensajes y se envíen las notificaciones
    await Promise.all([...notificationPromises, ...pushNotificationPromises]);

    // Eliminar el grupo
    await deleteDoc(groupDocRef);

    res.json({
      success: true,
      message: 'Grupo eliminado correctamente'
    });
  } catch (error) {
    console.error('Error al eliminar grupo familiar:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar el grupo familiar',
      errorCode: 'DELETE_GROUP_ERROR'
    });
  }
};

/**
 * Permite a un usuario unirse a un grupo familiar usando el código del grupo
 */
export const joinFamilyGroupByCode = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { shareCode } = req.body;

    console.log('Intentando unirse a grupo con código:', shareCode, 'Usuario:', userId);

    if (!shareCode || typeof shareCode !== 'string' || shareCode.length !== 6) {
      return res.status(400).json({
        success: false,
        error: 'El código del grupo debe tener 6 caracteres',
        errorCode: 'INVALID_SHARE_CODE'
      });
    }

    // Buscar grupo con ese shareCode
    const groupsRef = collection(firestore, COLLECTION_NAME);
    const q = query(groupsRef, where('shareCode', '==', shareCode.toUpperCase()));
    
    console.log('Buscando grupo con shareCode:', shareCode.toUpperCase());
    const querySnapshot = await getDocs(q);
    console.log('Resultados de búsqueda:', querySnapshot.size);

    if (querySnapshot.empty) {
      return res.status(404).json({
        success: false,
        error: 'Código de grupo inválido',
        errorCode: 'GROUP_SHARE_CODE_NOT_FOUND'
      });
    }

    // Obtener el grupo encontrado
    const groupDoc = querySnapshot.docs[0];
    const groupId = groupDoc.id;
    const groupData = groupDoc.data();

    // Verificar que el usuario no esté ya en el grupo
    if (groupData.members && groupData.members.includes(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Ya eres miembro de este grupo',
        errorCode: 'ALREADY_A_MEMBER'
      });
    }

    // Obtener información del usuario que se une
    const joiningUserDocRef = doc(collection(firestore, 'users'), userId);
    const joiningUserDoc = await getDoc(joiningUserDocRef);
    const joiningUserName = joiningUserDoc.exists() 
      ? (joiningUserDoc.data().displayName || joiningUserDoc.data().email || 'Un usuario')
      : 'Un usuario';

    // Obtener roles actuales
    const groupRoles = groupData.roles || {};

    // El nuevo miembro será 'member' por defecto
    groupRoles[userId] = 'member';

    // Agregar el miembro al grupo
    const groupDocRef = doc(collection(firestore, COLLECTION_NAME), groupId);
    console.log('Actualizando grupo con nuevo miembro:', {
      groupId,
      userId,
      currentMembers: groupData.members?.length || 0
    });
    
    try {
      await updateDoc(groupDocRef, {
        members: arrayUnion(userId),
        roles: groupRoles,
        updatedAt: new Date().toISOString()
      });
      console.log('Grupo actualizado exitosamente');
    } catch (updateError) {
      console.error('Error al actualizar el grupo:', updateError);
      console.error('Detalles del error:', {
        message: updateError.message,
        code: updateError.code,
        stack: updateError.stack
      });
      throw updateError; // Re-lanzar el error para que se capture en el catch principal
    }

    // Obtener todos los miembros del grupo (excepto el que se une)
    const membersToNotify = groupData.members || [];

    // Crear mensajes de notificación para todos los miembros existentes
    const groupNotificationRef = collection(firestore, 'groupNotifications');
    const notificationPromises = membersToNotify.map(memberId => 
      addDoc(groupNotificationRef, {
        userId: memberId,
        groupId: groupId,
        groupName: groupData.name,
        type: 'member_added',
        message: `${joiningUserName} se ha unido al grupo "${groupData.name}"`,
        adminId: userId,
        adminName: joiningUserName,
        createdAt: new Date().toISOString(),
        read: false
      })
    );

    // Enviar notificaciones push a todos los miembros existentes
    const pushNotificationPromises = membersToNotify.map(memberId =>
      sendNotificationToUser(
        memberId,
        'Nuevo miembro en el grupo',
        `${joiningUserName} se ha unido al grupo "${groupData.name}"`,
        {
          type: 'group_member_added',
          groupId: groupId,
          groupName: groupData.name,
          adminId: userId
        }
      ).catch(err => {
        console.error(`Error al enviar notificación push a ${memberId}:`, err);
        return null; // No fallar toda la operación si una notificación falla
      })
    );

    // Esperar a que se creen los mensajes y se envíen las notificaciones
    // Usar Promise.allSettled para que no falle si alguna notificación falla
    try {
      await Promise.all(notificationPromises);
      await Promise.all(pushNotificationPromises);
    } catch (notificationError) {
      console.error('Error al crear/enviar notificaciones (no crítico):', notificationError);
      // No fallar toda la operación si las notificaciones fallan
    }

    res.json({
      success: true,
      group: {
        id: groupId,
        name: groupData.name,
        shareCode: groupData.shareCode
      },
      message: `Te has unido al grupo "${groupData.name}" correctamente`
    });
  } catch (error) {
    console.error('Error al unirse al grupo:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Error al unirse al grupo: ' + (error.message || 'Error desconocido'),
      errorCode: 'JOIN_GROUP_ERROR'
    });
  }
};

/**
 * Permite a un usuario salir de un grupo familiar
 */
export const leaveFamilyGroup = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { groupId } = req.params;

    // Verificar que el grupo existe
    const groupDocRef = doc(collection(firestore, COLLECTION_NAME), groupId);
    const groupDoc = await getDoc(groupDocRef);

    if (!groupDoc.exists()) {
      return res.status(404).json({
        success: false,
        error: 'Grupo familiar no encontrado',
        errorCode: 'GROUP_NOT_FOUND'
      });
    }

    const groupData = groupDoc.data();

    // Verificar que el usuario es miembro del grupo
    if (!groupData.members || !groupData.members.includes(userId)) {
      return res.status(400).json({
        success: false,
        error: 'No eres miembro de este grupo',
        errorCode: 'NOT_A_MEMBER'
      });
    }

    // Obtener información del usuario que abandona
    const leavingUserDocRef = doc(collection(firestore, 'users'), userId);
    const leavingUserDoc = await getDoc(leavingUserDocRef);
    const leavingUserName = leavingUserDoc.exists() 
      ? (leavingUserDoc.data().displayName || leavingUserDoc.data().email || 'Un usuario')
      : 'Un usuario';

    // Obtener roles actuales
    const groupRoles = groupData.roles || {};
    const currentUserRole = groupRoles[userId] || 'member';
    const isAdmin = currentUserRole === 'admin';

    // Si el usuario es admin, verificar si hay otros admins
    let newAdminAssigned = false;
    let newAdminId = null;
    let newAdminName = null;

    if (isAdmin) {
      // Contar cuántos admins hay (excluyendo al que se va)
      const adminCount = Object.entries(groupRoles).filter(
        ([memberId, role]) => role === 'admin' && memberId !== userId
      ).length;

      // Si no hay otros admins, asignar uno al azar
      if (adminCount === 0) {
        const remainingMembers = groupData.members.filter(memberId => memberId !== userId);
        
        if (remainingMembers.length > 0) {
          // Seleccionar un miembro al azar
          const randomIndex = Math.floor(Math.random() * remainingMembers.length);
          newAdminId = remainingMembers[randomIndex];
          groupRoles[newAdminId] = 'admin';
          newAdminAssigned = true;

          // Obtener nombre del nuevo admin
          const newAdminDocRef = doc(collection(firestore, 'users'), newAdminId);
          const newAdminDoc = await getDoc(newAdminDocRef);
          newAdminName = newAdminDoc.exists() 
            ? (newAdminDoc.data().displayName || newAdminDoc.data().email || 'Un usuario')
            : 'Un usuario';

          console.log(`Admin asignado automáticamente: ${newAdminId} (${newAdminName})`);
        }
      }
    }

    // Remover el rol del usuario que abandona
    delete groupRoles[userId];

    // Remover el miembro del grupo
    await updateDoc(groupDocRef, {
      members: arrayRemove(userId),
      roles: groupRoles,
      updatedAt: new Date().toISOString()
    });

    // Obtener todos los miembros restantes (excepto el que abandona)
    const membersToNotify = groupData.members.filter(memberId => memberId !== userId);

    // Crear mensajes de notificación para todos los miembros restantes
    const groupNotificationRef = collection(firestore, 'groupNotifications');
    const notificationPromises = membersToNotify.map(memberId => 
      addDoc(groupNotificationRef, {
        userId: memberId,
        groupId: groupId,
        groupName: groupData.name,
        type: 'member_left',
        message: `${leavingUserName} ha abandonado el grupo "${groupData.name}"`,
        adminId: userId,
        adminName: leavingUserName,
        createdAt: new Date().toISOString(),
        read: false
      })
    );

    // Si se asignó un nuevo admin, crear notificación especial para ese usuario
    if (newAdminAssigned && newAdminId) {
      notificationPromises.push(
        addDoc(groupNotificationRef, {
          userId: newAdminId,
          groupId: groupId,
          groupName: groupData.name,
          type: 'admin_assigned',
          message: `Has sido asignado como administrador del grupo "${groupData.name}" porque el administrador anterior abandonó el grupo`,
          adminId: userId,
          adminName: 'Sistema',
          createdAt: new Date().toISOString(),
          read: false
        })
      );
    }

    // Enviar notificaciones push a todos los miembros restantes
    const pushNotificationPromises = membersToNotify.map(memberId =>
      sendNotificationToUser(
        memberId,
        'Miembro abandonó el grupo',
        `${leavingUserName} ha abandonado el grupo "${groupData.name}"`,
        {
          type: 'group_member_left',
          groupId: groupId,
          groupName: groupData.name,
          memberId: userId
        }
      )
    );

    // Si se asignó un nuevo admin, enviar notificación push especial
    if (newAdminAssigned && newAdminId) {
      pushNotificationPromises.push(
        sendNotificationToUser(
          newAdminId,
          'Eres el nuevo administrador',
          `Has sido asignado como administrador del grupo "${groupData.name}"`,
          {
            type: 'group_admin_assigned',
            groupId: groupId,
            groupName: groupData.name
          }
        )
      );
    }

    // Esperar a que se creen los mensajes y se envíen las notificaciones
    await Promise.all([...notificationPromises, ...pushNotificationPromises]);

    res.json({
      success: true,
      message: 'Has abandonado el grupo correctamente',
      newAdminAssigned: newAdminAssigned,
      newAdminId: newAdminId
    });
  } catch (error) {
    console.error('Error al abandonar grupo familiar:', error);
    res.status(500).json({
      success: false,
      error: 'Error al abandonar el grupo familiar',
      errorCode: 'LEAVE_GROUP_ERROR'
    });
  }
};

