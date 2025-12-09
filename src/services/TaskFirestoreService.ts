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
import { firestore, getFirebaseAuth } from './FirebaseService';
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
    categories: Array.isArray(data.categories) ? data.categories : undefined,
    version: data.version || 1,
    lastModifiedBy: data.lastModifiedBy || data.createdBy || '',
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    groupId: data.groupId || undefined
  };
};

/**
 * Suscribe a las tareas del usuario en tiempo real usando onSnapshot
 * 
 * @param userId ID del usuario actual
 * @param callback Función que se ejecuta cuando hay cambios
 * @param onError Función opcional que se ejecuta cuando hay errores
 * @returns Función para desuscribirse
 */
export const subscribeToTasks = (
  userId: string,
  callback: (tasks: TaskModel[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  console.log('[TaskFirestoreService] subscribeToTasks llamado con userId:', userId);
  
  if (!userId) {
    console.error('[TaskFirestoreService] ERROR: userId no proporcionado');
    if (onError) {
      onError(new Error('userId no proporcionado'));
    }
    callback([]);
    return () => {};
  }

  // Verificar que firestore esté disponible
  if (!firestore) {
    console.error('[TaskFirestoreService] ERROR: Firestore no está disponible');
    if (onError) {
      onError(new Error('Firestore no está inicializado'));
    }
    callback([]);
    return () => {};
  }

  // Verificar que Firebase Auth tenga un usuario autenticado
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth || !firebaseAuth.currentUser) {
    console.error('[TaskFirestoreService] ERROR: Firebase Auth no tiene usuario autenticado');
    console.error('[TaskFirestoreService] Esto causará que onSnapshot falle por permisos de seguridad');
    console.error('[TaskFirestoreService] SOLUCIÓN: El usuario debe hacer login nuevamente para sincronizar Firebase Auth');
    if (onError) {
      onError(new Error('Firebase Auth no está autenticado. Por favor, cierra sesión y vuelve a iniciar sesión.'));
    }
    callback([]);
    return () => {};
  }

  console.log('[TaskFirestoreService] Firebase Auth tiene usuario autenticado:', firebaseAuth.currentUser.uid);

  console.log('[TaskFirestoreService] Firestore está disponible, creando query...');

  try {
    // Query: tareas donde el usuario es creador O asignado
    const tasksRef = collection(firestore, COLLECTION_NAME);
    console.log('[TaskFirestoreService] Collection reference creada:', COLLECTION_NAME);
    
    const q = query(
      tasksRef,
      or(
        where('createdBy', '==', userId),
        where('assignedTo', '==', userId)
      )
    );
    console.log('[TaskFirestoreService] Query creada para userId:', userId);

    // Suscribirse a cambios en tiempo real
    console.log('[TaskFirestoreService] Suscribiéndose a onSnapshot...');
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log('[TaskFirestoreService] onSnapshot recibido. Documentos:', snapshot.size);
        // Usar Map para evitar duplicados (por si acaso Firestore devuelve duplicados)
        const tasksMap = new Map<string, TaskModel>();
        
        snapshot.forEach((doc) => {
          try {
            // Solo agregar si no existe (evitar duplicados)
            if (!tasksMap.has(doc.id)) {
              const task = convertFirestoreTask(doc);
              console.log(`[TaskFirestoreService] Tarea convertida ${doc.id}:`, {
                id: task.id,
                title: task.title,
                groupId: task.groupId || 'SIN groupId'
              });
              tasksMap.set(doc.id, task);
            }
          } catch (error) {
            console.error(`Error al convertir tarea ${doc.id}:`, error);
          }
        });

        // Convertir Map a Array
        const tasks = Array.from(tasksMap.values());
        console.log('[TaskFirestoreService] Tareas convertidas:', tasks.length);

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

        console.log('[TaskFirestoreService] Tareas ordenadas, llamando callback con', sortedTasks.length, 'tareas');
        callback(sortedTasks);
      },
      (error) => {
        console.error('[TaskFirestoreService] ERROR en onSnapshot:', error);
        console.error('[TaskFirestoreService] Detalles del error:', {
          code: error.code,
          message: error.message,
          stack: error.stack
        });
        if (onError) {
          onError(error);
        }
        callback([]);
      }
    );

    console.log('[TaskFirestoreService] Suscripción creada exitosamente');
    return unsubscribe;
  } catch (error) {
    console.error('[TaskFirestoreService] EXCEPCIÓN al configurar subscribeToTasks:', error);
    console.error('[TaskFirestoreService] Stack trace:', error instanceof Error ? error.stack : 'N/A');
    if (onError) {
      onError(error instanceof Error ? error : new Error(String(error)));
    }
    callback([]);
    return () => {};
  }
};

