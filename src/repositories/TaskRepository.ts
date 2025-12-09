/**
 * TaskRepository - Implementación del Repository Pattern para Tareas
 * 
 * Implementa la interfaz ITaskRepository utilizando la API backend.
 * Aplica principios de codificación segura en todas las operaciones CRUD.
 * 
 * Principios de Seguridad Implementados:
 * - Validación exhaustiva de datos de entrada
 * - Manejo robusto de errores con try-catch
 * - Mensajes de error amigables sin exponer detalles técnicos
 * - Sanitización de datos antes de enviar a la API
 */

import ApiService from '../services/ApiService';
import {
  ITaskRepository,
  TaskOperationResult
} from './interfaces/ITaskRepository';
import {
  TaskModel,
  CreateTaskData,
  UpdateTaskData
} from '../models/TaskModel';

// Interfaz para las respuestas de la API
interface ApiTaskResponse {
  success: boolean;
  task?: TaskModel;
  tasks?: TaskModel[];
  error?: string;
  message?: string;
  errorCode?: string;
  conflict?: {
    currentVersion: number;
    expectedVersion: number;
    lastModifiedBy: string;
    lastModifiedByName: string;
    serverTask: TaskModel;
  };
}

class TaskRepository implements ITaskRepository {
  /**
   * Crea una nueva tarea a través de la API
   * 
   * @param taskData Datos de la tarea a crear
   * @returns Resultado con la tarea creada o error
   */
  async createTask(taskData: CreateTaskData): Promise<TaskOperationResult> {
    try {
      // Validación de entrada
      const validationError = this.validateCreateTaskData(taskData);
      if (validationError) {
        console.error('[TaskRepository] Error de validación:', validationError);
        return {
          success: false,
          error: validationError,
          errorCode: 'VALIDATION_ERROR'
        };
      }

      console.log('[TaskRepository] Creando tarea con datos:', {
        title: taskData.title,
        assignedTo: taskData.assignedTo,
        dueDate: taskData.dueDate,
        priority: taskData.priority
      });

      // Enviar petición a la API
      const response = await ApiService.post<ApiTaskResponse>('/api/tasks', {
        title: taskData.title.trim(),
        description: taskData.description.trim() || '',
        assignedTo: taskData.assignedTo.trim(),
        dueDate: taskData.dueDate,
        priority: taskData.priority,
        reminderTime: taskData.reminderTime || undefined,
        categories: taskData.categories && Array.isArray(taskData.categories) 
          ? taskData.categories.filter(cat => cat && cat.trim()).map(cat => cat.trim())
          : [],
        groupId: taskData.groupId || undefined
      });

      console.log('[TaskRepository] Respuesta de la API:', JSON.stringify(response, null, 2));

      // Validar que la respuesta sea un objeto
      if (!response || typeof response !== 'object') {
        console.error('[TaskRepository] Respuesta inválida de la API:', response);
        return {
          success: false,
          error: 'Respuesta inválida del servidor',
          errorCode: 'INVALID_RESPONSE'
        };
      }

      // Verificar si la respuesta tiene éxito
      if (response.success === true && response.task) {
        // Validar que la tarea tenga un ID
        if (!response.task.id) {
          console.error('[TaskRepository] Tarea creada sin ID:', response.task);
          return {
            success: false,
            error: 'La tarea fue creada pero no tiene un ID válido',
            errorCode: 'INVALID_TASK_ID'
          };
        }
        
        console.log('[TaskRepository] Tarea creada exitosamente:', response.task.id);
        return {
          success: true,
          task: response.task
        };
      }

      // Si no tiene éxito, retornar error
      const errorMessage = response.error || response.message || 'Error al crear la tarea';
      console.error('[TaskRepository] Error en respuesta de API:', errorMessage);
      console.error('[TaskRepository] Respuesta completa:', JSON.stringify(response, null, 2));
      return {
        success: false,
        error: errorMessage,
        errorCode: response.errorCode || 'CREATE_TASK_ERROR'
      };
    } catch (error: any) {
      console.error('[TaskRepository] Excepción al crear tarea:', error);
      console.error('[TaskRepository] Detalles del error:', {
        message: error?.message,
        stack: error?.stack,
        response: error?.response,
        status: error?.status
      });
      
      // Manejar diferentes tipos de errores
      if (error?.response) {
        // Error de la API con respuesta
        const errorMessage = error.response.error || error.response.message || 'Error al crear la tarea';
        console.error('[TaskRepository] Error de API:', errorMessage);
        return {
          success: false,
          error: errorMessage,
          errorCode: error.response.errorCode || error.errorCode || 'CREATE_TASK_ERROR'
        };
      }
      
      // Error de red u otro error
      const errorMessage = error.message || 'Ocurrió un error al crear la tarea. Verifica tu conexión a internet y que el servidor esté corriendo.';
      console.error('[TaskRepository] Error de red:', errorMessage);
      return {
        success: false,
        error: errorMessage,
        errorCode: error.errorCode || 'NETWORK_ERROR'
      };
    }
  }

  /**
   * Obtiene todas las tareas de un usuario a través de la API
   * 
   * @param userId ID del usuario creador (no se usa directamente, la API lo obtiene del token)
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

      // console.log('Buscando tareas para usuario:', userId.trim());

      // Enviar petición a la API (el userId se valida pero la API obtiene el usuario del token)
      const response = await ApiService.get<ApiTaskResponse>('/api/tasks');

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Error al obtener las tareas',
          errorCode: response.errorCode
        };
      }

      // console.log(`Obtenidas ${response.tasks?.length || 0} tareas para usuario ${userId.trim()}`);

      return {
        success: true,
        tasks: response.tasks || []
      };
    } catch (error: any) {
      console.error('Error al obtener tareas:', error);
      return {
        success: false,
        error: error.message || 'Ocurrió un error al obtener las tareas',
        errorCode: 'GET_TASKS_ERROR'
      };
    }
  }

  /**
   * Obtiene una tarea específica por ID a través de la API
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

      // Enviar petición a la API
      const response = await ApiService.get<ApiTaskResponse>(`/api/tasks/${taskId}`);

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Error al obtener la tarea',
          errorCode: response.errorCode
        };
      }

      return {
        success: true,
        task: response.task
      };
    } catch (error: any) {
      console.error('Error al obtener tarea:', error);
      return {
        success: false,
        error: error.message || 'Ocurrió un error al obtener la tarea',
        errorCode: 'GET_TASK_ERROR'
      };
    }
  }

  /**
   * Actualiza una tarea existente a través de la API
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

      // Preparar datos de actualización
      const updateData: any = {};
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
      if (data.categories !== undefined) {
        // Enviar array vacío si no hay categorías, para permitir limpiar categorías
        updateData.categories = Array.isArray(data.categories) 
          ? data.categories.filter(cat => cat && cat.trim()).map(cat => cat.trim())
          : [];
      }
      
      // Incluir versión si está disponible (para detección de conflictos)
      if (data.version !== undefined) {
        updateData.version = data.version;
      }

      // Enviar petición a la API
      const response = await ApiService.put<ApiTaskResponse>(`/api/tasks/${taskId}`, updateData);

      // Verificar si la respuesta tiene éxito
      if (response && response.success && response.task) {
        return {
          success: true,
          task: response.task
        };
      }

      // Si hay conflicto de versión, retornar información del conflicto
      if (response?.conflict || (response?.errorCode === 'CONFLICT' && response?.conflict)) {
        return {
          success: false,
          error: 'La tarea fue modificada por otro usuario',
          errorCode: 'VERSION_CONFLICT',
          conflict: response.conflict
        };
      }

      // Si no tiene éxito, retornar error
      return {
        success: false,
        error: response?.error || response?.message || 'Error al actualizar la tarea',
        errorCode: response?.errorCode || 'UPDATE_TASK_ERROR'
      };
    } catch (error: any) {
      console.error('Error al actualizar tarea:', error);
      
      // Manejar diferentes tipos de errores
      if (error?.response) {
        // Error de la API con respuesta
        if (error.response.conflict) {
          return {
            success: false,
            error: 'La tarea fue modificada por otro usuario',
            errorCode: 'VERSION_CONFLICT',
            conflict: error.response.conflict
          };
        }
        return {
          success: false,
          error: error.response.error || error.response.message || 'Error al actualizar la tarea',
          errorCode: error.response.errorCode || error.errorCode || 'UPDATE_TASK_ERROR'
        };
      }
      
      // Error de red u otro error
      return {
        success: false,
        error: error.message || 'Ocurrió un error al actualizar la tarea. Verifica tu conexión a internet.',
        errorCode: error.errorCode || 'UPDATE_TASK_ERROR'
      };
    }
  }

  /**
   * Elimina una tarea a través de la API
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

      // Enviar petición a la API
      const response = await ApiService.delete<ApiTaskResponse>(`/api/tasks/${taskId}`);

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Error al eliminar la tarea',
          errorCode: response.errorCode
        };
      }

      // console.log('Tarea eliminada exitosamente:', taskId);

      return {
        success: true
      };
    } catch (error: any) {
      console.error('Error al eliminar tarea:', error);
      return {
        success: false,
        error: error.message || 'Ocurrió un error al eliminar la tarea',
        errorCode: 'DELETE_TASK_ERROR'
      };
    }
  }

  /**
   * Marca una tarea como completada o no completada a través de la API
   * 
   * @param taskId ID de la tarea
   * @param isCompleted Estado de completado
   * @returns Resultado de la operación
   */
  async toggleTaskCompletion(taskId: string, isCompleted: boolean): Promise<TaskOperationResult> {
    try {
      if (!taskId || !taskId.trim()) {
        return {
          success: false,
          error: 'El ID de la tarea es requerido',
          errorCode: 'VALIDATION_ERROR'
        };
      }

      // Enviar petición a la API
      const response = await ApiService.patch<ApiTaskResponse>(
        `/api/tasks/${taskId}/toggle`,
        { isCompleted }
      );

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Error al cambiar el estado de la tarea',
          errorCode: response.errorCode
        };
      }

      return {
        success: true,
        task: response.task
      };
    } catch (error: any) {
      console.error('Error al cambiar estado de tarea:', error);
      return {
        success: false,
        error: error.message || 'Ocurrió un error al cambiar el estado de la tarea',
        errorCode: 'TOGGLE_TASK_ERROR'
      };
    }
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

    // Validar descripción (opcional)
    if (data.description && data.description.trim()) {
      if (data.description.trim().length < 5) {
        return 'La descripción debe tener al menos 5 caracteres si se proporciona';
      }
      if (data.description.length > 500) {
        return 'La descripción no puede exceder 500 caracteres';
      }
    }
    // Si está vacía o no se proporciona, está bien (es opcional)

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
}

export default TaskRepository;
