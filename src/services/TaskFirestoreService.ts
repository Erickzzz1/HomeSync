/**
 * TaskFirestoreService - Servicio para operaciones de tareas con Firestore
 * 
 * Usa onSnapshot para actualizaciones en tiempo real
 */

import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  Unsubscribe,
  or,
  Timestamp
} from 'firebase/firestore';
import { firestore } from './FirebaseService';
import { TaskModel } from '../models/TaskModel';

const COLLECTION_NAME = 'tasks';

/**
 * Convierte un documento de Firestore a TaskModel
 */
const convertFirestoreTask = (doc: any): TaskModel => {
  const data = doc.data();
  return {
    id: doc.id,
    title: data.title || '',
    description: data.description || '',
    assignedTo: data.assignedTo || '',
    dueDate: data.dueDate || '',
    priority: data.priority || 'Media',
    isCompleted: data.isCompleted || false,
    createdBy: data.createdBy || '',
    reminderTime: data.reminderTime || undefined,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
  };
};

/**
 * Suscribe a las tareas del usuario en tiempo real usando onSnapshot
 * 
 * @param userId ID del usuario actual
 * @param callback Función que se ejecuta cuando hay cambios
 * @returns Función para desuscribirse
 */
export const subscribeToTasks = (
  userId: string,
  callback: (tasks: TaskModel[]) => void
): Unsubscribe => {
  if (!userId) {
    console.warn('subscribeToTasks: userId no proporcionado');
    return () => {};
  }

  // Query: tareas donde el usuario es creador O asignado
  const tasksRef = collection(firestore, COLLECTION_NAME);
  const q = query(
    tasksRef,
    or(
      where('createdBy', '==', userId),
      where('assignedTo', '==', userId)
    )
  );

  // Suscribirse a cambios en tiempo real
  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const tasks: TaskModel[] = [];
      
      snapshot.forEach((doc) => {
        try {
          const task = convertFirestoreTask(doc);
          tasks.push(task);
        } catch (error) {
          console.error(`Error al convertir tarea ${doc.id}:`, error);
        }
      });

      // Ordenar: Pendientes primero (por fecha ascendente), luego completadas
      const sortedTasks = tasks.sort((a, b) => {
        // Primero separar por estado de completado
        if (a.isCompleted !== b.isCompleted) {
          return a.isCompleted ? 1 : -1; // Pendientes primero
        }
        
        // Si ambas están completadas o ambas pendientes, ordenar por fecha
        if (!a.isCompleted && !b.isCompleted) {
          // Pendientes: por fecha ascendente (más próximas primero)
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        } else {
          // Completadas: por fecha descendente (más recientes primero)
          return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
        }
      });

      callback(sortedTasks);
    },
    (error) => {
      console.error('Error en onSnapshot de tareas:', error);
      callback([]);
    }
  );

  return unsubscribe;
};

