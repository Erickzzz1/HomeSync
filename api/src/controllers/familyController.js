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
    console.log('Datos del usuario:', userData);
    const familyMemberIds = userData?.familyMembers || [];

    if (familyMemberIds.length === 0) {
      return res.json({
        success: true,
        familyMembers: []
      });
    }

    // Obtener información de cada familiar
    const familyMembers = [];
    for (const memberId of familyMemberIds) {
      try {
        const memberDocRef = doc(collection(firestore, 'users'), memberId);
        const memberDoc = await getDoc(memberDocRef);
        
        if (memberDoc.exists()) {
          const memberData = memberDoc.data();
          familyMembers.push({
            uid: memberData.uid,
            email: memberData.email,
            displayName: memberData.displayName || 'Sin nombre',
            shareCode: memberData.shareCode
          });
        }
      } catch (memberError) {
        console.error(`Error al obtener información del miembro ${memberId}:`, memberError);
        // Continuar con los otros miembros
      }
    }

    console.log('Devolviendo', familyMembers.length, 'familiares');
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
    const foundUserDoc = querySnapshot.docs[0];
    const foundUserId = foundUserDoc.id;
    const foundUserData = foundUserDoc.data();

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
    const familyMembers = userData.familyMembers || [];

    if (familyMembers.includes(foundUserId)) {
      return res.status(400).json({
        success: false,
        error: 'Este usuario ya está en tu lista de familia',
        errorCode: 'MEMBER_ALREADY_EXISTS'
      });
    }

    // Agregar el miembro
    await updateDoc(userDocRef, {
      familyMembers: arrayUnion(foundUserId),
      updatedAt: new Date().toISOString()
    });

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

    await updateDoc(userDocRef, {
      familyMembers: arrayRemove(memberId),
      updatedAt: new Date().toISOString()
    });

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

