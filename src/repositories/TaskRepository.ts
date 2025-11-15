/**
 * TaskRepository - Implementación del Repository Pattern para Tareas
 * 
 * Implementa la interfaz ITaskRepository utilizando Firebase Firestore.
 * Aplica principios de codificación segura en todas las operaciones CRUD.
 * 
 * Principios de Seguridad Implementados:
 * - Validación exhaustiva de datos de entrada
 * - Manejo robusto de errores con try-catch
 * - Mensajes de error amigables sin exponer detalles técnicos
 * - Sanitización de datos antes de enviar a Firestore
 */

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
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import FirebaseService from '../services/FirebaseService';
import {
  ITaskRepository,
  TaskOperationResult
} from './interfaces/ITaskRepository';
import {
  TaskModel,
  CreateTaskData,
  UpdateTaskData
} from '../models/TaskModel';

class TaskRepository implements ITaskRepository {
  private firebaseService: FirebaseService;
  private readonly COLLECTION_NAME = 'tasks';

  constructor() {
    this.firebaseService = FirebaseService.getInstance();
  }

  /**
   * Crea una nueva tarea en Firestore
   * 
   * Seguridad:
   * - Valida todos los campos antes de crear
   * - Sanitiza entradas
   * - Maneja errores de Firestore
   * 
   * @param taskData Datos de la tarea a crear
   * @returns Resultado con la tarea creada o error
   */
  async createTask(taskData: CreateTaskData): Promise<TaskOperationResult> {
    try {
      // Validación de entrada
      const validationError = this.validateCreateTaskData(taskData);
      if (validationError) {
        return {
          success: false,
          error: validationError,
          errorCode: 'VALIDATION_ERROR'
        };
      }

      const firestore = this.firebaseService.getFirestore();
      const tasksCollection = collection(firestore, this.COLLECTION_NAME);

      // Preparar datos con timestamps
      const taskToCreate = {
        ...taskData,
        title: taskData.title.trim(),
        description: taskData.description.trim(),
        assignedTo: taskData.assignedTo.trim(),
        createdBy: taskData.createdBy.trim(), // Asegurar que createdBy esté presente y recortado
        isCompleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      console.log('📝 Creando tarea con createdBy:', taskToCreate.createdBy);

      // Crear documento en Firestore
      const docRef = await addDoc(tasksCollection, taskToCreate);

      // Obtener el documento creado con su ID
      const createdDoc = await getDoc(docRef);
      const createdTask: TaskModel = {
        id: docRef.id,
        ...taskToCreate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as TaskModel;

      console.log('✅ Tarea creada exitosamente:', docRef.id);

      return {
        success: true,
        task: createdTask
      };
    } catch (error) {
      console.error('❌ Error al crear tarea:', error);
      return this.handleFirestoreError(error as Error);
    }
  }

  /**
   * Obtiene todas las tareas de un usuario/hogar
   * 
   * @param userId ID del usuario creador
   * @returns Lista de tareas
   */
  async getTasks(userId: string): Promise<TaskOperationResult> {
    try {
      if (!userId || !userId.trim()) {
        return {
          success: false,
          error: 'El ID de usuario es requerido',
          errorCode: 'VALIDATION_ERROR'
        };
      }

      const firestore = this.firebaseService.getFirestore();
      const tasksCollection = collection(firestore, this.COLLECTION_NAME);
      const trimmedUserId = userId.trim();

      console.log('🔍 Buscando tareas para usuario:', trimmedUserId);

      // Intentar consulta con orderBy primero
      let q;
      let querySnapshot;
      
      try {
        // Consulta ordenada por fecha de creación
        q = query(
          tasksCollection,
          where('createdBy', '==', trimmedUserId),
          orderBy('createdAt', 'desc')
        );
        querySnapshot = await getDocs(q);
        console.log('✅ Consulta con orderBy exitosa');
      } catch (orderByError: any) {
        // Si falla por falta de índice, intentar sin orderBy
        if (orderByError?.code === 'failed-precondition' || orderByError?.message?.includes('index')) {
          console.warn('⚠️ Índice compuesto no encontrado, consultando sin orderBy');
          q = query(
            tasksCollection,
            where('createdBy', '==', trimmedUserId)
          );
          querySnapshot = await getDocs(q);
          console.log('✅ Consulta sin orderBy exitosa');
        } else {
          throw orderByError;
        }
      }

      const tasks: TaskModel[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const task = {
          id: doc.id,
          title: data.title,
          description: data.description,
          assignedTo: data.assignedTo,
          dueDate: data.dueDate,
          priority: data.priority,
          isCompleted: data.isCompleted,
          createdBy: data.createdBy,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
        };
        tasks.push(task);
        console.log('📝 Tarea encontrada:', task.id, '- Creada por:', task.createdBy);
      });

      // Ordenar manualmente por fecha de creación (descendente)
      tasks.sort((a, b) => {
        try {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA; // Orden descendente (más recientes primero)
        } catch (error) {
          console.warn('Error al ordenar tareas por fecha:', error);
          return 0;
        }
      });

      console.log(`✅ Obtenidas ${tasks.length} tareas para usuario ${trimmedUserId}`);

      return {
        success: true,
        tasks
      };
    } catch (error) {
      console.error('❌ Error al obtener tareas:', error);
      console.error('Detalles del error:', JSON.stringify(error, null, 2));
      return this.handleFirestoreError(error as Error);
    }
  }

  /**
   * Obtiene una tarea específica por ID
   * 
   * @param taskId ID de la tarea
   * @returns Tarea solicitada
   */
  async getTaskById(taskId: string): Promise<TaskOperationResult> {
    try {
      if (!taskId || !taskId.trim()) {
        return {
          success: false,
          error: 'El ID de la tarea es requerido',
          errorCode: 'VALIDATION_ERROR'
        };
      }

      const firestore = this.firebaseService.getFirestore();
      const taskDoc = doc(firestore, this.COLLECTION_NAME, taskId);
      const taskSnapshot = await getDoc(taskDoc);

      if (!taskSnapshot.exists()) {
        return {
          success: false,
          error: 'La tarea no existe',
          errorCode: 'NOT_FOUND'
        };
      }

      const data = taskSnapshot.data();
      const task: TaskModel = {
        id: taskSnapshot.id,
        title: data.title,
        description: data.description,
        assignedTo: data.assignedTo,
        dueDate: data.dueDate,
        priority: data.priority,
        isCompleted: data.isCompleted,
        createdBy: data.createdBy,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
      };

      return {
        success: true,
        task
      };
    } catch (error) {
      console.error('❌ Error al obtener tarea:', error);
      return this.handleFirestoreError(error as Error);
    }
  }

  /**
   * Actualiza una tarea existente
   * 
   * Seguridad:
   * - Valida datos de actualización
   * - Solo actualiza campos permitidos
   * 
   * @param taskId ID de la tarea
   * @param data Datos a actualizar
   * @returns Resultado de la operación
   */
  async updateTask(taskId: string, data: UpdateTaskData): Promise<TaskOperationResult> {
    try {
      if (!taskId || !taskId.trim()) {
        return {
          success: false,
          error: 'El ID de la tarea es requerido',
          errorCode: 'VALIDATION_ERROR'
        };
      }

      // Validar datos de actualización
      const validationError = this.validateUpdateTaskData(data);
      if (validationError) {
        return {
          success: false,
          error: validationError,
          errorCode: 'VALIDATION_ERROR'
        };
      }

      const firestore = this.firebaseService.getFirestore();
      const taskDoc = doc(firestore, this.COLLECTION_NAME, taskId);

      // Verificar que la tarea existe
      const taskSnapshot = await getDoc(taskDoc);
      if (!taskSnapshot.exists()) {
        return {
          success: false,
          error: 'La tarea no existe',
          errorCode: 'NOT_FOUND'
        };
      }

      // Sanitizar y preparar datos para actualización
      const updateData: any = {
        updatedAt: serverTimestamp()
      };

      if (data.title !== undefined) {
        updateData.title = data.title.trim();
      }
      if (data.description !== undefined) {
        updateData.description = data.description.trim();
      }
      if (data.assignedTo !== undefined) {
        updateData.assignedTo = data.assignedTo.trim();
      }
      if (data.dueDate !== undefined) {
        updateData.dueDate = data.dueDate;
      }
      if (data.priority !== undefined) {
        updateData.priority = data.priority;
      }
      if (data.isCompleted !== undefined) {
        updateData.isCompleted = data.isCompleted;
      }

      // Actualizar en Firestore
      await updateDoc(taskDoc, updateData);

      console.log('✅ Tarea actualizada exitosamente:', taskId);

      // Obtener tarea actualizada
      return await this.getTaskById(taskId);
    } catch (error) {
      console.error('❌ Error al actualizar tarea:', error);
      return this.handleFirestoreError(error as Error);
    }
  }

  /**
   * Elimina una tarea
   * 
   * @param taskId ID de la tarea a eliminar
   * @returns Resultado de la operación
   */
  async deleteTask(taskId: string): Promise<TaskOperationResult> {
    try {
      if (!taskId || !taskId.trim()) {
        return {
          success: false,
          error: 'El ID de la tarea es requerido',
          errorCode: 'VALIDATION_ERROR'
        };
      }

      const firestore = this.firebaseService.getFirestore();
      const taskDoc = doc(firestore, this.COLLECTION_NAME, taskId);

      // Verificar que la tarea existe
      const taskSnapshot = await getDoc(taskDoc);
      if (!taskSnapshot.exists()) {
        return {
          success: false,
          error: 'La tarea no existe',
          errorCode: 'NOT_FOUND'
        };
      }

      // Eliminar documento
      await deleteDoc(taskDoc);

      console.log('✅ Tarea eliminada exitosamente:', taskId);

      return {
        success: true
      };
    } catch (error) {
      console.error('❌ Error al eliminar tarea:', error);
      return this.handleFirestoreError(error as Error);
    }
  }

  /**
   * Marca una tarea como completada o no completada
   * 
   * @param taskId ID de la tarea
   * @param isCompleted Estado de completado
   * @returns Resultado de la operación
   */
  async toggleTaskCompletion(taskId: string, isCompleted: boolean): Promise<TaskOperationResult> {
    return await this.updateTask(taskId, { isCompleted });
  }

  /**
   * Valida los datos de creación de tarea
   * Principio de Seguridad: Validación exhaustiva de entrada
   * 
   * @param data Datos a validar
   * @returns Mensaje de error o null si es válido
   */
  private validateCreateTaskData(data: CreateTaskData): string | null {
    // Validar título
    if (!data.title || !data.title.trim()) {
      return 'El título de la tarea es requerido';
    }
    if (data.title.trim().length < 3) {
      return 'El título debe tener al menos 3 caracteres';
    }
    if (data.title.length > 100) {
      return 'El título no puede exceder 100 caracteres';
    }

    // Validar descripción
    if (!data.description || !data.description.trim()) {
      return 'La descripción es requerida';
    }
    if (data.description.length > 500) {
      return 'La descripción no puede exceder 500 caracteres';
    }

    // Validar asignado
    if (!data.assignedTo || !data.assignedTo.trim()) {
      return 'Debe asignar la tarea a un miembro';
    }
    if (data.assignedTo.length > 50) {
      return 'El nombre del asignado es demasiado largo';
    }

    // Validar fecha
    if (!data.dueDate) {
      return 'La fecha de vencimiento es requerida';
    }
    const dueDate = new Date(data.dueDate);
    if (isNaN(dueDate.getTime())) {
      return 'La fecha de vencimiento no es válida';
    }

    // Validar prioridad
    const validPriorities: string[] = ['Alta', 'Media', 'Baja'];
    if (!validPriorities.includes(data.priority)) {
      return 'La prioridad debe ser Alta, Media o Baja';
    }

    // Validar creador
    if (!data.createdBy || !data.createdBy.trim()) {
      return 'El ID del creador es requerido';
    }

    return null;
  }

  /**
   * Valida los datos de actualización de tarea
   * 
   * @param data Datos a validar
   * @returns Mensaje de error o null si es válido
   */
  private validateUpdateTaskData(data: UpdateTaskData): string | null {
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
      const validPriorities: string[] = ['Alta', 'Media', 'Baja'];
      if (!validPriorities.includes(data.priority)) {
        return 'La prioridad debe ser Alta, Media o Baja';
      }
    }

    return null;
  }

  /**
   * Maneja errores de Firestore
   * Convierte errores técnicos en mensajes amigables
   * Principio de Seguridad: No exponer detalles técnicos
   * 
   * @param error Error de Firestore
   * @returns Resultado con mensaje de error amigable
   */
  private handleFirestoreError(error: Error): TaskOperationResult {
    let errorMessage: string;
    let errorCode = 'UNKNOWN_ERROR';

    // Errores comunes de Firestore
    if (error.message.includes('permission-denied')) {
      errorMessage = 'No tienes permisos para realizar esta operación';
      errorCode = 'PERMISSION_DENIED';
    } else if (error.message.includes('not-found')) {
      errorMessage = 'El recurso solicitado no existe';
      errorCode = 'NOT_FOUND';
    } else if (error.message.includes('network')) {
      errorMessage = 'Error de conexión. Verifica tu internet';
      errorCode = 'NETWORK_ERROR';
    } else if (error.message.includes('unavailable')) {
      errorMessage = 'El servicio no está disponible temporalmente';
      errorCode = 'SERVICE_UNAVAILABLE';
    } else {
      errorMessage = 'Ocurrió un error inesperado. Intenta nuevamente';
      console.error('Error no manejado:', error.message);
    }

    return {
      success: false,
      error: errorMessage,
      errorCode
    };
  }
}

export default TaskRepository;

