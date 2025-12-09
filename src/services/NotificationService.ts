/**
 * NotificationService - Servicio para gestionar notificaciones push
 * 
 * Maneja el registro de tokens de notificación y la configuración
 * de permisos para notificaciones push usando expo-notifications.
 * 
 * NOTA: Solo funciona en plataformas móviles (iOS/Android), no en web.
 */

import { Platform } from 'react-native';
import ApiService from './ApiService';

// Importar expo-notifications solo en plataformas móviles
let Notifications: any = null;
if (Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications');
    // Configurar cómo se manejan las notificaciones cuando la app está en primer plano
    // Compatibilidad con diferentes versiones de expo-notifications
    if (Notifications.setNotificationHandler) {
      try {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        });
      } catch (error) {
        console.warn('Error al configurar notification handler:', error);
      }
    }
  } catch (error) {
    console.warn('expo-notifications no está disponible:', error);
  }
}

/**
 * Solicita permisos de notificación
 * Solo funciona en plataformas móviles
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  // No hacer nada en web
  if (Platform.OS === 'web' || !Notifications) {
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.warn('Permisos de notificación no otorgados');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error al solicitar permisos de notificación:', error);
    return false;
  }
}

/**
 * Obtiene el token de notificación del dispositivo
 * Solo funciona en plataformas móviles
 */
export async function getNotificationToken(): Promise<string | null> {
  // No hacer nada en web
  if (Platform.OS === 'web' || !Notifications) {
    return null;
  }

  try {
    // Verificar permisos primero
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return null;
    }

    // Obtener token para móvil (iOS/Android)
    // En expo-notifications 0.20.1, getExpoPushTokenAsync puede retornar directamente el string
    // o un objeto dependiendo de la versión
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID || undefined,
      });
      // Compatibilidad con diferentes versiones de la API
      return typeof tokenData === 'string' ? tokenData : tokenData?.data || tokenData;
    } catch (error) {
      // Si falla con projectId, intentar sin él (versiones más antiguas)
      const tokenData = await Notifications.getExpoPushTokenAsync();
      return typeof tokenData === 'string' ? tokenData : tokenData?.data || tokenData;
    }
  } catch (error) {
    console.error('Error al obtener token de notificación:', error);
    return null;
  }
}

/**
 * Registra el token de notificación en el backend
 */
export async function registerNotificationToken(token: string): Promise<boolean> {
  try {
    const response = await ApiService.post<{ success?: boolean }>('/api/notifications/register', {
      token,
      platform: Platform.OS,
    });

    return response?.success === true;
  } catch (error) {
    console.error('Error al registrar token de notificación:', error);
    return false;
  }
}

/**
 * Inicializa el servicio de notificaciones
 * Debe llamarse cuando el usuario inicia sesión
 */
export async function initializeNotifications(): Promise<void> {
  try {
    const token = await getNotificationToken();
    if (token) {
      await registerNotificationToken(token);
      console.log('Token de notificación registrado');
    }
  } catch (error) {
    console.error('Error al inicializar notificaciones:', error);
  }
}

/**
 * Configura listeners para notificaciones
 * Solo funciona en plataformas móviles
 */
export function setupNotificationListeners(
  onNotificationReceived?: (notification: any) => void,
  onNotificationTapped?: (response: any) => void
) {
  // No hacer nada en web
  if (Platform.OS === 'web' || !Notifications) {
    // Retornar función de limpieza vacía
    return () => {};
  }

  try {
    // Listener para notificaciones recibidas mientras la app está en primer plano
    const receivedListener = Notifications.addNotificationReceivedListener((notification: any) => {
      if (onNotificationReceived) {
        onNotificationReceived(notification);
      }
    });

    // Listener para cuando el usuario toca una notificación
    const responseListener = Notifications.addNotificationResponseReceivedListener((response: any) => {
      if (onNotificationTapped) {
        onNotificationTapped(response);
      }
    });

    // Retornar función para limpiar listeners
    // Compatibilidad con diferentes versiones de expo-notifications
    return () => {
      try {
        if (receivedListener && typeof receivedListener.remove === 'function') {
          receivedListener.remove();
        } else if (Notifications.removeNotificationSubscription) {
          Notifications.removeNotificationSubscription(receivedListener);
        }
        if (responseListener && typeof responseListener.remove === 'function') {
          responseListener.remove();
        } else if (Notifications.removeNotificationSubscription) {
          Notifications.removeNotificationSubscription(responseListener);
        }
      } catch (error) {
        console.warn('Error al remover listeners de notificación:', error);
      }
    };
  } catch (error) {
    console.error('Error al configurar listeners de notificación:', error);
    return () => {};
  }
}

