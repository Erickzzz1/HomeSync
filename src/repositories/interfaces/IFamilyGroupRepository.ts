/**
 * IFamilyGroupRepository - Interfaz del Repository Pattern para Grupos Familiares
 * 
 * Define el contrato para las operaciones de gestión de grupos familiares
 */

/**
 * Miembro de un grupo familiar
 */
export interface FamilyGroupMember {
  uid: string;
  email: string | null;
  displayName: string | null;
  shareCode: string;
  role?: 'admin' | 'member';
}

/**
 * Grupo familiar
 */
export interface FamilyGroup {
  id: string;
  name: string;
  shareCode: string;
  members: FamilyGroupMember[];
  roles?: { [userId: string]: 'admin' | 'member' };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Grupo familiar resumido (para listas)
 */
export interface FamilyGroupSummary {
  id: string;
  name: string;
  shareCode: string;
  membersCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Resultado de operaciones de grupos familiares
 */
export interface FamilyGroupResult {
  success: boolean;
  group?: FamilyGroup;
  groups?: FamilyGroupSummary[];
  member?: FamilyGroupMember;
  message?: string;
  error?: string;
  errorCode?: string;
}

/**
 * Interfaz del repositorio de grupos familiares
 */
export interface IFamilyGroupRepository {
  /**
   * Crea un nuevo grupo familiar
   * @param name Nombre del grupo
   * @returns Resultado con el grupo creado
   */
  createFamilyGroup(name: string): Promise<FamilyGroupResult>;

  /**
   * Obtiene todos los grupos familiares del usuario
   * @returns Resultado con la lista de grupos
   */
  getMyFamilyGroups(): Promise<FamilyGroupResult>;

  /**
   * Obtiene los detalles de un grupo familiar específico
   * @param groupId ID del grupo
   * @returns Resultado con el grupo y sus miembros
   */
  getFamilyGroup(groupId: string): Promise<FamilyGroupResult>;

  /**
   * Agrega un miembro a un grupo usando su shareCode
   * @param groupId ID del grupo
   * @param shareCode Código de compartir del miembro
   * @returns Resultado de la operación
   */
  addGroupMember(groupId: string, shareCode: string): Promise<FamilyGroupResult>;

  /**
   * Elimina un miembro de un grupo
   * @param groupId ID del grupo
   * @param memberId ID del miembro a eliminar
   * @returns Resultado de la operación
   */
  removeGroupMember(groupId: string, memberId: string): Promise<FamilyGroupResult>;

  /**
   * Actualiza el rol de un miembro en un grupo (solo admins)
   * @param groupId ID del grupo
   * @param memberId ID del miembro
   * @param role Nuevo rol ('admin' o 'member')
   * @returns Resultado de la operación
   */
  updateGroupMemberRole(groupId: string, memberId: string, role: 'admin' | 'member'): Promise<FamilyGroupResult>;

  /**
   * Permite a un usuario salir de un grupo familiar
   * @param groupId ID del grupo
   * @returns Resultado de la operación
   */
  leaveFamilyGroup(groupId: string): Promise<FamilyGroupResult>;

  /**
   * Elimina un grupo familiar (solo creador o admin)
   * @param groupId ID del grupo
   * @returns Resultado de la operación
   */
  deleteFamilyGroup(groupId: string): Promise<FamilyGroupResult>;
}

