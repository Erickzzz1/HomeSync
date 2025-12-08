/**
 * ApiService - Servicio para comunicarse con la API backend
 * 
 * Maneja todas las peticiones HTTP a la API, incluyendo
 * gestión de tokens y manejo de errores.
 * 
 * Seguridad: 
 * - Usa expo-secure-store en dispositivos móviles (iOS/Android)
 * - Usa localStorage en web (expo-secure-store no es compatible con web)
 */

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@env';

const TOKEN_KEY = 'homesync_auth_token';
const isWeb = Platform.OS === 'web';

class ApiService {
  public baseUrl: string;

  constructor() {
    // Usar la URL de la API desde variables de entorno o localhost por defecto
    this.baseUrl = API_BASE_URL || 'http://localhost:3000';
  }

  /**
   * Obtiene el token de autenticación almacenado
   * Usa SecureStore en móvil y localStorage en web
   */
  async getToken(): Promise<string | null> {
    try {
      if (isWeb) {
        // En web, usar localStorage
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(TOKEN_KEY);
        }
        return null;
      } else {
        // En móvil, usar SecureStore
        return await SecureStore.getItemAsync(TOKEN_KEY);
      }
    } catch (error) {
      // console.error('Error al obtener token:', error);
      return null;
    }
  }

  /**
   * Guarda el token de autenticación
   * Usa SecureStore en móvil y localStorage en web
   */
  async saveToken(token: string): Promise<void> {
    try {
      if (isWeb) {
        // En web, usar localStorage
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(TOKEN_KEY, token);
        }
      } else {
        // En móvil, usar SecureStore
        await SecureStore.setItemAsync(TOKEN_KEY, token);
      }
    } catch (error) {
      // console.error('Error al guardar token:', error);
    }
  }

  /**
   * Elimina el token de autenticación
   * Usa SecureStore en móvil y localStorage en web
   */
  async removeToken(): Promise<void> {
    try {
      if (isWeb) {
        // En web, usar localStorage
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(TOKEN_KEY);
        }
      } else {
        // En móvil, usar SecureStore
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
    } catch (error) {
      console.error('Error al eliminar token:', error);
    }
  }

  /**
   * Realiza una petición HTTP con autenticación automática
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getToken();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      // Si la respuesta no es exitosa, retornar los datos para que el repositorio maneje el error
      // Esto permite manejar códigos de estado específicos como 409 (conflicto)
      if (!response.ok) {
        // Para errores 409 (conflicto), retornar los datos en lugar de lanzar error
        if (response.status === 409) {
          return data;
        }
        // Para errores 401 (no autorizado), crear error con código para que sea manejado silenciosamente
        if (response.status === 401) {
          const error = new Error(data.error || data.message || 'No autorizado');
          (error as any).response = data;
          (error as any).status = 401;
          (error as any).errorCode = 'UNAUTHORIZED';
          throw error;
        }
        const errorMessage = data.error || data.message || 'Error en la petición';
        const error = new Error(errorMessage);
        // Agregar información adicional al error
        (error as any).response = data;
        (error as any).status = response.status;
        throw error;
      }

      return data;
    } catch (error) {
      // console.error(`Error en petición ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'GET',
    });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options?: { body?: string }): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      body: options?.body
    });
  }
}

export default new ApiService();
