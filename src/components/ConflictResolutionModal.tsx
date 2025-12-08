/**
 * ConflictResolutionModal - Componente para resolver conflictos de tareas
 * 
 * Muestra un modal cuando se detecta un conflicto de versión y permite
 * al usuario elegir cómo resolverlo.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert
} from 'react-native';
import { ConflictInfo, ConflictResolution, resolveConflict } from '../services/ConflictResolutionService';
import { TaskModel } from '../models/TaskModel';
import { Colors } from '../constants/design';
import { Ionicons } from '@expo/vector-icons';

interface ConflictResolutionModalProps {
  visible: boolean;
  conflict: ConflictInfo | null;
  onResolve: (resolution: ConflictResolution, resolvedData: any) => void;
  onCancel: () => void;
}

const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  visible,
  conflict,
  onResolve,
  onCancel
}) => {
  const [selectedResolution, setSelectedResolution] = useState<ConflictResolution | null>(null);

  if (!conflict) {
    return null;
  }

  const handleResolve = () => {
    if (!selectedResolution) {
      Alert.alert('Selecciona una opción', 'Por favor, elige cómo resolver el conflicto');
      return;
    }

    const resolvedData = resolveConflict(conflict, selectedResolution);
    onResolve(selectedResolution, resolvedData);
    setSelectedResolution(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Alta': return Colors.priorityHigh;
      case 'Media': return Colors.blue;
      case 'Baja': return Colors.priorityLow;
      default: return Colors.textSecondary;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.titleContainer}>
              <Ionicons name="warning" size={24} color={Colors.orange} style={{ marginRight: 8 }} />
              <Text style={styles.title}>Conflicto de Versión Detectado</Text>
            </View>
            <Text style={styles.subtitle}>
              La tarea fue modificada por {conflict.lastModifiedByName} mientras la editabas.
            </Text>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Versión del Servidor (Actual)</Text>
              <View style={styles.taskCard}>
                <Text style={styles.taskTitle}>{conflict.serverTask.title}</Text>
                <Text style={styles.taskDescription}>{conflict.serverTask.description || 'Sin descripción'}</Text>
                <View style={styles.taskDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Prioridad:</Text>
                    <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(conflict.serverTask.priority) }]}>
                      <Text style={styles.priorityText}>{conflict.serverTask.priority}</Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Fecha:</Text>
                    <Text style={styles.detailValue}>{formatDate(conflict.serverTask.dueDate)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Modificado por:</Text>
                    <Text style={styles.detailValue}>{conflict.lastModifiedByName}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tus Cambios (Locales)</Text>
              <View style={styles.taskCard}>
                <Text style={styles.taskTitle}>
                  {conflict.localChanges.title || conflict.localTask.title}
                </Text>
                <Text style={styles.taskDescription}>
                  {conflict.localChanges.description !== undefined 
                    ? conflict.localChanges.description || 'Sin descripción'
                    : conflict.localTask.description || 'Sin descripción'}
                </Text>
                <View style={styles.taskDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Prioridad:</Text>
                    <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(conflict.localChanges.priority || conflict.localTask.priority) }]}>
                      <Text style={styles.priorityText}>{conflict.localChanges.priority || conflict.localTask.priority}</Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Fecha:</Text>
                    <Text style={styles.detailValue}>
                      {formatDate(conflict.localChanges.dueDate || conflict.localTask.dueDate)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>¿Cómo deseas resolver el conflicto?</Text>
              
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  selectedResolution === 'useServer' && styles.optionButtonSelected
                ]}
                onPress={() => setSelectedResolution('useServer')}
              >
                <Text style={styles.optionTitle}>Usar versión del servidor</Text>
                <Text style={styles.optionDescription}>
                  Descartar tus cambios y mantener la versión actual del servidor
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionButton,
                  selectedResolution === 'useLocal' && styles.optionButtonSelected
                ]}
                onPress={() => setSelectedResolution('useLocal')}
              >
                <Text style={styles.optionTitle}>Usar mis cambios</Text>
                <Text style={styles.optionDescription}>
                  Sobrescribir la versión del servidor con tus cambios
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionButton,
                  selectedResolution === 'merge' && styles.optionButtonSelected
                ]}
                onPress={() => setSelectedResolution('merge')}
              >
                <Text style={styles.optionTitle}>Combinar cambios</Text>
                <Text style={styles.optionDescription}>
                  Mantener los campos del servidor y aplicar solo tus cambios modificados
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.resolveButton, !selectedResolution && styles.buttonDisabled]}
              onPress={handleResolve}
              disabled={!selectedResolution}
            >
              <Text style={styles.resolveButtonText}>Resolver</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '100%',
    maxHeight: '90%',
    padding: 20
  },
  scrollView: {
    maxHeight: '80%'
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.orange
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center'
  },
  section: {
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12
  },
  taskCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4
  },
  taskDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12
  },
  taskDetails: {
    gap: 8
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500'
  },
  detailValue: {
    fontSize: 14,
    color: '#1F2937'
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  priorityText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600'
  },
  optionButton: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12
  },
  optionButtonSelected: {
    borderColor: Colors.blue,
    backgroundColor: '#E3F2FD'
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4
  },
  optionDescription: {
    fontSize: 14,
    color: '#6B7280'
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  cancelButton: {
    backgroundColor: '#F8F9FA'
  },
  cancelButtonText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '600'
  },
  resolveButton: {
    backgroundColor: Colors.blue
  },
  resolveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  buttonDisabled: {
    opacity: 0.5
  }
});

export default ConflictResolutionModal;

