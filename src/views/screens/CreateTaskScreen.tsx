/**
 * CreateTaskScreen - Pantalla para crear una nueva tarea
 * 
 * Formulario con validaciones para crear tareas del hogar
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
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { addTask, setLoading } from '../../store/slices/taskSlice';
import TaskViewModel from '../../viewmodels/TaskViewModel';
import { TaskPriority } from '../../models/TaskModel';

type CreateTaskScreenNavigationProp = StackNavigationProp<any, 'CreateTask'>;

interface Props {
  navigation: CreateTaskScreenNavigationProp;
}

const CreateTaskScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAppSelector((state) => state.auth);
  const { isLoading } = useAppSelector((state) => state.tasks);
  const dispatch = useAppDispatch();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('Media');
  const [errors, setErrors] = useState<any>({});

  const taskViewModel = new TaskViewModel();

  /**
   * Crea la tarea
   */
  const handleCreateTask = async () => {
    if (!user?.uid) {
      showAlert('Error', 'Usuario no autenticado');
      return;
    }

    // Limpiar errores previos
    setErrors({});

    // Validar
    const validationErrors = taskViewModel.validateTaskForm(
      title,
      description,
      assignedTo,
      dueDate,
      priority
    );

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    dispatch(setLoading(true));

    const result = await taskViewModel.createTask(
      title,
      description,
      assignedTo,
      dueDate,
      priority,
      user.uid
    );

    dispatch(setLoading(false));

    if (result.success && result.task) {
      dispatch(addTask(result.task));
      showAlert('Éxito', 'Tarea creada correctamente', () => {
        navigation.goBack();
      });
    } else {
      showAlert('Error', result.error || 'No se pudo crear la tarea');
    }
  };

  /**
   * Muestra alert compatible con web y móvil
   */
  const showAlert = (title: string, message: string, onOk?: () => void) => {
    if (Platform.OS === 'web') {
      alert(`${title}: ${message}`);
      if (onOk) onOk();
    } else {
      Alert.alert(title, message, [{ text: 'OK', onPress: onOk }]);
    }
  };

  /**
   * Formatea la fecha para el input
   */
  const formatDateForInput = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Título */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Título *</Text>
            <TextInput
              style={[styles.input, errors.title && styles.inputError]}
              placeholder="Ej: Lavar la ropa"
              value={title}
              onChangeText={(text) => {
                setTitle(text);
                if (errors.title) setErrors({ ...errors, title: undefined });
              }}
              editable={!isLoading}
            />
            {errors.title && (
              <Text style={styles.errorText}>{errors.title}</Text>
            )}
          </View>

          {/* Descripción */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Descripción *</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                errors.description && styles.inputError
              ]}
              placeholder="Describe los detalles de la tarea..."
              value={description}
              onChangeText={(text) => {
                setDescription(text);
                if (errors.description)
                  setErrors({ ...errors, description: undefined });
              }}
              multiline
              numberOfLines={4}
              editable={!isLoading}
            />
            {errors.description && (
              <Text style={styles.errorText}>{errors.description}</Text>
            )}
          </View>

          {/* Asignado a */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Asignado a *</Text>
            <TextInput
              style={[styles.input, errors.assignedTo && styles.inputError]}
              placeholder="Ej: Juan, María, Papá..."
              value={assignedTo}
              onChangeText={(text) => {
                setAssignedTo(text);
                if (errors.assignedTo)
                  setErrors({ ...errors, assignedTo: undefined });
              }}
              editable={!isLoading}
            />
            {errors.assignedTo && (
              <Text style={styles.errorText}>{errors.assignedTo}</Text>
            )}
          </View>

          {/* Fecha de vencimiento */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Fecha de Vencimiento *</Text>
            <TextInput
              style={[styles.input, errors.dueDate && styles.inputError]}
              placeholder="YYYY-MM-DD"
              value={dueDate}
              onChangeText={(text) => {
                setDueDate(text);
                if (errors.dueDate) setErrors({ ...errors, dueDate: undefined });
              }}
              editable={!isLoading}
            />
            <Text style={styles.helperText}>
              Formato: YYYY-MM-DD (ej: 2025-12-31)
            </Text>
            {errors.dueDate && (
              <Text style={styles.errorText}>{errors.dueDate}</Text>
            )}
          </View>

          {/* Prioridad */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Prioridad *</Text>
            <View style={styles.priorityContainer}>
              <TouchableOpacity
                style={[
                  styles.priorityButton,
                  priority === 'Alta' && styles.priorityButtonHigh
                ]}
                onPress={() => setPriority('Alta')}
                disabled={isLoading}
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
                disabled={isLoading}
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
                disabled={isLoading}
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
            {errors.priority && (
              <Text style={styles.errorText}>{errors.priority}</Text>
            )}
          </View>

          {/* Botones */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => navigation.goBack()}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.createButton,
                isLoading && styles.buttonDisabled
              ]}
              onPress={handleCreateTask}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.createButtonText}>Crear Tarea</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  keyboardView: {
    flex: 1
  },
  scrollContent: {
    padding: 20
  },
  inputContainer: {
    marginBottom: 20
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 2,
    borderColor: 'transparent'
  },
  inputError: {
    borderColor: '#FF3B30'
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 14
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4
  },
  helperText: {
    color: '#999',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 8
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 2,
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
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
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
  createButton: {
    backgroundColor: '#4A90E2'
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  buttonDisabled: {
    opacity: 0.6
  }
});

export default CreateTaskScreen;


