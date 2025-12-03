/**
 * CreateTaskScreen - Pantalla para crear una nueva tarea
 * 
 * Formulario con validaciones para crear tareas del hogar
 */

import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
  Alert
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { addTask, setLoading } from '../../store/slices/taskSlice';
import TaskViewModel from '../../viewmodels/TaskViewModel';
import FamilyRepository from '../../repositories/FamilyRepository';
import { FamilyMember } from '../../repositories/interfaces/IFamilyRepository';
import { TaskPriority } from '../../models/TaskModel';
import CustomAlert from '../../components/CustomAlert';
import { useCustomAlert } from '../../hooks/useCustomAlert';
import TaskRepository from '../../repositories/TaskRepository';

// Import condicional del DateTimePicker (solo para móvil)
let DateTimePicker: any = null;
if (Platform.OS !== 'web') {
  try {
    DateTimePicker = require('@react-native-community/datetimepicker').default;
  } catch (e) {
    console.warn('DateTimePicker no está disponible');
  }
}

type CreateTaskScreenNavigationProp = StackNavigationProp<any, 'CreateTask'>;

interface Props {
  navigation: CreateTaskScreenNavigationProp;
}

const CreateTaskScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAppSelector((state) => state.auth);
  const { isLoading } = useAppSelector((state) => state.tasks);
  const dispatch = useAppDispatch();
  const { alertState, showSuccess, showError, hideAlert } = useCustomAlert();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [reminderTime, setReminderTime] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [priority, setPriority] = useState<TaskPriority>('Media');
  const [errors, setErrors] = useState<any>({});
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [isLoadingFamily, setIsLoadingFamily] = useState(true);

  const taskViewModel = new TaskViewModel();
  const familyRepository = new FamilyRepository();
  const taskRepository = new TaskRepository();

  /**
   * Carga los familiares al montar
   */
  useEffect(() => {
    loadFamilyMembers();
  }, []);

  /**
   * Carga la lista de familiares
   */
  const loadFamilyMembers = async () => {
    setIsLoadingFamily(true);
    try {
      const result = await familyRepository.getFamilyMembers();
      if (result.success && result.familyMembers) {
        setFamilyMembers(result.familyMembers);
      }
    } catch (error) {
      console.error('Error al cargar familiares:', error);
    } finally {
      setIsLoadingFamily(false);
    }
  };

  /**
   * Sanitiza el título removiendo HTML y scripts
   * Permite espacios y caracteres normales
   */
  const sanitizeTitle = (text: string): string => {
    // Remover etiquetas HTML
    let sanitized = text.replace(/<[^>]*>/g, '');
    // Remover scripts y eventos
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/on\w+=/gi, '');
    // Solo remover caracteres peligrosos < y >, pero mantener espacios y otros caracteres normales
    sanitized = sanitized.replace(/[<>]/g, '');
    // No hacer trim aquí para permitir espacios al inicio/final mientras escribe
    return sanitized;
  };

  /**
   * Normaliza una fecha a medianoche para comparación
   */
  const normalizeDateToMidnight = (dateString: string): Date => {
    const date = new Date(dateString);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  /**
   * Verifica si hay una tarea duplicada
   */
  const checkDuplicateTask = async (title: string, dueDate: string): Promise<boolean> => {
    try {
      if (!user?.uid) return false;
      
      const result = await taskRepository.getTasks(user.uid);
      if (result.success && result.tasks) {
        const normalizedDueDate = normalizeDateToMidnight(dueDate);
        const duplicate = result.tasks.find(task => {
          const taskDate = normalizeDateToMidnight(task.dueDate);
          return task.title.toLowerCase().trim() === title.toLowerCase().trim() &&
                 taskDate.getTime() === normalizedDueDate.getTime();
        });
        return !!duplicate;
      }
      return false;
    } catch (error) {
      console.error('Error al verificar duplicados:', error);
      return false;
    }
  };

  /**
   * Crea la tarea
   */
  const handleCreateTask = async () => {
    if (!user?.uid) {
      showError('Usuario no autenticado');
      return;
    }

    // Limpiar errores previos
    setErrors({});

    // Sanitizar título
    const sanitizedTitle = sanitizeTitle(title);
    if (!sanitizedTitle) {
      setErrors({ title: 'El título es requerido' });
      return;
    }

    // Validar que el asignado sea válido (puede ser el usuario mismo o un familiar)
    if (assignedToId) {
      // Permitir asignarse a sí mismo
      if (assignedToId === user.uid) {
        // Está bien, se asignó a sí mismo
      } else {
        // Si no es el usuario mismo, debe ser un familiar
        const memberExists = familyMembers.find(m => m.uid === assignedToId);
        if (!memberExists) {
          showError('El miembro seleccionado ya no está en tu familia. Por favor, actualiza la selección.');
          await loadFamilyMembers();
          return;
        }
      }
    }

    // Validar fecha no pasada (normalizada a medianoche)
    if (dueDate) {
      const selectedDateNormalized = normalizeDateToMidnight(dueDate);
      const todayNormalized = normalizeDateToMidnight(new Date().toISOString().split('T')[0]);
      
      if (selectedDateNormalized < todayNormalized) {
        setErrors({ dueDate: 'La fecha no puede ser anterior a hoy' });
        return;
      }
    }

    // Validar
    const validationErrors = taskViewModel.validateTaskForm(
      sanitizedTitle,
      description,
      assignedTo,
      dueDate,
      priority
    );

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Verificar duplicados
    const isDuplicate = await checkDuplicateTask(sanitizedTitle, dueDate);
    if (isDuplicate) {
      Alert.alert(
        'Tarea Duplicada',
        'Ya existe una tarea con el mismo título y fecha. ¿Deseas continuar de todas formas?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Continuar',
            onPress: () => createTask(sanitizedTitle)
          }
        ]
      );
      return;
    }

    await createTask(sanitizedTitle);
  };

  /**
   * Ejecuta la creación de la tarea
   */
  const createTask = async (sanitizedTitle: string) => {
    if (!user?.uid) return;

    dispatch(setLoading(true));

    // Usar assignedToId (UID) en lugar de assignedTo (nombre) para la asignación
    const assignedUserId = assignedToId || user.uid; // Si no hay asignado, asignar al usuario actual
    
    // Normalizar título (trim y espacios múltiples)
    const finalTitle = sanitizedTitle.trim().replace(/\s+/g, ' ');
    
    const result = await taskViewModel.createTask(
      finalTitle,
      description.trim() || '', // Descripción opcional, enviar string vacío si no hay
      assignedUserId, // Enviar UID en lugar del nombre
      dueDate,
      priority,
      user.uid,
      reminderTime || undefined // Hora del recordatorio (opcional)
    );

    dispatch(setLoading(false));

    if (result.success && result.task) {
      dispatch(addTask(result.task));
      showSuccess('Tarea creada correctamente', 'Éxito', () => {
        hideAlert();
        navigation.goBack();
      }, true, 2000);
    } else {
      showError(result.error || 'No se pudo crear la tarea');
    }
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
      // Validar que no sea fecha pasada
      const selectedDateNormalized = normalizeDateToMidnight(formatDateForDisplay(date));
      const todayNormalized = normalizeDateToMidnight(new Date().toISOString().split('T')[0]);
      
      if (selectedDateNormalized < todayNormalized) {
        setErrors({ ...errors, dueDate: 'La fecha no puede ser anterior a hoy' });
        setShowDatePicker(false);
        return;
      }
      
      setSelectedDate(date);
      const formattedDate = formatDateForDisplay(date);
      setDueDate(formattedDate);
      if (errors.dueDate) {
        setErrors({ ...errors, dueDate: undefined });
      }
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
              placeholderTextColor="#999"
              value={title}
              onChangeText={(text) => {
                // Sanitizar mientras el usuario escribe
                const sanitized = sanitizeTitle(text);
                setTitle(sanitized);
                if (errors.title) setErrors({ ...errors, title: undefined });
              }}
              // Permitir espacios múltiples mientras escribe, se normalizarán al guardar
              editable={!isLoading}
            />
            {errors.title && (
              <Text style={styles.errorText}>{errors.title}</Text>
            )}
          </View>

          {/* Descripción */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Descripción</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                errors.description && styles.inputError
              ]}
              placeholder="Describe los detalles de la tarea..."
              placeholderTextColor="#999"
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

          {/* Asignado a - Dropdown de familiares */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Asignado a *</Text>
            {isLoadingFamily ? (
              <ActivityIndicator size="small" color="#4A90E2" style={styles.loader} />
            ) : familyMembers.length === 0 ? (
              <View style={styles.emptyFamilyContainer}>
                <Text style={styles.emptyFamilyText}>
                  No tienes miembros en tu familia
                </Text>
                <TouchableOpacity
                  style={styles.addFamilyButton}
                  onPress={() => navigation.navigate('Family')}
                >
                  <Text style={styles.addFamilyButtonText}>Ir a Mi Familia</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.dropdown, errors.assignedTo && styles.inputError]}
                  onPress={() => setShowMemberDropdown(!showMemberDropdown)}
                  disabled={isLoading}
                >
                  <Text style={[styles.dropdownText, !assignedTo && styles.placeholder]}>
                    {assignedTo || 'Selecciona un miembro de la familia'}
                  </Text>
                  <Text style={styles.dropdownArrow}>
                    {showMemberDropdown ? '▲' : '▼'}
                  </Text>
                </TouchableOpacity>
                {showMemberDropdown && (
                  <View style={styles.dropdownList}>
                    {/* Opción "Yo mismo" */}
                    <TouchableOpacity
                      style={[
                        styles.dropdownItem,
                        assignedToId === user?.uid && styles.dropdownItemSelected
                      ]}
                      onPress={() => {
                        setAssignedTo(user?.displayName || user?.email || 'Yo mismo');
                        setAssignedToId(user?.uid || '');
                        setShowMemberDropdown(false);
                        if (errors.assignedTo) {
                          setErrors({ ...errors, assignedTo: undefined });
                        }
                      }}
                    >
                      <Text style={styles.dropdownItemText}>
                        👤 Yo mismo
                      </Text>
                    </TouchableOpacity>
                    {familyMembers.map((member) => (
                      <TouchableOpacity
                        key={member.uid}
                        style={[
                          styles.dropdownItem,
                          assignedToId === member.uid && styles.dropdownItemSelected
                        ]}
                        onPress={() => {
                          setAssignedTo(member.displayName || member.email || 'Sin nombre');
                          setAssignedToId(member.uid);
                          setShowMemberDropdown(false);
                          if (errors.assignedTo) {
                            setErrors({ ...errors, assignedTo: undefined });
                          }
                        }}
                      >
                        <Text style={styles.dropdownItemText}>
                          {member.displayName || member.email || 'Sin nombre'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {errors.assignedTo && (
                  <Text style={styles.errorText}>{errors.assignedTo}</Text>
                )}
              </>
            )}
          </View>

          {/* Fecha de vencimiento */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Fecha de Vencimiento *</Text>
            {Platform.OS === 'web' ? (
              // En web, usar un input HTML nativo
              <View>
                {/* @ts-ignore - Usar input HTML nativo para web */}
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e: any) => {
                    const dateValue = e.target.value;
                    // Validar que no sea fecha pasada
                    if (dateValue) {
                      const selectedDateNormalized = normalizeDateToMidnight(dateValue);
                      const todayNormalized = normalizeDateToMidnight(new Date().toISOString().split('T')[0]);
                      
                      if (selectedDateNormalized < todayNormalized) {
                        setErrors({ ...errors, dueDate: 'La fecha no puede ser anterior a hoy' });
                        return;
                      }
                      
                      setDueDate(dateValue);
                      setSelectedDate(new Date(dateValue));
                    } else {
                      setDueDate('');
                      setSelectedDate(null);
                    }
                    if (errors.dueDate) {
                      setErrors({ ...errors, dueDate: undefined });
                    }
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    fontSize: '16px',
                    borderRadius: '12px',
                    border: errors.dueDate ? '2px solid #FF3B30' : '2px solid #E0E0E0',
                    backgroundColor: '#fff',
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <Text style={styles.helperText}>
                  Usa el calendario desplegable del navegador
                </Text>
              </View>
            ) : (
              // En móvil, usar botón que abre el date picker
              <>
                <TouchableOpacity
                  style={[
                    styles.datePickerButton,
                    errors.dueDate && styles.inputError
                  ]}
                  onPress={openDatePicker}
                  disabled={isLoading}
                >
                  <Text
                    style={[
                      styles.datePickerButtonText,
                      !dueDate && styles.datePickerPlaceholder
                    ]}
                  >
                    {dueDate || 'Selecciona una fecha'}
                  </Text>
                  <Text style={styles.calendarIcon}>📅</Text>
                </TouchableOpacity>
                {showDatePicker && DateTimePicker && (
                  <DateTimePicker
                    value={selectedDate || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                    locale="es-ES"
                  />
                )}
                <Text style={styles.helperText}>
                  Toca el campo para seleccionar una fecha
                </Text>
              </>
            )}
            {errors.dueDate && (
              <Text style={styles.errorText}>{errors.dueDate}</Text>
            )}
          </View>

          {/* Hora del Recordatorio */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Hora del Recordatorio</Text>
            {Platform.OS === 'web' ? (
              <View>
                {/* @ts-ignore - Usar input HTML nativo para web */}
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e: any) => {
                    setReminderTime(e.target.value);
                  }}
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    fontSize: '16px',
                    borderRadius: '12px',
                    border: '2px solid #E0E0E0',
                    backgroundColor: '#fff',
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <Text style={styles.helperText}>
                  Selecciona la hora para recibir la notificación
                </Text>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setShowTimePicker(true)}
                  disabled={isLoading}
                >
                  <Text
                    style={[
                      styles.datePickerButtonText,
                      !reminderTime && styles.datePickerPlaceholder
                    ]}
                  >
                    {reminderTime || 'Selecciona una hora (opcional)'}
                  </Text>
                  <Text style={styles.calendarIcon}>🕐</Text>
                </TouchableOpacity>
                {showTimePicker && DateTimePicker && (
                  <DateTimePicker
                    value={reminderTime ? new Date(`2000-01-01T${reminderTime}`) : new Date()}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event: any, selectedTime?: Date) => {
                      setShowTimePicker(false);
                      if (selectedTime) {
                        const hours = selectedTime.getHours().toString().padStart(2, '0');
                        const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
                        setReminderTime(`${hours}:${minutes}`);
                      }
                    }}
                    locale="es-ES"
                  />
                )}
                <Text style={styles.helperText}>
                  Toca el campo para seleccionar una hora (opcional)
                </Text>
              </>
            )}
          </View>

          {/* Prioridad */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Prioridad * (Por defecto: Media)</Text>
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
  datePickerButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  datePickerButtonText: {
    fontSize: 16,
    color: '#333',
    flex: 1
  },
  datePickerPlaceholder: {
    color: '#999'
  },
  calendarIcon: {
    fontSize: 20,
    marginLeft: 8
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
  },
  loader: {
    marginVertical: 10
  },
  emptyFamilyContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed'
  },
  emptyFamilyText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center'
  },
  addFamilyButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8
  },
  addFamilyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  dropdown: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
    flex: 1
  },
  placeholder: {
    color: '#999'
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8
  },
  dropdownList: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    maxHeight: 200,
    overflow: 'hidden'
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5'
  },
  dropdownItemSelected: {
    backgroundColor: '#F0F7FF'
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333'
  }
});

export default CreateTaskScreen;


