/**
 * CategorySelector - Componente para seleccionar y crear categorías/etiquetas
 * 
 * Permite al usuario seleccionar categorías existentes o crear nuevas
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform
} from 'react-native';
import { getSavedCategories, saveCategory, saveCategories } from '../services/CategoryService';
import { Colors } from '../constants/design';
import { Ionicons } from '@expo/vector-icons';

interface CategorySelectorProps {
  selectedCategories: string[];
  availableCategories?: string[];
  onChange: (categories: string[]) => void;
  maxCategories?: number;
  placeholder?: string;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategories = [],
  availableCategories = [],
  onChange,
  maxCategories = 10,
  placeholder = 'Agregar categoría...'
}) => {
  const [newCategory, setNewCategory] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [savedCategories, setSavedCategories] = useState<string[]>([]);
  const [allAvailableCategories, setAllAvailableCategories] = useState<string[]>([]);

  /**
   * Carga las categorías guardadas al montar
   */
  useEffect(() => {
    loadSavedCategories();
  }, []);

  /**
   * Actualiza las categorías disponibles combinando las guardadas con las sugeridas
   */
  useEffect(() => {
    const combined = new Set<string>();
    savedCategories.forEach(cat => combined.add(cat));
    availableCategories.forEach(cat => combined.add(cat));
    setAllAvailableCategories(Array.from(combined).sort());
  }, [savedCategories, availableCategories]);

  /**
   * Carga las categorías guardadas
   */
  const loadSavedCategories = async () => {
    const saved = await getSavedCategories();
    setSavedCategories(saved);
  };

  /**
   * Agrega una categoría a la lista seleccionada
   */
  const addCategory = async (category: string) => {
    const trimmedCategory = category.trim();
    
    if (!trimmedCategory) return;
    
    // Validar longitud
    if (trimmedCategory.length > 30) {
      return;
    }
    
    // Validar máximo de categorías
    if (selectedCategories.length >= maxCategories) {
      return;
    }
    
    // No agregar si ya existe (case-insensitive)
    const exists = selectedCategories.some(
      cat => cat.toLowerCase() === trimmedCategory.toLowerCase()
    );
    
    if (!exists) {
      const updatedCategories = [...selectedCategories, trimmedCategory];
      onChange(updatedCategories);
      
      // Guardar la categoría para uso futuro
      await saveCategory(trimmedCategory);
      
      // Recargar categorías guardadas
      await loadSavedCategories();
      
      setNewCategory('');
      setShowInput(false);
    }
  };

  /**
   * Elimina una categoría de la lista seleccionada
   */
  const removeCategory = (categoryToRemove: string) => {
    onChange(selectedCategories.filter(cat => cat !== categoryToRemove));
  };

  /**
   * Maneja la entrada de texto para nueva categoría
   */
  const handleTextSubmit = () => {
    if (newCategory.trim()) {
      addCategory(newCategory);
    }
  };

  /**
   * Obtiene categorías disponibles que no están seleccionadas
   * Prioriza las categorías guardadas
   */
  const getAvailableCategories = () => {
    // Combinar categorías guardadas y sugeridas
    const allCats = allAvailableCategories.filter(
      cat => !selectedCategories.some(
        selected => selected.toLowerCase() === cat.toLowerCase()
      )
    );
    
    // Priorizar categorías guardadas primero
    const saved = allCats.filter(cat => 
      savedCategories.some(saved => saved.toLowerCase() === cat.toLowerCase())
    );
    const others = allCats.filter(cat => 
      !savedCategories.some(saved => saved.toLowerCase() === cat.toLowerCase())
    );
    
    return [...saved, ...others];
  };

  return (
    <View style={styles.container}>
      {/* Categorías seleccionadas */}
      {selectedCategories.length > 0 && (
        <View style={styles.selectedContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selectedScroll}
          >
            {selectedCategories.map((category, index) => (
              <View key={`${category}-${index}`} style={styles.categoryTag}>
                <Text style={styles.categoryText}>{category}</Text>
                <TouchableOpacity
                  onPress={() => removeCategory(category)}
                  style={styles.removeButton}
                >
                  <Text style={styles.removeButtonText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Input para nueva categoría */}
      {showInput ? (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor="#6B7280"
            value={newCategory}
            onChangeText={setNewCategory}
            onSubmitEditing={handleTextSubmit}
            maxLength={30}
            autoFocus
            onBlur={() => {
              if (!newCategory.trim()) {
                setShowInput(false);
              }
            }}
          />
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleTextSubmit}
            disabled={!newCategory.trim() || selectedCategories.length >= maxCategories}
          >
            <Ionicons name="checkmark" size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              setNewCategory('');
              setShowInput(false);
            }}
          >
            <Ionicons name="close" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.addCategoryButton}
          onPress={() => setShowInput(true)}
          disabled={selectedCategories.length >= maxCategories}
        >
          <Text style={styles.addCategoryButtonText}>
            + {selectedCategories.length >= maxCategories ? 'Límite alcanzado' : 'Agregar categoría'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Categorías disponibles sugeridas */}
      {getAvailableCategories().length > 0 && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsLabel}>Categorías sugeridas:</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsScroll}
          >
            {getAvailableCategories().slice(0, 10).map((category, index) => (
              <TouchableOpacity
                key={`suggestion-${category}-${index}`}
                style={styles.suggestionTag}
                onPress={() => addCategory(category)}
              >
                <Text style={styles.suggestionText}>+ {category}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8
  },
  selectedContainer: {
    marginBottom: 12
  },
  selectedScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.blue,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500'
  },
  removeButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 16
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8
  },
  input: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    color: '#1F2937'
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.blue,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center'
  },
  addCategoryButton: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed'
  },
  addCategoryButtonText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center'
  },
  suggestionsContainer: {
    marginTop: 8
  },
  suggestionsLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8
  },
  suggestionsScroll: {
    flexDirection: 'row',
    gap: 8
  },
  suggestionTag: {
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.blue
  },
  suggestionText: {
    color: Colors.blue,
    fontSize: 12,
    fontWeight: '500'
  }
});

export default CategorySelector;

