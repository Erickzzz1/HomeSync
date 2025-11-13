/**
 * TaskDetailScreen - Pantalla de detalle de tarea
 * 
 * Muestra los detalles completos de una tarea y permite editarla
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useAppDispatch } from '../../store/hooks';
import { updateTask as updateTaskRedux, setLoading } from '../../store/slices/taskSlice';
import TaskRepository from '../../repositories/TaskRepository';
import { TaskModel, TaskPriority } from '../../models/TaskModel';

type TaskDetailScreenNavigationProp = StackNavigationProp<any, 'TaskDetail'>;
type TaskDetailScreenRouteProp = RouteProp<{ TaskDetail: { task: TaskModel } }, 'TaskDetail'>;

interface Props {
  navigation: TaskDetailScreenNavigationProp;
  route: TaskDetailScreenRouteProp;
}

const TaskDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { task } = route.params;
  const dispatch = useAppDispatch();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [assignedTo, setAssignedTo] = useState(task.assignedTo);
  const [dueDate, setDueDate] = useState(task.dueDate);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);

  const taskRepository = new TaskRepository();

  /**
   * Guarda los cambios
   */
  const handleSave = async () => {
    setIsSaving(true);
    dispatch(setLoading(true));

    const result = await taskRepository.updateTask(task.id, {
      title,
      description,
      assignedTo,
      dueDate,
      priority
    });

    setIsSaving(false);
    dispatch(setLoading(false));

    if (result.success && result.task) {
      dispatch(updateTaskRedux(result.task));
      setIsEditing(false);
      showAlert('Éxito', 'Tarea actualizada correctamente');
    } else {
      showAlert('Error', result.error || 'No se pudo actualizar la tarea');
    }
  };

  /**
   * Cancela la edición
   */
  const handleCancel = () => {
    setTitle(task.title);
    setDescription(task.description);
    setAssignedTo(task.assignedTo);
    setDueDate(task.dueDate);
    setPriority(task.priority);
    setIsEditing(false);
  };

  /**
   * Muestra alert
   */
  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  /**
   * Obtiene el color de la prioridad
   */
  const getPriorityColor = (p: TaskPriority): string => {
    switch (p) {
      case 'Alta':
        return '#FF3B30';
      case 'Media':
        return '#FF9500';
      case 'Baja':
        return '#34C759';
      default:
        return '#999';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Estado */}
        <View style={[styles.statusBadge, task.isCompleted && styles.statusBadgeCompleted]}>
          <Text style={styles.statusText}>
            {task.isCompleted ? '✓ Completada' : '⏳ Pendiente'}
          </Text>
        </View>

        {/* Título */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Título</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              editable={!isSaving}
            />
          ) : (
            <Text style={styles.sectionValue}>{task.title}</Text>
          )}
        </View>

        {/* Descripción */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Descripción</Text>
          {isEditing ? (
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              editable={!isSaving}
            />
          ) : (
            <Text style={styles.sectionValue}>{task.description}</Text>
          )}
        </View>

        {/* Asignado a */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Asignado a</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={assignedTo}
              onChangeText={setAssignedTo}
              editable={!isSaving}
            />
          ) : (
            <Text style={styles.sectionValue}>👤 {task.assignedTo}</Text>
          )}
        </View>

        {/* Fecha de vencimiento */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Fecha de Vencimiento</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="YYYY-MM-DD"
              editable={!isSaving}
            />
          ) : (
            <Text style={styles.sectionValue}>
              📅 {new Date(task.dueDate).toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Text>
          )}
        </View>

        {/* Prioridad */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Prioridad</Text>
          {isEditing ? (
            <View style={styles.priorityContainer}>
              <TouchableOpacity
                style={[
                  styles.priorityButton,
                  priority === 'Alta' && styles.priorityButtonHigh
                ]}
                onPress={() => setPriority('Alta')}
                disabled={isSaving}
              >
                <Text
                  style={[
                    styles.priorityButtonText,
                    priority === 'Alta' && styles.priorityButtonTextActive
                  ]}
                >
                  Alta
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.priorityButton,
                  priority === 'Media' && styles.priorityButtonMedium
                ]}
                onPress={() => setPriority('Media')}
                disabled={isSaving}
              >
                <Text
                  style={[
                    styles.priorityButtonText,
                    priority === 'Media' && styles.priorityButtonTextActive
                  ]}
                >
                  Media
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.priorityButton,
                  priority === 'Baja' && styles.priorityButtonLow
                ]}
                onPress={() => setPriority('Baja')}
                disabled={isSaving}
              >
                <Text
                  style={[
                    styles.priorityButtonText,
                    priority === 'Baja' && styles.priorityButtonTextActive
                  ]}
                >
                  Baja
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View
              style={[
                styles.priorityBadge,
                { backgroundColor: getPriorityColor(task.priority) }
              ]}
            >
              <Text style={styles.priorityBadgeText}>{task.priority}</Text>
            </View>
          )}
        </View>

        {/* Metadata */}
        <View style={styles.metadataContainer}>
          <Text style={styles.metadataText}>
            Creada: {new Date(task.createdAt).toLocaleDateString()}
          </Text>
          <Text style={styles.metadataText}>
            Actualizada: {new Date(task.updatedAt).toLocaleDateString()}
          </Text>
        </View>

        {/* Botones */}
        {isEditing ? (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
              disabled={isSaving}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.saveButton, isSaving && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.editButton]}
            onPress={() => setIsEditing(true)}
          >
            <Text style={styles.editButtonText}>✏️ Editar Tarea</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  scrollContent: {
    padding: 20
  },
  statusBadge: {
    backgroundColor: '#FF9500',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24
  },
  statusBadgeCompleted: {
    backgroundColor: '#34C759'
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
    textTransform: 'uppercase'
  },
  sectionValue: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top'
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 8
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center'
  },
  priorityButtonHigh: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30'
  },
  priorityButtonMedium: {
    backgroundColor: '#FF9500',
    borderColor: '#FF9500'
  },
  priorityButtonLow: {
    backgroundColor: '#34C759',
    borderColor: '#34C759'
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666'
  },
  priorityButtonTextActive: {
    color: '#fff'
  },
  priorityBadge: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start'
  },
  priorityBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  metadataContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24
  },
  metadataText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  editButton: {
    backgroundColor: '#4A90E2'
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  saveButton: {
    backgroundColor: '#34C759'
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#E0E0E0'
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600'
  },
  buttonDisabled: {
    opacity: 0.6
  }
});

export default TaskDetailScreen;


