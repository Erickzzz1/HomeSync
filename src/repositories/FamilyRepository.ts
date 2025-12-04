/**
 * FamilyRepository - Implementación del Repository Pattern para Familia
 * 
 * Implementa la interfaz IFamilyRepository utilizando la API backend.
 */

import ApiService from '../services/ApiService';
import {
  IFamilyRepository,
  FamilyResult,
  FamilyMember
} from './interfaces/IFamilyRepository';

// Interfaz para las respuestas de la API
interface ApiFamilyResponse {
  success: boolean;
  shareCode?: string;
  familyMembers?: FamilyMember[];
  member?: FamilyMember;
  error?: string;
  errorCode?: string;
}

class FamilyRepository implements IFamilyRepository {
  /**
   * Obtiene el shareCode del usuario actual
   */
  async getMyShareCode(): Promise<FamilyResult> {
    try {
      const response = await ApiService.get<ApiFamilyResponse>('/api/family/share-code');

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Error al obtener el código de compartir',
          errorCode: response.errorCode
        };
      }

      return {
        success: true,
        shareCode: response.shareCode
      };
    } catch (error: any) {
      console.error('Error al obtener shareCode:', error);
      return {
        success: false,
        error: error.message || 'Error al obtener el código de compartir',
        errorCode: 'GET_SHARE_CODE_ERROR'
      };
    }
  }

  /**
   * Obtiene la lista de familiares del usuario
   */
  async getFamilyMembers(): Promise<FamilyResult> {
    try {
      const response = await ApiService.get<ApiFamilyResponse>('/api/family/members');

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Error al obtener los familiares',
          errorCode: response.errorCode
        };
      }

      return {
        success: true,
        familyMembers: response.familyMembers || []
      };
    } catch (error: any) {
      console.error('Error al obtener familiares:', error);
      return {
        success: false,
        error: error.message || 'Error al obtener los familiares',
        errorCode: 'GET_FAMILY_MEMBERS_ERROR'
      };
    }
  }

  /**
   * Agrega un miembro a la familia usando su shareCode
   */
  async addFamilyMember(shareCode: string): Promise<FamilyResult> {
    try {
      if (!shareCode || shareCode.length !== 6) {
        return {
          success: false,
          error: 'El código de compartir debe tener 6 caracteres',
          errorCode: 'INVALID_SHARE_CODE'
        };
      }

      const response = await ApiService.post<ApiFamilyResponse>('/api/family/members', {
        shareCode: shareCode.toUpperCase()
      });

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Error al agregar el familiar',
          errorCode: response.errorCode
        };
      }

      return {
        success: true,
        member: response.member
      };
    } catch (error: any) {
      console.error('Error al agregar familiar:', error);
      return {
        success: false,
        error: error.message || 'Error al agregar el familiar',
        errorCode: 'ADD_FAMILY_MEMBER_ERROR'
      };
    }
  }

  /**
   * Actualiza el rol de un miembro de la familia (solo admins)
   */
  async updateMemberRole(memberId: string, role: 'admin' | 'member'): Promise<FamilyResult> {
    try {
      if (!memberId || !role) {
        return {
          success: false,
          error: 'ID del miembro y rol son requeridos',
          errorCode: 'MEMBER_ID_AND_ROLE_REQUIRED'
        };
      }

      if (!['admin', 'member'].includes(role)) {
        return {
          success: false,
          error: 'El rol debe ser "admin" o "member"',
          errorCode: 'INVALID_ROLE'
        };
      }

      const response = await ApiService.put<ApiFamilyResponse>('/api/family/members/role', {
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
        success: true
      };
    } catch (error: any) {
      console.error('Error al actualizar rol:', error);
      return {
        success: false,
        error: error.message || 'Error al actualizar el rol',
        errorCode: 'UPDATE_ROLE_ERROR'
      };
    }
  }

  /**
   * Elimina un miembro de la familia
   */
  async removeFamilyMember(memberId: string): Promise<FamilyResult> {
    try {
      if (!memberId) {
        return {
          success: false,
          error: 'ID del miembro es requerido',
          errorCode: 'MEMBER_ID_REQUIRED'
        };
      }

      // Para DELETE con body, necesitamos hacer una petición manual
      const token = await ApiService.getToken();
      const url = `${ApiService.baseUrl}/api/family/members`;
      
      const fetchResponse = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ memberId })
      });

      const response = await fetchResponse.json() as ApiFamilyResponse;

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Error al eliminar el familiar',
          errorCode: response.errorCode
        };
      }

      return {
        success: true
      };
    } catch (error: any) {
      console.error('Error al eliminar familiar:', error);
      return {
        success: false,
        error: error.message || 'Error al eliminar el familiar',
        errorCode: 'REMOVE_FAMILY_MEMBER_ERROR'
      };
    }
  }
}

export default FamilyRepository;

