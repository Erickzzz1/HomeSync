/**
 * IGroupNotificationRepository - Interfaz del Repository Pattern para Notificaciones de Grupos
 * 
 * Define el contrato para las operaciones de gestión de notificaciones de grupos familiares
 */

/**
 * Tipo de notificación de grupo
 */
export type GroupNotificationType = 'member_added' | 'member_removed' | 'member_left' | 'admin_assigned' | 'group_deleted';

/**
 * Notificación de grupo
 */
export interface GroupNotification {
  id: string;
  userId: string;
  groupId: string;
  groupName: string;
  type: GroupNotificationType;
  message: string;
  adminId: string;
  adminName: string;
  createdAt: string;
  read: boolean;
}

/**
 * Resultado de operaciones de notificaciones de grupos
 */
export interface GroupNotificationResult {
  success: boolean;
  notifications?: GroupNotification[];
  count?: number;
  error?: string;
  errorCode?: string;
}

/**
 * Interfaz del repositorio de notificaciones de grupos
 */
export interface IGroupNotificationRepository {
  /**
   * Obtiene todas las notificaciones de grupos del usuario
   * @returns Resultado con la lista de notificaciones
   */
  getMyGroupNotifications(): Promise<GroupNotificationResult>;

  /**
   * Marca una notificación como leída
   * @param notificationId ID de la notificación
   * @returns Resultado de la operación
   */
  markNotificationAsRead(notificationId: string): Promise<GroupNotificationResult>;

  /**
   * Marca todas las notificaciones del usuario como leídas
   * @returns Resultado de la operación
   */
  markAllNotificationsAsRead(): Promise<GroupNotificationResult>;

  /**
   * Elimina una notificación
   * @param notificationId ID de la notificación
   * @returns Resultado de la operación
   */
  deleteGroupNotification(notificationId: string): Promise<GroupNotificationResult>;
}

