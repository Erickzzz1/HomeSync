/**
 * TaskModel - Modelo de datos para las tareas del hogar
 * 
 * Define la estructura de una tarea en Firestore siguiendo
 * el principio de tipado fuerte de TypeScript.
 */

export type TaskPriority = 'Alta' | 'Media' | 'Baja';

/**
 * Interfaz principal del modelo de tarea
 */
export interface TaskModel {
  /**
   * ID único del documento en Firestore
   */
  id: string;

  /**
   * Título de la tarea
   */
  title: string;

  /**
   * Descripción detallada de la tarea
   */
  description: string;

  /**
   * Miembro familiar asignado a la tarea
   */
  assignedTo: string;

  /**
   * Fecha de vencimiento (formato ISO string)
   */
  dueDate: string;

  /**
   * Nivel de prioridad de la tarea
   */
  priority: TaskPriority;

  /**
   * Estado de completado de la tarea
   */
  isCompleted: boolean;

  /**
   * ID del usuario que creó la tarea
   */
  createdBy: string;

  /**
   * Fecha de creación (timestamp)
   */
  createdAt: string;

  /**
   * Fecha de última actualización (timestamp)
   */
  updatedAt: string;
}

/**
 * Datos necesarios para crear una nueva tarea
 * (sin id, createdAt, updatedAt que se generan automáticamente)
 */
export interface CreateTaskData {
  title: string;
  description: string;
  assignedTo: string;
  dueDate: string;
  priority: TaskPriority;
  createdBy: string;
}

/**
 * Datos para actualizar una tarea existente
 * (todos los campos son opcionales)
 */
export interface UpdateTaskData {
  title?: string;
  description?: string;
  assignedTo?: string;
  dueDate?: string;
  priority?: TaskPriority;
  isCompleted?: boolean;
}

