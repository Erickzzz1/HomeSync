/**
 * GroupNotificationRepository - Implementación del Repository Pattern para Notificaciones de Grupos
 * 
 * Implementa la interfaz IGroupNotificationRepository utilizando la API backend.
 */

import ApiService from '../services/ApiService';
import {
  IGroupNotificationRepository,
  GroupNotificationResult,
  GroupNotification
} from './interfaces/IGroupNotificationRepository';

// Interfaz para las respuestas de la API
interface ApiGroupNotificationResponse {
  success: boolean;
  notifications?: GroupNotification[];
  count?: number;
  error?: string;
  errorCode?: string;
}

class GroupNotificationRepository implements IGroupNotificationRepository {
  /**
   * Obtiene todas las notificaciones de grupos del usuario
   */
  async getMyGroupNotifications(): Promise<GroupNotificationResult> {
    try {
      const response = await ApiService.get<ApiGroupNotificationResponse>('/api/group-notifications');

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Error al obtener las notificaciones',
          errorCode: response.errorCode
        };
      }

      return {
        success: true,
        notifications: response.notifications || []
      };
    } catch (error: any) {
      console.error('Error al obtener notificaciones de grupos:', error);
      return {
        success: false,
        error: error.message || 'Error al obtener las notificaciones',
        errorCode: 'GET_NOTIFICATIONS_ERROR'
      };
    }
  }

  /**
   * Marca una notificación como leída
   */
  async markNotificationAsRead(notificationId: string): Promise<GroupNotificationResult> {
    try {
      if (!notificationId) {
        return {
          success: false,
          error: 'ID de la notificación es requerido',
          errorCode: 'NOTIFICATION_ID_REQUIRED'
        };
      }

      const response = await ApiService.put<ApiGroupNotificationResponse>(
        `/api/group-notifications/${notificationId}/read`,
        {}
      );

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Error al marcar la notificación como leída',
          errorCode: response.errorCode
        };
      }

      return {
        success: true
      };
    } catch (error: any) {
      console.error('Error al marcar notificación como leída:', error);
      return {
        success: false,
        error: error.message || 'Error al marcar la notificación como leída',
        errorCode: 'MARK_READ_ERROR'
      };
    }
  }

  /**
   * Marca todas las notificaciones del usuario como leídas
   */
  async markAllNotificationsAsRead(): Promise<GroupNotificationResult> {
    try {
      const response = await ApiService.put<ApiGroupNotificationResponse>(
        '/api/group-notifications/read-all',
        {}
      );

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Error al marcar las notificaciones como leídas',
          errorCode: response.errorCode
        };
      }

      return {
        success: true,
        count: response.count
      };
    } catch (error: any) {
      console.error('Error al marcar todas las notificaciones como leídas:', error);
      return {
        success: false,
        error: error.message || 'Error al marcar las notificaciones como leídas',
        errorCode: 'MARK_ALL_READ_ERROR'
      };
    }
  }

  /**
   * Elimina una notificación
   */
  async deleteGroupNotification(notificationId: string): Promise<GroupNotificationResult> {
    try {
      if (!notificationId) {
        return {
          success: false,
          error: 'ID de la notificación es requerido',
          errorCode: 'NOTIFICATION_ID_REQUIRED'
        };
      }

      const token = await ApiService.getToken();
      const url = `${ApiService.baseUrl}/api/group-notifications/${notificationId}`;
      
      const fetchResponse = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      const response = await fetchResponse.json() as ApiGroupNotificationResponse;

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Error al eliminar la notificación',
          errorCode: response.errorCode
        };
      }

      return {
        success: true
      };
    } catch (error: any) {
      console.error('Error al eliminar notificación:', error);
      return {
        success: false,
        error: error.message || 'Error al eliminar la notificación',
        errorCode: 'DELETE_NOTIFICATION_ERROR'
      };
    }
  }
}

export default GroupNotificationRepository;

