/**
 * CategoryService - Servicio para gestionar categorías guardadas
 * 
 * Guarda las categorías usadas frecuentemente en AsyncStorage
 * para que puedan ser reutilizadas fácilmente.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@homesync:saved_categories';
const MAX_SAVED_CATEGORIES = 50; // Máximo de categorías guardadas

/**
 * Obtiene las categorías guardadas del almacenamiento local
 */
export async function getSavedCategories(): Promise<string[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (data) {
      const categories = JSON.parse(data);
      return Array.isArray(categories) ? categories : [];
    }
    return [];
  } catch (error) {
    console.error('Error al obtener categorías guardadas:', error);
    return [];
  }
}

/**
 * Guarda una categoría en el almacenamiento local
 * Si ya existe, la mueve al principio de la lista
 */
export async function saveCategory(category: string): Promise<void> {
  try {
    if (!category || !category.trim()) return;

    const trimmedCategory = category.trim();
    const savedCategories = await getSavedCategories();

    // Remover la categoría si ya existe (para evitar duplicados)
    const filtered = savedCategories.filter(
      cat => cat.toLowerCase() !== trimmedCategory.toLowerCase()
    );

    // Agregar al principio de la lista
    const updated = [trimmedCategory, ...filtered];

    // Limitar el número de categorías guardadas
    const limited = updated.slice(0, MAX_SAVED_CATEGORIES);

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
  } catch (error) {
    console.error('Error al guardar categoría:', error);
  }
}

/**
 * Guarda múltiples categorías
 */
export async function saveCategories(categories: string[]): Promise<void> {
  try {
    if (!categories || categories.length === 0) return;

    const savedCategories = await getSavedCategories();
    const newCategories = categories
      .map(cat => cat.trim())
      .filter(cat => cat.length > 0);

    // Combinar categorías nuevas con las guardadas, evitando duplicados
    const combined = new Set<string>();
    
    // Agregar nuevas categorías primero (prioridad)
    newCategories.forEach(cat => combined.add(cat));
    
    // Agregar categorías guardadas existentes
    savedCategories.forEach(cat => combined.add(cat));

    // Convertir a array y limitar
    const limited = Array.from(combined).slice(0, MAX_SAVED_CATEGORIES);

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
  } catch (error) {
    console.error('Error al guardar categorías:', error);
  }
}

/**
 * Elimina una categoría guardada
 */
export async function removeSavedCategory(category: string): Promise<void> {
  try {
    const savedCategories = await getSavedCategories();
    const filtered = savedCategories.filter(
      cat => cat.toLowerCase() !== category.toLowerCase()
    );
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error al eliminar categoría guardada:', error);
  }
}

/**
 * Limpia todas las categorías guardadas
 */
export async function clearSavedCategories(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error al limpiar categorías guardadas:', error);
  }
}

