/**
 * ConflictResolutionService - Servicio para manejar resolución de conflictos
 * 
 * Detecta y resuelve conflictos cuando múltiples usuarios modifican la misma tarea
 */

import { TaskModel, UpdateTaskData } from '../models/TaskModel';

export interface ConflictInfo {
  currentVersion: number;
  expectedVersion: number;
  lastModifiedBy: string;
  lastModifiedByName: string;
  serverTask: TaskModel;
  localTask: TaskModel;
  localChanges: UpdateTaskData;
}

export type ConflictResolution = 'useServer' | 'useLocal' | 'merge';

/**
 * Detecta si hay un conflicto comparando versiones
 */
export const detectConflict = (
  localVersion: number | undefined,
  serverVersion: number | undefined
): boolean => {
  const local = localVersion || 1;
  const server = serverVersion || 1;
  return local !== server;
};

/**
 * Crea información de conflicto para mostrar al usuario
 */
export const createConflictInfo = (
  serverTask: TaskModel,
  localTask: TaskModel,
  localChanges: UpdateTaskData,
  lastModifiedByName: string
): ConflictInfo => {
  return {
    currentVersion: serverTask.version || 1,
    expectedVersion: localTask.version || 1,
    lastModifiedBy: serverTask.lastModifiedBy || serverTask.createdBy,
    lastModifiedByName: lastModifiedByName,
    serverTask,
    localTask,
    localChanges
  };
};

/**
 * Resuelve un conflicto aplicando la resolución elegida
 */
export const resolveConflict = (
  conflict: ConflictInfo,
  resolution: ConflictResolution
): UpdateTaskData => {
  switch (resolution) {
    case 'useServer':
      // Usar la versión del servidor (descartar cambios locales)
      return {
        ...conflict.serverTask,
        version: conflict.serverTask.version
      };
    
    case 'useLocal':
      // Usar los cambios locales (sobrescribir servidor)
      return {
        ...conflict.localChanges,
        version: conflict.serverTask.version // Usar la versión del servidor para forzar actualización
      };
    
    case 'merge':
      // Combinar: usar cambios locales pero mantener campos no modificados del servidor
      return {
        ...conflict.serverTask,
        ...conflict.localChanges,
        version: conflict.serverTask.version
      };
    
    default:
      return conflict.localChanges;
  }
};

