/**
 * Controlador de tareas
 * 
 * Maneja las operaciones CRUD de tareas usando Firestore
 */

import { firestore } from '../config/firebase.js';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';

const COLLECTION_NAME = 'tasks';

/**
 * Crea una nueva tarea
 */
export const createTask = async (req, res) => {
  try {
    const { title, description, assignedTo, dueDate, priority } = req.body;
    const userId = req.user.uid;

    // Validación
    const validationError = validateCreateTaskData(req.body);
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError,
        errorCode: 'VALIDATION_ERROR'
      });
    }

    // Preparar datos
    const taskData = {
      title: title.trim(),
      description: description.trim(),
      assignedTo: assignedTo.trim(),
      dueDate,
      priority,
      createdBy: userId,
      isCompleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // Crear en Firestore
    const tasksCollection = collection(firestore, COLLECTION_NAME);
    const docRef = await addDoc(tasksCollection, taskData);

    // Obtener documento creado
    const docSnapshot = await getDoc(docRef);
    const data = docSnapshot.data();
    const task = {
      id: docRef.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
    };

    res.json({
      success: true,
      task
    });
  } catch (error) {
    // console.error('Error al crear tarea:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear la tarea',
      errorCode: 'CREATE_TASK_ERROR'
    });
  }
};

/**
 * Obtiene todas las tareas de un usuario
 */
export const getTasks = async (req, res) => {
  try {
    const userId = req.user.uid;

    const tasksCollection = collection(firestore, COLLECTION_NAME);

    // Intentar consulta con orderBy primero
    let snapshot;
    try {
      const q = query(
        tasksCollection,
        where('createdBy', '==', userId),
        orderBy('createdAt', 'desc')
      );
      snapshot = await getDocs(q);
    } catch (orderByError) {
      // Si falla por índice, intentar sin orderBy
      if (orderByError?.code === 'failed-precondition' || orderByError?.message?.includes('index')) {
        console.warn('Indice compuesto no encontrado, consultando sin orderBy');
        const q = query(
          tasksCollection,
          where('createdBy', '==', userId)
        );
        snapshot = await getDocs(q);
      } else {
        throw orderByError;
      }
    }

    const tasks = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      tasks.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
      });
    });

    // Ordenar manualmente si no se usó orderBy
    tasks.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

    res.json({
      success: true,
      tasks
    });
  } catch (error) {
    // console.error('Error al obtener tareas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener las tareas',
      errorCode: 'GET_TASKS_ERROR'
    });
  }
};

/**
 * Obtiene una tarea específica por ID
 */
export const getTaskById = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.uid;

    const taskDoc = doc(firestore, COLLECTION_NAME, taskId);
    const docSnapshot = await getDoc(taskDoc);

    if (!docSnapshot.exists()) {
      return res.status(404).json({
        success: false,
        error: 'La tarea no existe',
        errorCode: 'NOT_FOUND'
      });
    }

    const data = docSnapshot.data();
    
    // Verificar que la tarea pertenece al usuario
    if (data.createdBy !== userId) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para acceder a esta tarea',
        errorCode: 'PERMISSION_DENIED'
      });
    }

    const task = {
      id: docSnapshot.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
    };

    res.json({
      success: true,
      task
    });
  } catch (error) {
    console.error('Error al obtener tarea:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener la tarea',
      errorCode: 'GET_TASK_ERROR'
    });
  }
};

/**
 * Actualiza una tarea existente
 */
export const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.uid;
    const updateData = req.body;

    // Validación
    const validationError = validateUpdateTaskData(updateData);
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError,
        errorCode: 'VALIDATION_ERROR'
      });
    }

    // Verificar que la tarea existe y pertenece al usuario
    const taskDoc = doc(firestore, COLLECTION_NAME, taskId);
    const docSnapshot = await getDoc(taskDoc);
    
    if (!docSnapshot.exists()) {
      return res.status(404).json({
        success: false,
        error: 'La tarea no existe',
        errorCode: 'NOT_FOUND'
      });
    }

    if (docSnapshot.data().createdBy !== userId) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para actualizar esta tarea',
        errorCode: 'PERMISSION_DENIED'
      });
    }

    // Preparar datos de actualización
    const updateFields = {
      updatedAt: serverTimestamp()
    };

    if (updateData.title !== undefined) {
      updateFields.title = updateData.title.trim();
    }
    if (updateData.description !== undefined) {
      updateFields.description = updateData.description.trim();
    }
    if (updateData.assignedTo !== undefined) {
      updateFields.assignedTo = updateData.assignedTo.trim();
    }
    if (updateData.dueDate !== undefined) {
      updateFields.dueDate = updateData.dueDate;
    }
    if (updateData.priority !== undefined) {
      updateFields.priority = updateData.priority;
    }
    if (updateData.isCompleted !== undefined) {
      updateFields.isCompleted = updateData.isCompleted;
    }

    // Actualizar en Firestore
    await updateDoc(taskDoc, updateFields);

    // Obtener tarea actualizada
    const updatedDoc = await getDoc(taskDoc);
    const data = updatedDoc.data();
    const task = {
      id: updatedDoc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
    };

    res.json({
      success: true,
      task
    });
  } catch (error) {
    console.error('Error al actualizar tarea:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar la tarea',
      errorCode: 'UPDATE_TASK_ERROR'
    });
  }
};

/**
 * Elimina una tarea
 */
export const deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.uid;

    // Verificar que la tarea existe y pertenece al usuario
    const taskDoc = doc(firestore, COLLECTION_NAME, taskId);
    const docSnapshot = await getDoc(taskDoc);
    
    if (!docSnapshot.exists()) {
      return res.status(404).json({
        success: false,
        error: 'La tarea no existe',
        errorCode: 'NOT_FOUND'
      });
    }

    if (docSnapshot.data().createdBy !== userId) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para eliminar esta tarea',
        errorCode: 'PERMISSION_DENIED'
      });
    }

    // Eliminar
    await deleteDoc(taskDoc);

    res.json({
      success: true
    });
  } catch (error) {
    console.error('Error al eliminar tarea:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar la tarea',
      errorCode: 'DELETE_TASK_ERROR'
    });
  }
};

/**
 * Marca una tarea como completada o no completada
 */
export const toggleTaskCompletion = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { isCompleted } = req.body;

    if (typeof isCompleted !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'isCompleted debe ser un valor booleano',
        errorCode: 'VALIDATION_ERROR'
      });
    }

    // Usar updateTask
    req.body = { isCompleted };
    return await updateTask(req, res);
  } catch (error) {
    console.error('Error al cambiar estado de tarea:', error);
    res.status(500).json({
      success: false,
      error: 'Error al cambiar el estado de la tarea',
      errorCode: 'TOGGLE_TASK_ERROR'
    });
  }
};

/**
 * Valida los datos de creación de tarea
 */
function validateCreateTaskData(data) {
  if (!data.title || !data.title.trim()) {
    return 'El título de la tarea es requerido';
  }
  if (data.title.trim().length < 3) {
    return 'El título debe tener al menos 3 caracteres';
  }
  if (data.title.length > 100) {
    return 'El título no puede exceder 100 caracteres';
  }

  if (!data.description || !data.description.trim()) {
    return 'La descripción es requerida';
  }
  if (data.description.length > 500) {
    return 'La descripción no puede exceder 500 caracteres';
  }

  if (!data.assignedTo || !data.assignedTo.trim()) {
    return 'Debe asignar la tarea a un miembro';
  }
  if (data.assignedTo.length > 50) {
    return 'El nombre del asignado es demasiado largo';
  }

  if (!data.dueDate) {
    return 'La fecha de vencimiento es requerida';
  }
  const dueDate = new Date(data.dueDate);
  if (isNaN(dueDate.getTime())) {
    return 'La fecha de vencimiento no es válida';
  }

  const validPriorities = ['Alta', 'Media', 'Baja'];
  if (!validPriorities.includes(data.priority)) {
    return 'La prioridad debe ser Alta, Media o Baja';
  }

  return null;
}

/**
 * Valida los datos de actualización de tarea
 */
function validateUpdateTaskData(data) {
  if (Object.keys(data).length === 0) {
    return 'Debe proporcionar al menos un campo para actualizar';
  }

  if (data.title !== undefined) {
    if (!data.title.trim()) {
      return 'El título no puede estar vacío';
    }
    if (data.title.trim().length < 3) {
      return 'El título debe tener al menos 3 caracteres';
    }
    if (data.title.length > 100) {
      return 'El título no puede exceder 100 caracteres';
    }
  }

  if (data.description !== undefined && data.description.length > 500) {
    return 'La descripción no puede exceder 500 caracteres';
  }

  if (data.assignedTo !== undefined && (!data.assignedTo.trim() || data.assignedTo.length > 50)) {
    return 'El nombre del asignado no es válido';
  }

  if (data.dueDate !== undefined) {
    const dueDate = new Date(data.dueDate);
    if (isNaN(dueDate.getTime())) {
      return 'La fecha de vencimiento no es válida';
    }
  }

  if (data.priority !== undefined) {
    const validPriorities = ['Alta', 'Media', 'Baja'];
    if (!validPriorities.includes(data.priority)) {
      return 'La prioridad debe ser Alta, Media o Baja';
    }
  }

  return null;
}
