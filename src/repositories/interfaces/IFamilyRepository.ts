/**
 * IFamilyRepository - Interfaz del Repository Pattern para Familia
 * 
 * Define el contrato para las operaciones de gestión de familiares
 */

/**
 * Miembro de la familia
 */
export interface FamilyMember {
  uid: string;
  email: string | null;
  displayName: string | null;
  shareCode: string;
  role?: 'admin' | 'member';
}

/**
 * Resultado de operaciones de familia
 */
export interface FamilyResult {
  success: boolean;
  shareCode?: string;
  familyMembers?: FamilyMember[];
  member?: FamilyMember;
  error?: string;
  errorCode?: string;
}

/**
 * Interfaz del repositorio de familia
 */
export interface IFamilyRepository {
  /**
   * Obtiene el shareCode del usuario actual
   * @returns Resultado con el shareCode
   */
  getMyShareCode(): Promise<FamilyResult>;

  /**
   * Obtiene la lista de familiares del usuario
   * @returns Resultado con la lista de familiares
   */
  getFamilyMembers(): Promise<FamilyResult>;

  /**
   * Agrega un miembro a la familia usando su shareCode
   * @param shareCode Código de compartir del miembro
   * @returns Resultado de la operación
   */
  addFamilyMember(shareCode: string): Promise<FamilyResult>;

  /**
   * Elimina un miembro de la familia
   * @param memberId ID del miembro a eliminar
   * @returns Resultado de la operación
   */
  removeFamilyMember(memberId: string): Promise<FamilyResult>;

  /**
   * Actualiza el rol de un miembro de la familia (solo admins)
   * @param memberId ID del miembro
   * @param role Nuevo rol ('admin' o 'member')
   * @returns Resultado de la operación
   */
  updateMemberRole(memberId: string, role: 'admin' | 'member'): Promise<FamilyResult>;
}

