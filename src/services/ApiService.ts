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
    
    // Advertencia si estamos en producción y usando localhost
    if (__DEV__) {
      console.log('[ApiService] Base URL configurada:', this.baseUrl);
    } else {
      // En producción, verificar que no esté usando localhost
      if (this.baseUrl.includes('localhost') || this.baseUrl.includes('127.0.0.1')) {
        console.error('[ApiService] ADVERTENCIA: La URL de la API está configurada como localhost. Esto no funcionará en dispositivos móviles reales.');
        console.error('[ApiService] Configura API_BASE_URL con la IP de tu servidor o una URL pública.');
      }
    }
  }

  /**
   * Obtiene el token de autenticación almacenado
   * Usa SecureStore en móvil y localStorage en web
   */
  async getToken(): Promise<string | null> {
    try {
      let token: string | null = null;
      if (isWeb) {
        // En web, usar localStorage
        if (typeof window !== 'undefined' && window.localStorage) {
          token = window.localStorage.getItem(TOKEN_KEY);
        }
      } else {
        // En móvil, usar SecureStore
        token = await SecureStore.getItemAsync(TOKEN_KEY);
      }
      
      if (token) {
        console.log('[ApiService] Token encontrado:', token.substring(0, 20) + '...');
      } else {
        console.warn('[ApiService] No se encontró token de autenticación');
      }
      
      return token;
    } catch (error) {
      console.error('[ApiService] Error al obtener token:', error);
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
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${this.baseUrl}${endpoint}`;
    
    console.log(`[ApiService] ${options.method || 'GET'} ${url}`);
    console.log(`[ApiService] Headers:`, headers);
    
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      console.log(`[ApiService] Response status: ${response.status}`);
      
      // Verificar si la respuesta tiene contenido
      const contentType = response.headers.get('content-type');
      let data: any;
      
      if (contentType && contentType.includes('application/json')) {
        try {
          const text = await response.text();
          console.log(`[ApiService] Response text:`, text);
          data = JSON.parse(text);
        } catch (parseError) {
          console.error(`[ApiService] Error al parsear JSON:`, parseError);
          throw new Error(`Error al procesar la respuesta del servidor: ${parseError}`);
        }
      } else {
        const text = await response.text();
        console.log(`[ApiService] Response text (no JSON):`, text);
        data = { error: text || 'Respuesta inesperada del servidor' };
      }
      
      console.log(`[ApiService] Response data:`, data);

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
        // Incluir errorCode si está presente en la respuesta
        if (data.errorCode) {
          (error as any).errorCode = data.errorCode;
          console.log(`[ApiService] Error code agregado al error: ${data.errorCode}`);
        } else {
          console.log(`[ApiService] No se encontró errorCode en la respuesta del servidor`);
        }
        console.log(`[ApiService] Datos completos de error:`, { errorMessage, errorCode: data.errorCode, status: response.status });
        throw error;
      }

      return data;
    } catch (error: any) {
      console.error(`[ApiService] Error en petición ${endpoint}:`, error);
      console.error(`[ApiService] Error details:`, {
        message: error?.message,
        name: error?.name,
        stack: error?.stack
      });
      
      // Si es un error de red, agregar más información
      if (error?.message?.includes('Network request failed') || error?.message?.includes('Failed to fetch')) {
        console.error(`[ApiService] Error de red. URL intentada: ${url}`);
        console.error(`[ApiService] Base URL configurada: ${this.baseUrl}`);
        const networkError = new Error('Error de conexión. Verifica tu conexión a internet e intenta nuevamente.');
        (networkError as any).isNetworkError = true;
        throw networkError;
      }
      
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
