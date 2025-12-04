/**
 * ITaskRepository - Interfaz del Repository Pattern para Tareas
 * 
 * Define el contrato para las operaciones CRUD de tareas,
 * permitiendo abstraer la implementación específica de Firestore.
 */

import { TaskModel, CreateTaskData, UpdateTaskData } from '../../models/TaskModel';

/**
 * Resultado de operaciones con tareas
 */
export interface TaskOperationResult {
  success: boolean;
  task?: TaskModel;
  tasks?: TaskModel[];
  error?: string;
  errorCode?: string;
  conflict?: {
    currentVersion: number;
    expectedVersion: number;
    lastModifiedBy: string;
    lastModifiedByName: string;
    serverTask: TaskModel;
  };
}

/**
 * Interfaz del repositorio de tareas
 * Abstrae las operaciones CRUD del proveedor específico
 */
export interface ITaskRepository {
  /**
   * Crea una nueva tarea en Firestore
   * @param taskData Datos de la tarea a crear
   * @returns Resultado con la tarea creada
   */
  createTask(taskData: CreateTaskData): Promise<TaskOperationResult>;

  /**
   * Obtiene todas las tareas de un usuario/hogar
   * @param userId ID del usuario o hogar
   * @returns Resultado con la lista de tareas
   */
  getTasks(userId: string): Promise<TaskOperationResult>;

  /**
   * Obtiene una tarea específica por ID
   * @param taskId ID de la tarea
   * @returns Resultado con la tarea solicitada
   */
  getTaskById(taskId: string): Promise<TaskOperationResult>;

  /**
   * Actualiza una tarea existente
   * @param taskId ID de la tarea a actualizar
   * @param data Datos a actualizar (parciales)
   * @returns Resultado de la operación
   */
  updateTask(taskId: string, data: UpdateTaskData): Promise<TaskOperationResult>;

  /**
   * Elimina una tarea
   * @param taskId ID de la tarea a eliminar
   * @returns Resultado de la operación
   */
  deleteTask(taskId: string): Promise<TaskOperationResult>;

  /**
   * Marca una tarea como completada o no completada
   * @param taskId ID de la tarea
   * @param isCompleted Estado de completado
   * @returns Resultado de la operación
   */
  toggleTaskCompletion(taskId: string, isCompleted: boolean): Promise<TaskOperationResult>;
}

