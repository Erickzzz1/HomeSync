/**
 * ReminderService - Servicio para gestionar recordatorios locales programados
 * 
 * Programa notificaciones locales basadas en reminderTime y dueDate de las tareas.
 * Solo funciona en plataformas móviles (iOS/Android), no en web.
 */

import { Platform } from 'react-native';
import { TaskModel } from '../models/TaskModel';

// Importar expo-notifications solo en plataformas móviles
let Notifications: any = null;
if (Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications');
  } catch (error) {
    console.warn('expo-notifications no está disponible:', error);
  }
}

/**
 * Calcula la fecha y hora para programar el recordatorio
 * @param dueDate Fecha de vencimiento de la tarea (ISO string)
 * @param reminderTime Hora del recordatorio (formato HH:MM)
 * @returns Date con la fecha y hora del recordatorio, o null si es inválido
 */
function calculateReminderDate(dueDate: string, reminderTime?: string): Date | null {
  if (!dueDate) return null;

  try {
    const dueDateObj = new Date(dueDate);
    if (isNaN(dueDateObj.getTime())) return null;

    // Si no hay reminderTime, programar para las 9:00 AM del día de vencimiento
    let hours = 9;
    let minutes = 0;

    if (reminderTime) {
      const [h, m] = reminderTime.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m) && h >= 0 && h < 24 && m >= 0 && m < 60) {
        hours = h;
        minutes = m;
      }
    }

    // Crear fecha del recordatorio
    const reminderDate = new Date(dueDateObj);
    reminderDate.setHours(hours, minutes, 0, 0);

    // Si el recordatorio es en el pasado, no programarlo
    if (reminderDate < new Date()) {
      return null;
    }

    return reminderDate;
  } catch (error) {
    console.error('Error al calcular fecha de recordatorio:', error);
    return null;
  }
}

/**
 * Genera un ID único para la notificación basado en el ID de la tarea
 * Expo requiere que el ID sea un string numérico o un string válido
 */
function getNotificationId(taskId: string): string {
  // Convertir el ID de la tarea a un formato numérico si es posible
  // o usar un hash simple del string
  const hash = taskId.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);
  return Math.abs(hash).toString();
}

/**
 * Programa un recordatorio local para una tarea
 * @param task Tarea para la cual programar el recordatorio
 * @returns true si se programó correctamente, false en caso contrario
 */
export async function scheduleTaskReminder(task: TaskModel): Promise<boolean> {
  // No hacer nada en web
  if (Platform.OS === 'web' || !Notifications) {
    return false;
  }

  // No programar recordatorios para tareas completadas
  if (task.isCompleted) {
    return false;
  }

  // No programar si no hay reminderTime y la fecha ya pasó
  if (!task.reminderTime) {
    const dueDate = new Date(task.dueDate);
    if (dueDate < new Date()) {
      return false;
    }
  }

  try {
    // Solicitar permisos si no los tenemos
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== 'granted') {
        console.warn('Permisos de notificación no otorgados para recordatorios');
        return false;
      }
    }

    // Calcular fecha del recordatorio
    const reminderDate = calculateReminderDate(task.dueDate, task.reminderTime);
    if (!reminderDate) {
      return false;
    }

    // Cancelar recordatorio anterior si existe
    await cancelTaskReminder(task.id);

    // Crear contenido de la notificación
    const notificationContent = {
      title: `📋 Recordatorio: ${task.title}`,
      body: task.description || `Tarea vence el ${new Date(task.dueDate).toLocaleDateString('es-ES')}`,
      data: {
        taskId: task.id,
        type: 'task_reminder',
        dueDate: task.dueDate,
        priority: task.priority
      },
      sound: true,
      priority: task.priority === 'Alta' ? 'high' : 'default',
    };

    // Programar la notificación con ID único
    const notificationId = getNotificationId(task.id);
    await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger: {
        date: reminderDate,
      },
      identifier: notificationId,
    });

    console.log(`Recordatorio programado para tarea ${task.id} en ${reminderDate.toISOString()}`);
    return true;
  } catch (error) {
    console.error('Error al programar recordatorio:', error);
    return false;
  }
}

/**
 * Cancela el recordatorio de una tarea
 * @param taskId ID de la tarea
 */
export async function cancelTaskReminder(taskId: string): Promise<void> {
  if (Platform.OS === 'web' || !Notifications) {
    return;
  }

  try {
    const notificationId = getNotificationId(taskId);
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log(`Recordatorio cancelado para tarea ${taskId}`);
  } catch (error) {
    console.error('Error al cancelar recordatorio:', error);
  }
}

/**
 * Programa recordatorios para múltiples tareas
 * @param tasks Lista de tareas
 */
export async function scheduleMultipleReminders(tasks: TaskModel[]): Promise<void> {
  if (Platform.OS === 'web' || !Notifications) {
    return;
  }

  // Programar recordatorios solo para tareas pendientes con fecha futura
  const pendingTasks = tasks.filter(task => !task.isCompleted);
  
  for (const task of pendingTasks) {
    await scheduleTaskReminder(task);
  }
}

/**
 * Cancela todos los recordatorios programados
 */
export async function cancelAllReminders(): Promise<void> {
  if (Platform.OS === 'web' || !Notifications) {
    return;
  }

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('Todos los recordatorios cancelados');
  } catch (error) {
    console.error('Error al cancelar todos los recordatorios:', error);
  }
}

/**
 * Obtiene todas las notificaciones programadas
 * @returns Lista de notificaciones programadas
 */
export async function getScheduledNotifications(): Promise<any[]> {
  if (Platform.OS === 'web' || !Notifications) {
    return [];
  }

  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    return notifications;
  } catch (error) {
    console.error('Error al obtener notificaciones programadas:', error);
    return [];
  }
}

/**
 * Sincroniza los recordatorios con las tareas actuales
 * Cancela recordatorios de tareas completadas o eliminadas
 * Programa recordatorios para tareas nuevas o actualizadas
 * @param tasks Lista actual de tareas
 * @param previousTaskIds Lista de IDs de tareas anteriores (opcional)
 */
export async function syncReminders(
  tasks: TaskModel[],
  previousTaskIds?: string[]
): Promise<void> {
  if (Platform.OS === 'web' || !Notifications) {
    return;
  }

  try {
    // Obtener todas las notificaciones programadas
    const scheduledNotifications = await getScheduledNotifications();
    const currentTaskIds = new Set(tasks.map(t => t.id));

    // Cancelar recordatorios de tareas que ya no existen o están completadas
    for (const notification of scheduledNotifications) {
      const taskId = notification.content?.data?.taskId;
      if (taskId) {
        const task = tasks.find(t => t.id === taskId);
        if (!task || task.isCompleted) {
          await cancelTaskReminder(taskId);
        }
      }
    }

    // Programar recordatorios para tareas nuevas o actualizadas
    for (const task of tasks) {
      if (!task.isCompleted) {
        await scheduleTaskReminder(task);
      }
    }
  } catch (error) {
    console.error('Error al sincronizar recordatorios:', error);
  }
}

