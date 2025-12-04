/**
 * taskSlice - Redux Toolkit Slice para Tareas
 * 
 * Maneja el estado global de tareas en la aplicación
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TaskModel } from '../../models/TaskModel';

/**
 * Estado de tareas en Redux
 */
interface TaskState {
  tasks: TaskModel[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Estado inicial
 */
const initialState: TaskState = {
  tasks: [],
  isLoading: false,
  error: null
};

/**
 * Slice de tareas
 */
const taskSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    /**
     * Establece la lista de tareas
     * Deduplica por ID para evitar duplicados
     */
    setTasks: (state, action: PayloadAction<TaskModel[]>) => {
      // Usar Map para deduplicar por ID
      const tasksMap = new Map<string, TaskModel>();
      
      // Agregar tareas existentes primero (para mantener orden si es necesario)
      state.tasks.forEach(task => {
        if (!tasksMap.has(task.id)) {
          tasksMap.set(task.id, task);
        }
      });
      
      // Agregar nuevas tareas (sobrescribirán duplicados)
      action.payload.forEach(task => {
        tasksMap.set(task.id, task);
      });
      
      // Convertir Map a Array
      state.tasks = Array.from(tasksMap.values());
      state.error = null;
    },

    /**
     * Agrega una nueva tarea
     * Verifica que no exista antes de agregar
     */
    addTask: (state, action: PayloadAction<TaskModel>) => {
      // Solo agregar si no existe
      const exists = state.tasks.some(task => task.id === action.payload.id);
      if (!exists) {
        state.tasks.unshift(action.payload);
      } else {
        // Si existe, actualizarla en lugar de duplicarla
        const index = state.tasks.findIndex(task => task.id === action.payload.id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }
      }
      state.error = null;
    },

    /**
     * Actualiza una tarea existente
     */
    updateTask: (state, action: PayloadAction<TaskModel>) => {
      const index = state.tasks.findIndex(task => task.id === action.payload.id);
      if (index !== -1) {
        state.tasks[index] = action.payload;
      }
      state.error = null;
    },

    /**
     * Elimina una tarea
     */
    removeTask: (state, action: PayloadAction<string>) => {
      state.tasks = state.tasks.filter(task => task.id !== action.payload);
      state.error = null;
    },

    /**
     * Establece el estado de carga
     */
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    /**
     * Establece un error
     */
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
    },

    /**
     * Limpia el error actual
     */
    clearError: (state) => {
      state.error = null;
    },

    /**
     * Limpia todas las tareas (al cerrar sesión)
     */
    clearTasks: (state) => {
      state.tasks = [];
      state.isLoading = false;
      state.error = null;
    }
  }
});

// Exportar acciones
export const {
  setTasks,
  addTask,
  updateTask,
  removeTask,
  setLoading,
  setError,
  clearError,
  clearTasks
} = taskSlice.actions;

// Exportar reducer
export default taskSlice.reducer;


