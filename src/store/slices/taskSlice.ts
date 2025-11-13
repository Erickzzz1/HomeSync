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
     */
    setTasks: (state, action: PayloadAction<TaskModel[]>) => {
      state.tasks = action.payload;
      state.error = null;
    },

    /**
     * Agrega una nueva tarea
     */
    addTask: (state, action: PayloadAction<TaskModel>) => {
      state.tasks.unshift(action.payload);
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


