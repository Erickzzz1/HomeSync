/**
 * TaskDetailScreen - Pantalla de detalle de tarea
 * 
 * Muestra los detalles completos de una tarea y permite editarla
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { updateTask as updateTaskRedux, setLoading } from '../../store/slices/taskSlice';
import TaskRepository from '../../repositories/TaskRepository';
import FamilyRepository from '../../repositories/FamilyRepository';
import TaskViewModel from '../../viewmodels/TaskViewModel';
import { TaskModel, TaskPriority } from '../../models/TaskModel';
import CustomAlert from '../../components/CustomAlert';
import { useCustomAlert } from '../../hooks/useCustomAlert';

// Import condicional del DateTimePicker (solo para móvil)
let DateTimePicker: any = null;
if (Platform.OS !== 'web') {
  try {
    DateTimePicker = require('@react-native-community/datetimepicker').default;
  } catch (e) {
    console.warn('DateTimePicker no está disponible');
  }
}

type TaskDetailScreenNavigationProp = StackNavigationProp<any, 'TaskDetail'>;
type TaskDetailScreenRouteProp = RouteProp<{ TaskDetail: { task: TaskModel } }, 'TaskDetail'>;

interface Props {
  navigation: TaskDetailScreenNavigationProp;
  route: TaskDetailScreenRouteProp;
}

const TaskDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { task } = route.params;
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const { alertState, showSuccess, showError, hideAlert } = useCustomAlert();
  const [userNameMap, setUserNameMap] = useState<Map<string, string>>(new Map());

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [assignedTo, setAssignedTo] = useState(task.assignedTo);
  const [dueDate, setDueDate] = useState(task.dueDate);
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    task.dueDate ? new Date(task.dueDate) : null
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [validationErrors, setValidationErrors] = useState<{
    title?: string;
    description?: string;
    assignedTo?: string;
    dueDate?: string;
    priority?: string;
  }>({});

  const taskRepository = new TaskRepository();
  const taskViewModel = new TaskViewModel();

  /**
   * Carga el mapa de nombres de usuarios (familiares + usuario actual)
   */
  const loadUserNameMap = useCallback(async () => {
    if (!user?.uid) return;

    const nameMap = new Map<string, string>();
    
    // Agregar el usuario actual al mapa
    nameMap.set(user.uid, user.displayName || user.email || 'Yo');
    
    // Cargar familiares y agregarlos al mapa
    try {
      const familyRepository = new FamilyRepository();
      const familyResult = await familyRepository.getFamilyMembers();
      if (familyResult.success && familyResult.familyMembers) {
        familyResult.familyMembers.forEach((member) => {
          nameMap.set(
            member.uid,
            member.displayName || member.email || 'Sin nombre'
          );
        });
      }
    } catch (error) {
      console.error('Error al cargar familiares para mapeo de nombres:', error);
    }
    
    setUserNameMap(nameMap);
  }, [user?.uid, user?.displayName, user?.email]);

  /**
   * Obtiene el nombre del usuario asignado a partir de su UID
   */
  const getAssignedUserName = (assignedToUid: string): string => {
    if (!assignedToUid) return 'Sin asignar';
    
    // Si es el usuario actual
    if (assignedToUid === user?.uid) {
      return user.displayName || user.email || 'Yo';
    }
    
    // Buscar en el mapa de nombres
    return userNameMap.get(assignedToUid) || assignedToUid;
  };

  useEffect(() => {
    if (user?.uid) {
      loadUserNameMap();
    }
  }, [user?.uid, loadUserNameMap]);

  /**
   * Guarda los cambios
   */
  const handleSave = async () => {
    // Validar campos antes de proceder
    const errors = taskViewModel.validateTaskForm(
      title,
      description,
      assignedTo,
      dueDate,
      priority
    );

    // Si hay errores de validación, mostrarlos y no guardar
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      const firstError = Object.values(errors)[0];
      showError(firstError || 'Por favor, corrige los errores en el formulario');
      return;
    }

    // Limpiar errores de validación
    setValidationErrors({});

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
      showSuccess('Tarea actualizada correctamente', 'Éxito', () => {
        hideAlert();
        navigation.goBack();
      }, true, 2000);
    } else {
      showError(result.error || 'No se pudo actualizar la tarea');
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
    setSelectedDate(task.dueDate ? new Date(task.dueDate) : null);
    setPriority(task.priority);
    setValidationErrors({});
    setIsEditing(false);
    setShowDatePicker(false);
  };

  /**
   * Formatea la fecha para mostrar en el input
   */
  const formatDateForDisplay = (date: Date | null): string => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  /**
   * Maneja el cambio de fecha en el date picker
   */
  const handleDateChange = (event: any, date?: Date) => {
    // En Android, el picker se cierra automáticamente
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (event.type === 'set' && date) {
      setSelectedDate(date);
      const formattedDate = formatDateForDisplay(date);
      setDueDate(formattedDate);
    } else if (event.type === 'dismissed') {
      // Usuario canceló la selección
      setShowDatePicker(false);
    }
  };

  /**
   * Abre el date picker
   */
  const openDatePicker = () => {
    if (Platform.OS === 'web') {
      // En web, usar input nativo type="date"
      return;
    }
    setShowDatePicker(true);
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
            <>
              <TextInput
                style={[
                  styles.input,
                  validationErrors.title && styles.inputError
                ]}
                value={title}
                onChangeText={(text) => {
                  setTitle(text);
                  // Limpiar error cuando el usuario empiece a escribir
                  if (validationErrors.title) {
                    setValidationErrors({ ...validationErrors, title: undefined });
                  }
                }}
                editable={!isSaving}
                placeholder="Ingresa el título de la tarea"
              />
              {validationErrors.title && (
                <Text style={styles.errorText}>{validationErrors.title}</Text>
              )}
            </>
          ) : (
            <Text style={styles.sectionValue}>{task.title}</Text>
          )}
        </View>

        {/* Descripción */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Descripción</Text>
          {isEditing ? (
            <>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  validationErrors.description && styles.inputError
                ]}
                value={description}
                onChangeText={(text) => {
                  setDescription(text);
                  // Limpiar error cuando el usuario empiece a escribir
                  if (validationErrors.description) {
                    setValidationErrors({ ...validationErrors, description: undefined });
                  }
                }}
                multiline
                numberOfLines={4}
                editable={!isSaving}
                placeholder="Ingresa la descripción de la tarea"
              />
              {validationErrors.description && (
                <Text style={styles.errorText}>{validationErrors.description}</Text>
              )}
            </>
          ) : (
            <Text style={styles.sectionValue}>{task.description}</Text>
          )}
        </View>

        {/* Asignado a */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Asignado a</Text>
          {isEditing ? (
            <>
              <TextInput
                style={[
                  styles.input,
                  validationErrors.assignedTo && styles.inputError
                ]}
                value={assignedTo}
                onChangeText={(text) => {
                  setAssignedTo(text);
                  // Limpiar error cuando el usuario empiece a escribir
                  if (validationErrors.assignedTo) {
                    setValidationErrors({ ...validationErrors, assignedTo: undefined });
                  }
                }}
                editable={!isSaving}
                placeholder="Nombre del miembro asignado"
              />
              {validationErrors.assignedTo && (
                <Text style={styles.errorText}>{validationErrors.assignedTo}</Text>
              )}
            </>
          ) : (
            <Text style={styles.sectionValue}>👤 {getAssignedUserName(task.assignedTo)}</Text>
          )}
        </View>

        {/* Fecha de vencimiento */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Fecha de Vencimiento</Text>
          {isEditing ? (
            <>
              {Platform.OS === 'web' ? (
                // En web, usar un input HTML nativo
                <View>
                  {/* @ts-ignore - Usar input HTML nativo para web */}
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e: any) => {
                      const dateValue = e.target.value;
                      setDueDate(dateValue);
                      if (dateValue) {
                        setSelectedDate(new Date(dateValue));
                      }
                      // Limpiar error cuando el usuario seleccione una fecha
                      if (validationErrors.dueDate) {
                        setValidationErrors({ ...validationErrors, dueDate: undefined });
                      }
                    }}
                    min={new Date().toISOString().split('T')[0]}
                    disabled={isSaving}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: '16px',
                      borderRadius: '8px',
                      border: validationErrors.dueDate ? '1px solid #FF3B30' : '1px solid #E0E0E0',
                      backgroundColor: '#F5F5F5',
                      fontFamily: 'inherit',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </View>
              ) : (
                // En móvil, usar botón que abre el date picker
                <>
                  <TouchableOpacity
                    style={[
                      styles.datePickerButton,
                      validationErrors.dueDate && styles.inputError
                    ]}
                    onPress={openDatePicker}
                    disabled={isSaving}
                  >
                    <Text style={styles.datePickerButtonText}>
                      {dueDate || 'Selecciona una fecha'}
                    </Text>
                    <Text style={styles.calendarIcon}>📅</Text>
                  </TouchableOpacity>
                  {showDatePicker && DateTimePicker && (
                    <DateTimePicker
                      value={selectedDate || new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(event, date) => {
                        handleDateChange(event, date);
                        // Limpiar error cuando el usuario seleccione una fecha
                        if (validationErrors.dueDate && date) {
                          setValidationErrors({ ...validationErrors, dueDate: undefined });
                        }
                      }}
                      minimumDate={new Date()}
                      locale="es-ES"
                    />
                  )}
                </>
              )}
              {validationErrors.dueDate && (
                <Text style={styles.errorText}>{validationErrors.dueDate}</Text>
              )}
            </>
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
            <>
              <View style={styles.priorityContainer}>
                <TouchableOpacity
                  style={[
                    styles.priorityButton,
                    priority === 'Alta' && styles.priorityButtonHigh
                  ]}
                  onPress={() => {
                    setPriority('Alta');
                    // Limpiar error cuando el usuario seleccione una prioridad
                    if (validationErrors.priority) {
                      setValidationErrors({ ...validationErrors, priority: undefined });
                    }
                  }}
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
                  onPress={() => {
                    setPriority('Media');
                    // Limpiar error cuando el usuario seleccione una prioridad
                    if (validationErrors.priority) {
                      setValidationErrors({ ...validationErrors, priority: undefined });
                    }
                  }}
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
                  onPress={() => {
                    setPriority('Baja');
                    // Limpiar error cuando el usuario seleccione una prioridad
                    if (validationErrors.priority) {
                      setValidationErrors({ ...validationErrors, priority: undefined });
                    }
                  }}
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
              {validationErrors.priority && (
                <Text style={styles.errorText}>{validationErrors.priority}</Text>
              )}
            </>
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
      <CustomAlert
        visible={alertState.visible}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        onConfirm={alertState.onConfirm}
        onCancel={hideAlert}
        confirmText={alertState.confirmText}
        cancelText={alertState.cancelText}
        autoClose={alertState.autoClose}
        autoCloseDelay={alertState.autoCloseDelay}
      />
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
  datePickerButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  datePickerButtonText: {
    fontSize: 16,
    color: '#333',
    flex: 1
  },
  calendarIcon: {
    fontSize: 20,
    marginLeft: 8
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
  },
  inputError: {
    borderColor: '#FF3B30',
    borderWidth: 2
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4
  }
});

export default TaskDetailScreen;


