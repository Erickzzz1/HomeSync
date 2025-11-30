/**
 * ApiService - Servicio para comunicarse con la API backend
 * 
 * Maneja todas las peticiones HTTP a la API, incluyendo
 * gestión de tokens y manejo de errores.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@env';

const TOKEN_KEY = '@homesync:auth_token';

class ApiService {
  private baseUrl: string;

  constructor() {
    // Usar la URL de la API desde variables de entorno o localhost por defecto
    this.baseUrl = API_BASE_URL || 'http://localhost:3000';
  }

  /**
   * Obtiene el token de autenticación almacenado
   */
  private async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      // console.error('Error al obtener token:', error);
      return null;
    }
  }

  /**
   * Guarda el token de autenticación
   */
  async saveToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
      // console.error('Error al guardar token:', error);
    }
  }

  /**
   * Elimina el token de autenticación
   */
  async removeToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
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

      if (!response.ok) {
        throw new Error(data.error || 'Error en la petición');
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
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }
}

export default new ApiService();
