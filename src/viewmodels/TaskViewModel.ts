/**
 * TaskViewModel - Capa de lógica de presentación (MVVM) para Tareas
 * 
 * Gestiona la lógica de tareas y actúa como intermediario
 * entre las vistas y el repositorio.
 * 
 * Responsabilidades:
 * - Validación adicional de entrada desde la UI
 * - Coordinación de operaciones CRUD
 * - Gestión de estados de carga y errores
 * - Transformación de datos para la presentación
 */

import TaskRepository from '../repositories/TaskRepository';
import {
  TaskModel,
  CreateTaskData,
  UpdateTaskData,
  TaskPriority
} from '../models/TaskModel';
import { TaskOperationResult } from '../repositories/interfaces/ITaskRepository';

/**
 * Estados posibles de una operación con tareas
 */
export enum TaskStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

/**
 * Estado del ViewModel de tareas
 */
export interface TaskState {
  status: TaskStatus;
  tasks: TaskModel[];
  currentTask: TaskModel | null;
  error: string | null;
  isLoading: boolean;
}

/**
 * Errores de validación del formulario de tarea
 */
export interface TaskValidationErrors {
  title?: string;
  description?: string;
  assignedTo?: string;
  dueDate?: string;
  priority?: string;
}

class TaskViewModel {
  private taskRepository: TaskRepository;
  private state: TaskState;
  private listeners: Set<(state: TaskState) => void>;

  constructor() {
    this.taskRepository = new TaskRepository();
    this.state = {
      status: TaskStatus.IDLE,
      tasks: [],
      currentTask: null,
      error: null,
      isLoading: false
    };
    this.listeners = new Set();
  }

  /**
   * Crea una nueva tarea
   * Aplica validaciones antes de proceder
   * 
   * @param title Título de la tarea
   * @param description Descripción
   * @param assignedTo Miembro asignado
   * @param dueDate Fecha de vencimiento
   * @param priority Prioridad
   * @param createdBy ID del creador
   * @returns Resultado de la operación
   */
  async createTask(
    title: string,
    description: string,
    assignedTo: string,
    dueDate: string,
    priority: TaskPriority,
    createdBy: string,
    reminderTime?: string
  ): Promise<TaskOperationResult> {
    // Validar campos antes de proceder
    const validationErrors = this.validateTaskForm(
      title,
      description,
      assignedTo,
      dueDate,
      priority
    );

    if (Object.keys(validationErrors).length > 0) {
      const errorMessage = Object.values(validationErrors)[0];
      this.updateState({
        status: TaskStatus.ERROR,
        error: errorMessage
      });
      return {
        success: false,
        error: errorMessage,
        errorCode: 'VALIDATION_ERROR'
      };
    }

    // Actualizar estado a LOADING
    this.updateState({
      status: TaskStatus.LOADING,
      isLoading: true,
      error: null
    });

    // Preparar datos
    const taskData: CreateTaskData = {
      title: title.trim(),
      description: description.trim() || '', // Descripción opcional
      assignedTo: assignedTo.trim(),
      dueDate,
      priority,
      createdBy,
      reminderTime: reminderTime || undefined // Hora del recordatorio opcional
    };

    // Ejecutar creación
    const result = await this.taskRepository.createTask(taskData);

    // Actualizar estado según resultado
    if (result.success && result.task) {
      this.updateState({
        status: TaskStatus.SUCCESS,
        tasks: [result.task, ...this.state.tasks],
        error: null,
        isLoading: false
      });
    } else {
      this.updateState({
        status: TaskStatus.ERROR,
        error: result.error || 'Error al crear tarea',
        isLoading: false
      });
    }

    return result;
  }

  /**
   * Obtiene todas las tareas del usuario
   * 
   * @param userId ID del usuario
   * @returns Resultado de la operación
   */
  async loadTasks(userId: string): Promise<TaskOperationResult> {
    this.updateState({
      status: TaskStatus.LOADING,
      isLoading: true,
      error: null
    });

    const result = await this.taskRepository.getTasks(userId);

    if (result.success && result.tasks) {
      this.updateState({
        status: TaskStatus.SUCCESS,
        tasks: result.tasks,
        error: null,
        isLoading: false
      });
    } else {
      this.updateState({
        status: TaskStatus.ERROR,
        error: result.error || 'Error al cargar tareas',
        isLoading: false
      });
    }

    return result;
  }

  /**
   * Actualiza una tarea existente
   * 
   * @param taskId ID de la tarea
   * @param data Datos a actualizar
   * @returns Resultado de la operación
   */
  async updateTask(taskId: string, data: UpdateTaskData): Promise<TaskOperationResult> {
    this.updateState({
      status: TaskStatus.LOADING,
      isLoading: true,
      error: null
    });

    const result = await this.taskRepository.updateTask(taskId, data);

    if (result.success && result.task) {
      // Actualizar la tarea en la lista local
      const updatedTasks = this.state.tasks.map(task =>
        task.id === taskId ? result.task! : task
      );

      this.updateState({
        status: TaskStatus.SUCCESS,
        tasks: updatedTasks,
        error: null,
        isLoading: false
      });
    } else {
      this.updateState({
        status: TaskStatus.ERROR,
        error: result.error || 'Error al actualizar tarea',
        isLoading: false
      });
    }

    return result;
  }

  /**
   * Elimina una tarea
   * 
   * @param taskId ID de la tarea
   * @returns Resultado de la operación
   */
  async deleteTask(taskId: string): Promise<TaskOperationResult> {
    this.updateState({
      status: TaskStatus.LOADING,
      isLoading: true,
      error: null
    });

    const result = await this.taskRepository.deleteTask(taskId);

    if (result.success) {
      // Remover la tarea de la lista local
      const filteredTasks = this.state.tasks.filter(task => task.id !== taskId);

      this.updateState({
        status: TaskStatus.SUCCESS,
        tasks: filteredTasks,
        error: null,
        isLoading: false
      });
    } else {
      this.updateState({
        status: TaskStatus.ERROR,
        error: result.error || 'Error al eliminar tarea',
        isLoading: false
      });
    }

    return result;
  }

  /**
   * Cambia el estado de completado de una tarea
   * 
   * @param taskId ID de la tarea
   * @param isCompleted Nuevo estado
   * @returns Resultado de la operación
   */
  async toggleTaskCompletion(taskId: string, isCompleted: boolean): Promise<TaskOperationResult> {
    return await this.updateTask(taskId, { isCompleted });
  }

  /**
   * Valida el formulario de tarea
   * Principio de Seguridad: Validación exhaustiva de entrada
   * 
   * @returns Objeto con errores de validación
   */
  validateTaskForm(
    title: string,
    description: string,
    assignedTo: string,
    dueDate: string,
    priority: TaskPriority
  ): TaskValidationErrors {
    const errors: TaskValidationErrors = {};

    // Validar título
    if (!title || !title.trim()) {
      errors.title = 'El título es requerido';
    } else if (title.trim().length < 3) {
      errors.title = 'El título debe tener al menos 3 caracteres';
    } else if (title.length > 100) {
      errors.title = 'El título no puede exceder 100 caracteres';
    } else {
      // Validar que el título no sea solo números
      const titleWithoutSpaces = title.trim().replace(/\s/g, '');
      if (/^\d+$/.test(titleWithoutSpaces)) {
        errors.title = 'El título no puede contener solo números';
      }
    }

    // Validar descripción (opcional)
    if (description && description.trim()) {
      if (description.trim().length < 5) {
        errors.description = 'La descripción debe tener al menos 5 caracteres';
      } else if (description.length > 500) {
        errors.description = 'La descripción no puede exceder 500 caracteres';
      }
    }
    // Si está vacía, está bien (es opcional)

    // Validar asignado (ahora es un UID, no un nombre)
    if (!assignedTo || !assignedTo.trim()) {
      errors.assignedTo = 'Debe asignar la tarea';
    }
    // Ya no validamos formato de nombre porque ahora es un UID

    // Validar fecha
    if (!dueDate) {
      errors.dueDate = 'La fecha de vencimiento es requerida';
    } else {
      const selectedDate = new Date(dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (isNaN(selectedDate.getTime())) {
        errors.dueDate = 'La fecha no es válida';
      } else if (selectedDate < today) {
        errors.dueDate = 'La fecha no puede ser anterior a hoy';
      }
    }

    // Validar prioridad
    const validPriorities: TaskPriority[] = ['Alta', 'Media', 'Baja'];
    if (!priority || !validPriorities.includes(priority)) {
      errors.priority = 'Selecciona una prioridad válida';
    }

    return errors;
  }

  /**
   * Filtra tareas por estado de completado
   * 
   * @param isCompleted Filtro de completado
   * @returns Tareas filtradas
   */
  getFilteredTasks(isCompleted?: boolean): TaskModel[] {
    if (isCompleted === undefined) {
      return this.state.tasks;
    }
    return this.state.tasks.filter(task => task.isCompleted === isCompleted);
  }

  /**
   * Obtiene tareas por prioridad
   * 
   * @param priority Prioridad a filtrar
   * @returns Tareas con esa prioridad
   */
  getTasksByPriority(priority: TaskPriority): TaskModel[] {
    return this.state.tasks.filter(task => task.priority === priority);
  }

  /**
   * Obtiene estadísticas de tareas
   * 
   * @returns Objeto con estadísticas
   */
  getTaskStats() {
    const total = this.state.tasks.length;
    const completed = this.state.tasks.filter(t => t.isCompleted).length;
    const pending = total - completed;
    const highPriority = this.state.tasks.filter(t => t.priority === 'Alta' && !t.isCompleted).length;

    return {
      total,
      completed,
      pending,
      highPriority,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }

  /**
   * Obtiene el estado actual
   */
  getState(): TaskState {
    return { ...this.state };
  }

  /**
   * Suscribe un listener a cambios de estado
   * 
   * @param listener Función a ejecutar cuando cambia el estado
   * @returns Función para cancelar la suscripción
   */
  subscribe(listener: (state: TaskState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Actualiza el estado y notifica a los listeners
   */
  private updateState(partialState: Partial<TaskState>): void {
    this.state = { ...this.state, ...partialState };
    this.listeners.forEach(listener => listener(this.state));
  }

  /**
   * Limpia el error actual
   */
  clearError(): void {
    this.updateState({ error: null, status: TaskStatus.IDLE });
  }
}

export default TaskViewModel;

