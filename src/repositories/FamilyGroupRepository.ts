/**
 * FamilyGroupRepository - Implementación del Repository Pattern para Grupos Familiares
 * 
 * Implementa la interfaz IFamilyGroupRepository utilizando la API backend.
 */

import ApiService from '../services/ApiService';
import {
  IFamilyGroupRepository,
  FamilyGroupResult,
  FamilyGroup,
  FamilyGroupSummary
} from './interfaces/IFamilyGroupRepository';

// Interfaz para las respuestas de la API
interface ApiFamilyGroupResponse {
  success: boolean;
  group?: FamilyGroup;
  groups?: FamilyGroupSummary[];
  member?: any;
  message?: string;
  error?: string;
  errorCode?: string;
}

class FamilyGroupRepository implements IFamilyGroupRepository {
  /**
   * Crea un nuevo grupo familiar
   */
  async createFamilyGroup(name: string): Promise<FamilyGroupResult> {
    try {
      if (!name || !name.trim()) {
        return {
          success: false,
          error: 'El nombre del grupo es requerido',
          errorCode: 'NAME_REQUIRED'
        };
      }

      const response = await ApiService.post<ApiFamilyGroupResponse>('/api/family-groups', {
        name: name.trim()
      });

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Error al crear el grupo',
          errorCode: response.errorCode
        };
      }

      return {
        success: true,
        group: response.group
      };
    } catch (error: any) {
      console.error('Error al crear grupo familiar:', error);
      return {
        success: false,
        error: error.message || 'Error al crear el grupo familiar',
        errorCode: 'CREATE_GROUP_ERROR'
      };
    }
  }

  /**
   * Obtiene todos los grupos familiares del usuario
   */
  async getMyFamilyGroups(): Promise<FamilyGroupResult> {
    try {
      const response = await ApiService.get<ApiFamilyGroupResponse>('/api/family-groups');

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Error al obtener los grupos',
          errorCode: response.errorCode
        };
      }

      return {
        success: true,
        groups: response.groups || []
      };
    } catch (error: any) {
      console.error('Error al obtener grupos familiares:', error);
      return {
        success: false,
        error: error.message || 'Error al obtener los grupos familiares',
        errorCode: 'GET_GROUPS_ERROR'
      };
    }
  }

  /**
   * Obtiene los detalles de un grupo familiar específico
   */
  async getFamilyGroup(groupId: string): Promise<FamilyGroupResult> {
    try {
      if (!groupId) {
        return {
          success: false,
          error: 'ID del grupo es requerido',
          errorCode: 'GROUP_ID_REQUIRED'
        };
      }

      const response = await ApiService.get<ApiFamilyGroupResponse>(`/api/family-groups/${groupId}`);

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Error al obtener el grupo',
          errorCode: response.errorCode
        };
      }

      return {
        success: true,
        group: response.group
      };
    } catch (error: any) {
      console.error('Error al obtener grupo familiar:', error);
      return {
        success: false,
        error: error.message || 'Error al obtener el grupo familiar',
        errorCode: 'GET_GROUP_ERROR'
      };
    }
  }

  /**
   * Agrega un miembro a un grupo usando su shareCode
   */
  async addGroupMember(groupId: string, shareCode: string): Promise<FamilyGroupResult> {
    try {
      if (!groupId || !shareCode || shareCode.length !== 6) {
        return {
          success: false,
          error: 'ID del grupo y código de compartir son requeridos',
          errorCode: 'GROUP_ID_AND_SHARE_CODE_REQUIRED'
        };
      }

      const response = await ApiService.post<ApiFamilyGroupResponse>(`/api/family-groups/${groupId}/members`, {
        shareCode: shareCode.toUpperCase()
      });

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Error al agregar el miembro',
          errorCode: response.errorCode
        };
      }

      return {
        success: true,
        member: response.member
      };
    } catch (error: any) {
      console.error('Error al agregar miembro al grupo:', error);
      return {
        success: false,
        error: error.message || 'Error al agregar el miembro al grupo',
        errorCode: 'ADD_GROUP_MEMBER_ERROR'
      };
    }
  }

  /**
   * Elimina un miembro de un grupo
   */
  async removeGroupMember(groupId: string, memberId: string): Promise<FamilyGroupResult> {
    try {
      if (!groupId || !memberId) {
        return {
          success: false,
          error: 'ID del grupo y del miembro son requeridos',
          errorCode: 'GROUP_ID_AND_MEMBER_ID_REQUIRED'
        };
      }

      const token = await ApiService.getToken();
      const url = `${ApiService.baseUrl}/api/family-groups/${groupId}/members`;
      
      const fetchResponse = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ memberId })
      });

      const response = await fetchResponse.json() as ApiFamilyGroupResponse;

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Error al eliminar el miembro',
          errorCode: response.errorCode
        };
      }

      return {
        success: true
      };
    } catch (error: any) {
      console.error('Error al eliminar miembro del grupo:', error);
      return {
        success: false,
        error: error.message || 'Error al eliminar el miembro del grupo',
        errorCode: 'REMOVE_GROUP_MEMBER_ERROR'
      };
    }
  }

  /**
   * Actualiza el rol de un miembro en un grupo
   */
  async updateGroupMemberRole(groupId: string, memberId: string, role: 'admin' | 'member'): Promise<FamilyGroupResult> {
    try {
      if (!groupId || !memberId || !role) {
        return {
          success: false,
          error: 'ID del grupo, del miembro y rol son requeridos',
          errorCode: 'GROUP_ID_MEMBER_ID_AND_ROLE_REQUIRED'
        };
      }

      const response = await ApiService.put<ApiFamilyGroupResponse>(`/api/family-groups/${groupId}/members/role`, {
        memberId,
        role
      });

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Error al actualizar el rol',
          errorCode: response.errorCode
        };
      }

      return {
        success: true,
        message: response.message
      };
    } catch (error: any) {
      console.error('Error al actualizar rol en grupo:', error);
      return {
        success: false,
        error: error.message || 'Error al actualizar el rol',
        errorCode: 'UPDATE_GROUP_ROLE_ERROR'
      };
    }
  }

  /**
   * Permite a un usuario salir de un grupo familiar
   */
  async leaveFamilyGroup(groupId: string): Promise<FamilyGroupResult> {
    try {
      if (!groupId) {
        return {
          success: false,
          error: 'ID del grupo es requerido',
          errorCode: 'GROUP_ID_REQUIRED'
        };
      }

      const response = await ApiService.post<ApiFamilyGroupResponse>(`/api/family-groups/${groupId}/leave`, {});

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Error al abandonar el grupo',
          errorCode: response.errorCode
        };
      }

      return {
        success: true,
        message: response.message
      };
    } catch (error: any) {
      console.error('Error al abandonar grupo familiar:', error);
      return {
        success: false,
        error: error.message || 'Error al abandonar el grupo familiar',
        errorCode: 'LEAVE_GROUP_ERROR'
      };
    }
  }

  /**
   * Elimina un grupo familiar
   */
  async deleteFamilyGroup(groupId: string): Promise<FamilyGroupResult> {
    try {
      if (!groupId) {
        return {
          success: false,
          error: 'ID del grupo es requerido',
          errorCode: 'GROUP_ID_REQUIRED'
        };
      }

      const token = await ApiService.getToken();
      const url = `${ApiService.baseUrl}/api/family-groups/${groupId}`;
      
      const fetchResponse = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      const response = await fetchResponse.json() as ApiFamilyGroupResponse;

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Error al eliminar el grupo',
          errorCode: response.errorCode
        };
      }

      return {
        success: true,
        message: response.message
      };
    } catch (error: any) {
      console.error('Error al eliminar grupo familiar:', error);
      return {
        success: false,
        error: error.message || 'Error al eliminar el grupo familiar',
        errorCode: 'DELETE_GROUP_ERROR'
      };
    }
  }
}

export default FamilyGroupRepository;

