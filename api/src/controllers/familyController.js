/**
 * Controlador de gestión de familia
 * 
 * Maneja las operaciones relacionadas con familiares:
 * - Obtener shareCode del usuario
 * - Agregar miembros a la familia
 * - Obtener lista de familiares
 */

import { collection, doc, getDoc, getDocs, query, where, updateDoc, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { firestore } from '../config/firebase.js';

/**
 * Obtiene el shareCode del usuario actual
 */
export const getMyShareCode = async (req, res) => {
  try {
    const userId = req.user.uid;
    console.log('Obteniendo shareCode para usuario:', userId);
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'ID de usuario no proporcionado',
        errorCode: 'USER_ID_REQUIRED'
      });
    }

    const userDocRef = doc(collection(firestore, 'users'), userId);
    let userDoc = await getDoc(userDocRef);

    // Si el documento no existe, crearlo automáticamente
    if (!userDoc.exists()) {
      console.log('Documento no existe, creando...');
      try {
        const { generateUniqueShareCode } = await import('../utils/shareCodeGenerator.js');
        const shareCode = await generateUniqueShareCode(firestore);
        console.log('ShareCode generado:', shareCode);
        
        await setDoc(userDocRef, {
          uid: userId,
          email: req.user.email || null,
          displayName: req.user.displayName || null,
          shareCode: shareCode,
          familyMembers: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        
        console.log('Documento creado exitosamente');
        // Recargar el documento
        userDoc = await getDoc(userDocRef);
      } catch (createError) {
        console.error('Error al crear documento de usuario:', createError);
        console.error('Detalles del error:', {
          message: createError.message,
          code: createError.code,
          stack: createError.stack
        });
        return res.status(500).json({
          success: false,
          error: 'Error al crear el perfil de usuario: ' + createError.message,
          errorCode: 'CREATE_USER_PROFILE_ERROR'
        });
      }
    }

    const userData = userDoc.data();
    console.log('Datos del usuario:', userData);
    let shareCode = userData?.shareCode;

    if (!shareCode) {
      // Si no tiene shareCode, generarlo y actualizarlo
      console.log('Usuario no tiene shareCode, generando...');
      try {
        const { generateUniqueShareCode } = await import('../utils/shareCodeGenerator.js');
        shareCode = await generateUniqueShareCode(firestore);
        console.log('Nuevo shareCode generado:', shareCode);
        
        await setDoc(userDocRef, {
          ...userData,
          shareCode: shareCode,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        
        console.log('ShareCode actualizado en documento');
      } catch (updateError) {
        console.error('Error al generar shareCode:', updateError);
        console.error('Detalles del error:', {
          message: updateError.message,
          code: updateError.code,
          stack: updateError.stack
        });
        return res.status(500).json({
          success: false,
          error: 'Error al generar el código de compartir: ' + updateError.message,
          errorCode: 'GENERATE_SHARE_CODE_ERROR'
        });
      }
    }

    console.log('Devolviendo shareCode:', shareCode);
    res.json({
      success: true,
      shareCode
    });
  } catch (error) {
    console.error('Error al obtener shareCode:', error);
    console.error('Detalles completos del error:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      userId: req.user?.uid
    });
    res.status(500).json({
      success: false,
      error: 'Error al obtener el código de compartir: ' + (error.message || 'Error desconocido'),
      errorCode: 'GET_SHARE_CODE_ERROR'
    });
  }
};

/**
 * Obtiene la lista de familiares del usuario
 */
export const getFamilyMembers = async (req, res) => {
  try {
    const userId = req.user.uid;
    console.log('Obteniendo familiares para usuario:', userId);
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'ID de usuario no proporcionado',
        errorCode: 'USER_ID_REQUIRED'
      });
    }

    const userDocRef = doc(collection(firestore, 'users'), userId);
    let userDoc = await getDoc(userDocRef);

    // Si el documento no existe, crearlo automáticamente
    if (!userDoc.exists()) {
      console.log('Documento no existe, creando...');
      try {
        const { generateUniqueShareCode } = await import('../utils/shareCodeGenerator.js');
        const shareCode = await generateUniqueShareCode(firestore);
        console.log('ShareCode generado:', shareCode);
        
        await setDoc(userDocRef, {
          uid: userId,
          email: req.user.email || null,
          displayName: req.user.displayName || null,
          shareCode: shareCode,
          familyMembers: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        
        console.log('Documento creado exitosamente');
        // Recargar el documento
        userDoc = await getDoc(userDocRef);
      } catch (createError) {
        console.error('Error al crear documento de usuario:', createError);
        console.error('Detalles del error:', {
          message: createError.message,
          code: createError.code,
          stack: createError.stack
        });
        return res.status(500).json({
          success: false,
          error: 'Error al crear el perfil de usuario: ' + createError.message,
          errorCode: 'CREATE_USER_PROFILE_ERROR'
        });
      }
    }

    const userData = userDoc.data();
    console.log('=== GET FAMILY MEMBERS ===');
    console.log('Usuario ID:', userId);
    console.log('Datos del usuario:', JSON.stringify(userData, null, 2));
    const familyMemberIds = userData?.familyMembers || [];
    console.log('IDs de familiares en el documento:', familyMemberIds);
    console.log('Cantidad de IDs:', familyMemberIds.length);

    if (familyMemberIds.length === 0) {
      console.log('No hay familiares, devolviendo lista vacía');
      return res.json({
        success: true,
        familyMembers: []
      });
    }

    // Obtener información de cada familiar
    const familyMembers = [];
    for (const memberId of familyMemberIds) {
      try {
        console.log(`Obteniendo información del miembro: ${memberId}`);
        const memberDocRef = doc(collection(firestore, 'users'), memberId);
        const memberDoc = await getDoc(memberDocRef);
        
        if (memberDoc.exists()) {
          const memberData = memberDoc.data();
          console.log(`Datos del miembro ${memberId}:`, {
            uid: memberData.uid,
            email: memberData.email,
            displayName: memberData.displayName
          });
          familyMembers.push({
            uid: memberData.uid,
            email: memberData.email,
            displayName: memberData.displayName || 'Sin nombre',
            shareCode: memberData.shareCode
          });
        } else {
          console.warn(`El documento del miembro ${memberId} no existe`);
        }
      } catch (memberError) {
        console.error(`Error al obtener información del miembro ${memberId}:`, memberError);
        // Continuar con los otros miembros
      }
    }

    console.log('Total de familiares encontrados:', familyMembers.length);
    console.log('Lista final de familiares:', familyMembers.map(m => ({ uid: m.uid, name: m.displayName })));
    res.json({
      success: true,
      familyMembers
    });
  } catch (error) {
    console.error('Error al obtener familiares:', error);
    console.error('Detalles completos del error:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      userId: req.user?.uid
    });
    res.status(500).json({
      success: false,
      error: 'Error al obtener los familiares: ' + (error.message || 'Error desconocido'),
      errorCode: 'GET_FAMILY_MEMBERS_ERROR'
    });
  }
};

/**
 * Agrega un miembro a la familia usando su shareCode
 */
export const addFamilyMember = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { shareCode } = req.body;

    // Validación
    if (!shareCode || typeof shareCode !== 'string' || shareCode.length !== 6) {
      return res.status(400).json({
        success: false,
        error: 'El código de compartir debe tener 6 caracteres',
        errorCode: 'INVALID_SHARE_CODE'
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

    // Verificar si ya está en la lista
    const userDocRef = doc(collection(firestore, 'users'), userId);
    let userDoc = await getDoc(userDocRef);

    // Si el documento no existe, crearlo automáticamente
    if (!userDoc.exists()) {
      try {
        const { generateUniqueShareCode } = await import('../utils/shareCodeGenerator.js');
        const shareCode = await generateUniqueShareCode(firestore);
        
        await setDoc(userDocRef, {
          uid: userId,
          email: req.user.email || null,
          displayName: req.user.displayName || null,
          shareCode: shareCode,
          familyMembers: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        
        // Recargar el documento
        userDoc = await getDoc(userDocRef);
      } catch (createError) {
        console.error('Error al crear documento de usuario:', createError);
        return res.status(500).json({
          success: false,
          error: 'Error al crear el perfil de usuario',
          errorCode: 'CREATE_USER_PROFILE_ERROR'
        });
      }
    }

    const userData = userDoc.data();
    const userFamilyMembers = userData.familyMembers || [];

    if (userFamilyMembers.includes(foundUserId)) {
      return res.status(400).json({
        success: false,
        error: 'Este usuario ya está en tu lista de familia',
        errorCode: 'MEMBER_ALREADY_EXISTS'
      });
    }

    // Obtener la lista de familiares del usuario encontrado
    const foundUserDocRef = doc(collection(firestore, 'users'), foundUserId);
    const foundUserDoc = await getDoc(foundUserDocRef);
    
    if (!foundUserDoc.exists()) {
      return res.status(404).json({
        success: false,
        error: 'Usuario encontrado no tiene perfil completo',
        errorCode: 'FOUND_USER_INCOMPLETE'
      });
    }

    const foundUserFamilyMembers = foundUserDoc.data().familyMembers || [];

    // Crear el grupo completo de familiares (unión de ambos grupos + los dos usuarios)
    // Esta es la lista MAESTRA que contiene TODOS los miembros del grupo
    const allFamilyMembers = new Set([
      ...userFamilyMembers,
      ...foundUserFamilyMembers,
      userId,        // El usuario actual
      foundUserId    // El usuario encontrado
    ]);
    
    // Esta es la lista completa del grupo (incluyendo a todos)
    const completeGroupList = Array.from(allFamilyMembers);
    
    console.log('Grupo completo de familiares:', completeGroupList);
    console.log('Usuario actual:', userId);
    console.log('Usuario encontrado:', foundUserId);

    // Función helper para obtener la lista de un usuario (sin incluirse a sí mismo)
    const getFamilyListForUser = (targetUserId) => {
      return completeGroupList.filter(id => id !== targetUserId);
    };

    // Actualizar la lista del usuario actual (sin incluirse a sí mismo)
    const userFamilyList = getFamilyListForUser(userId);
    console.log(`Lista para usuario ${userId}:`, userFamilyList);
    await updateDoc(userDocRef, {
      familyMembers: userFamilyList,
      updatedAt: new Date().toISOString()
    });

    // Actualizar la lista del usuario encontrado (sin incluirse a sí mismo)
    const foundUserFamilyList = getFamilyListForUser(foundUserId);
    console.log(`Lista para usuario ${foundUserId}:`, foundUserFamilyList);
    await updateDoc(foundUserDocRef, {
      familyMembers: foundUserFamilyList,
      updatedAt: new Date().toISOString()
    });

    // Sincronizar todos los demás miembros del grupo para que todos tengan la misma lista
    const syncPromises = completeGroupList.map(async (memberId) => {
      if (memberId === userId || memberId === foundUserId) {
        // Ya actualizados arriba
        return;
      }
      
      try {
        const memberDocRef = doc(collection(firestore, 'users'), memberId);
        const memberDoc = await getDoc(memberDocRef);
        
        if (memberDoc.exists()) {
          // Crear la lista sincronizada para este miembro (sin incluirse a sí mismo)
          const memberSyncList = getFamilyListForUser(memberId);
          console.log(`Sincronizando miembro ${memberId} con lista:`, memberSyncList);
          await updateDoc(memberDocRef, {
            familyMembers: memberSyncList,
            updatedAt: new Date().toISOString()
          });
        }
      } catch (syncError) {
        console.error(`Error al sincronizar miembro ${memberId}:`, syncError);
        // Continuar con los demás miembros aunque falle uno
      }
    });

    // Esperar a que todas las sincronizaciones terminen antes de responder
    await Promise.all(syncPromises);
    console.log('Sincronización completa finalizada');
    
    // Verificar que las actualizaciones se guardaron correctamente
    const verifyUserDoc = await getDoc(userDocRef);
    const verifyFoundUserDoc = await getDoc(foundUserDocRef);
    console.log('=== VERIFICACIÓN POST-SINCRONIZACIÓN ===');
    console.log(`Usuario ${userId} tiene familiares:`, verifyUserDoc.data()?.familyMembers || []);
    console.log(`Usuario ${foundUserId} tiene familiares:`, verifyFoundUserDoc.data()?.familyMembers || []);

    res.json({
      success: true,
      member: {
        uid: foundUserData.uid,
        email: foundUserData.email,
        displayName: foundUserData.displayName || 'Sin nombre',
        shareCode: foundUserData.shareCode
      }
    });
  } catch (error) {
    console.error('Error al agregar familiar:', error);
    res.status(500).json({
      success: false,
      error: 'Error al agregar el familiar',
      errorCode: 'ADD_FAMILY_MEMBER_ERROR'
    });
  }
};

/**
 * Elimina un miembro de la familia
 * También elimina la relación bidireccional y sincroniza el grupo
 */
export const removeFamilyMember = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { memberId } = req.body;

    if (!memberId) {
      return res.status(400).json({
        success: false,
        error: 'ID del miembro es requerido',
        errorCode: 'MEMBER_ID_REQUIRED'
      });
    }

    const userDocRef = doc(collection(firestore, 'users'), userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado',
        errorCode: 'USER_NOT_FOUND'
      });
    }

    const userData = userDoc.data();
    const userFamilyMembers = userData.familyMembers || [];

    if (!userFamilyMembers.includes(memberId)) {
      return res.status(400).json({
        success: false,
        error: 'Este usuario no está en tu lista de familia',
        errorCode: 'MEMBER_NOT_FOUND'
      });
    }

    // Obtener la lista actual de familiares del miembro a eliminar
    const memberToRemoveDocRef = doc(collection(firestore, 'users'), memberId);
    const memberToRemoveDoc = await getDoc(memberToRemoveDocRef);
    
    let memberToRemoveFamilyMembers = [];
    if (memberToRemoveDoc.exists()) {
      memberToRemoveFamilyMembers = memberToRemoveDoc.data().familyMembers || [];
    }

    // Crear el grupo completo actual (unión de ambos grupos + los dos usuarios)
    const currentGroup = new Set([
      ...userFamilyMembers,
      ...memberToRemoveFamilyMembers,
      userId,
      memberId
    ]);
    
    // Remover el miembro que se está eliminando del grupo
    currentGroup.delete(memberId);
    
    // Esta es la nueva lista maestra del grupo (sin el miembro eliminado)
    const newCompleteGroupList = Array.from(currentGroup);
    
    console.log('Nuevo grupo después de eliminar:', newCompleteGroupList);
    console.log('Usuario actual:', userId);
    console.log('Miembro eliminado:', memberId);

    // Función helper para obtener la lista de un usuario (sin incluirse a sí mismo)
    const getFamilyListForUser = (targetUserId) => {
      return newCompleteGroupList.filter(id => id !== targetUserId);
    };

    // Actualizar la lista del usuario actual (sin incluirse a sí mismo y sin el eliminado)
    const userNewFamilyList = getFamilyListForUser(userId);
    console.log(`Nueva lista para usuario ${userId}:`, userNewFamilyList);
    await updateDoc(userDocRef, {
      familyMembers: userNewFamilyList,
      updatedAt: new Date().toISOString()
    });

    // Sincronizar todos los demás miembros del grupo para que todos tengan la misma lista
    const syncPromises = newCompleteGroupList.map(async (remainingMemberId) => {
      try {
        const remainingMemberDocRef = doc(collection(firestore, 'users'), remainingMemberId);
        const remainingMemberDoc = await getDoc(remainingMemberDocRef);
        
        if (remainingMemberDoc.exists()) {
          // Crear la lista sincronizada para este miembro (sin incluirse a sí mismo)
          const remainingMemberSyncList = getFamilyListForUser(remainingMemberId);
          console.log(`Sincronizando miembro ${remainingMemberId} con lista:`, remainingMemberSyncList);
          await updateDoc(remainingMemberDocRef, {
            familyMembers: remainingMemberSyncList,
            updatedAt: new Date().toISOString()
          });
        }
      } catch (syncError) {
        console.error(`Error al sincronizar miembro ${remainingMemberId}:`, syncError);
        // Continuar con los demás miembros aunque falle uno
      }
    });

    // Esperar a que todas las sincronizaciones terminen antes de responder
    await Promise.all(syncPromises);
    console.log('Sincronización completa finalizada después de eliminar');

    res.json({
      success: true
    });
  } catch (error) {
    console.error('Error al eliminar familiar:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar el familiar',
      errorCode: 'REMOVE_FAMILY_MEMBER_ERROR'
    });
  }
};

