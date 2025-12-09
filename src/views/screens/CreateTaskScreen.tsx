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
  Alert,
  Dimensions
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { addTask, setLoading } from '../../store/slices/taskSlice';
import TaskViewModel from '../../viewmodels/TaskViewModel';
import FamilyRepository from '../../repositories/FamilyRepository';
import FamilyGroupRepository from '../../repositories/FamilyGroupRepository';
import { FamilyMember } from '../../repositories/interfaces/IFamilyRepository';
import { TaskPriority } from '../../models/TaskModel';
import CustomAlert from '../../components/CustomAlert';
import { useCustomAlert } from '../../hooks/useCustomAlert';
import TaskRepository from '../../repositories/TaskRepository';
import { scheduleTaskReminder } from '../../services/ReminderService';
import CategorySelector from '../../components/CategorySelector';
import { getSavedCategories, saveCategories } from '../../services/CategoryService';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/design';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  const [categories, setCategories] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [errors, setErrors] = useState<{title?: string; description?: string; assignedTo?: string; dueDate?: string; priority?: string; reminderTime?: string}>({});
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [isLoadingFamily, setIsLoadingFamily] = useState(true);

  const taskViewModel = new TaskViewModel();
  const familyRepository = new FamilyRepository();
  const familyGroupRepository = new FamilyGroupRepository();
  const taskRepository = new TaskRepository();

  /**
   * Carga los familiares y categorías disponibles al montar
   */
  useEffect(() => {
    loadFamilyMembers();
    loadAvailableCategories();
    loadSavedCategories();
  }, []);

  /**
   * Carga las categorías guardadas localmente
   */
  const loadSavedCategories = async () => {
    try {
      const saved = await getSavedCategories();
      // Combinar con las categorías de tareas existentes
      const allCategories = new Set<string>();
      saved.forEach(cat => allCategories.add(cat));
      if (availableCategories.length > 0) {
        availableCategories.forEach(cat => allCategories.add(cat));
      }
      setAvailableCategories(Array.from(allCategories).sort());
    } catch (error) {
      console.error('Error al cargar categorías guardadas:', error);
    }
  };

  /**
   * Carga la lista de familiares (tanto de la lista tradicional como de grupos familiares)
   */
  const loadFamilyMembers = async () => {
    setIsLoadingFamily(true);
    try {
      // Cargar miembros de la lista tradicional
      const traditionalResult = await familyRepository.getFamilyMembers();
      const traditionalMembers: FamilyMember[] = traditionalResult.success && traditionalResult.familyMembers 
        ? traditionalResult.familyMembers 
        : [];

      // Cargar miembros de todos los grupos familiares
      const groupsResult = await familyGroupRepository.getMyFamilyGroups();
      let groupMembers: FamilyMember[] = [];

      if (groupsResult.success && groupsResult.groups) {
        // Obtener miembros de cada grupo
        const groupPromises = groupsResult.groups.map(async (group) => {
          const groupDetailResult = await familyGroupRepository.getFamilyGroup(group.id);
          if (groupDetailResult.success && groupDetailResult.group) {
            return groupDetailResult.group.members.map(member => ({
              uid: member.uid,
              email: member.email,
              displayName: member.displayName,
              shareCode: member.shareCode,
              role: member.role
            }));
          }
          return [];
        });

        const allGroupMembersArrays = await Promise.all(groupPromises);
        groupMembers = allGroupMembersArrays.flat();
      }

      // Combinar ambos listados, eliminando duplicados por UID
      const allMembersMap = new Map<string, FamilyMember>();
      
      // Agregar miembros tradicionales
      traditionalMembers.forEach(member => {
        if (member.uid && member.uid !== user?.uid) {
          allMembersMap.set(member.uid, member);
        }
      });

      // Agregar miembros de grupos (no sobrescribir si ya existe)
      groupMembers.forEach(member => {
        if (member.uid && member.uid !== user?.uid && !allMembersMap.has(member.uid)) {
          allMembersMap.set(member.uid, member);
        }
      });

      // Convertir a array
      const uniqueMembers = Array.from(allMembersMap.values());
      setFamilyMembers(uniqueMembers);
    } catch (error) {
      console.error('Error al cargar familiares:', error);
      // En caso de error, intentar cargar solo la lista tradicional como fallback
      try {
        const result = await familyRepository.getFamilyMembers();
        if (result.success && result.familyMembers) {
          setFamilyMembers(result.familyMembers);
        }
      } catch (fallbackError) {
        console.error('Error al cargar familiares (fallback):', fallbackError);
      }
    } finally {
      setIsLoadingFamily(false);
    }
  };

  /**
   * Carga las categorías disponibles de las tareas existentes
   */
  const loadAvailableCategories = async () => {
    try {
      if (!user?.uid) return;
      
      const result = await taskRepository.getTasks(user.uid);
      if (result.success && result.tasks) {
        // Extraer todas las categorías únicas de las tareas
        const allCategories = new Set<string>();
        result.tasks.forEach(task => {
          if (task.categories && Array.isArray(task.categories)) {
            task.categories.forEach(cat => {
              if (cat && cat.trim()) {
                allCategories.add(cat.trim());
              }
            });
          }
        });
        const taskCategories = Array.from(allCategories);
        
        // Combinar con categorías guardadas
        const saved = await getSavedCategories();
        const combined = new Set<string>();
        saved.forEach(cat => combined.add(cat));
        taskCategories.forEach(cat => combined.add(cat));
        
        setAvailableCategories(Array.from(combined).sort());
      }
    } catch (error) {
      console.error('Error al cargar categorías disponibles:', error);
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
   * Obtiene la fecha de hoy a medianoche (sin hora)
   * Usa la fecha local del dispositivo para evitar problemas de zona horaria
   */
  const getTodayAtMidnight = (): Date => {
    const now = new Date();
    // Usar métodos locales para evitar problemas de zona horaria
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();
    // Crear fecha en hora local (no UTC)
    const today = new Date(year, month, day, 0, 0, 0, 0);
    return today;
  };

  /**
   * Normaliza una fecha a medianoche para comparación
   * Parsea el string de fecha (formato YYYY-MM-DD) y crea una fecha local
   */
  const normalizeDateToMidnight = (dateString: string): Date => {
    // Si el string está en formato YYYY-MM-DD, parsearlo directamente
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Los meses en JS son 0-indexed
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day, 0, 0, 0, 0);
    }
    // Fallback: usar el constructor Date normal
    const date = new Date(dateString);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  /**
   * Normaliza un objeto Date a medianoche para comparación
   */
  const normalizeDateObjectToMidnight = (date: Date): Date => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    return new Date(year, month, day, 0, 0, 0, 0);
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
    // Permitir seleccionar hoy
    if (dueDate) {
      const selectedDateNormalized = normalizeDateToMidnight(dueDate);
      const todayNormalized = getTodayAtMidnight();
      
      // Comparar usando getTime() para evitar problemas de referencia
      if (selectedDateNormalized.getTime() < todayNormalized.getTime()) {
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
    
    // Preparar datos de la tarea incluyendo categorías
    const taskData = {
      title: finalTitle,
      description: description.trim() || '',
      assignedTo: assignedUserId,
      dueDate,
      priority,
      createdBy: user.uid,
      reminderTime: reminderTime || undefined,
      categories: Array.isArray(categories) ? categories.filter(cat => cat && cat.trim()).map(cat => cat.trim()) : []
    };

    let result;
    try {
      console.log('[CreateTaskScreen] Iniciando creación de tarea...');
      result = await taskRepository.createTask(taskData);
      console.log('[CreateTaskScreen] Resultado de createTask:', result);
    } catch (error: any) {
      console.error('[CreateTaskScreen] Excepción al crear tarea:', error);
      console.error('[CreateTaskScreen] Stack trace:', error?.stack);
      dispatch(setLoading(false));
      showError(error?.message || 'Ocurrió un error inesperado al crear la tarea');
      return;
    }

    dispatch(setLoading(false));

    // Validación estricta: SOLO agregar a Redux si TODO está correcto
    if (result && result.success === true && result.task && result.task.id) {
      console.log('[CreateTaskScreen] Tarea creada exitosamente, agregando a Redux:', result.task.id);
      // SOLO agregar a Redux si la tarea se creó exitosamente en el servidor
      dispatch(addTask(result.task));
      
      // Guardar las categorías usadas para reutilización futura
      if (categories.length > 0) {
        await saveCategories(categories);
      }
      
      // Programar recordatorio si se especificó reminderTime
      if (reminderTime || result.task.reminderTime) {
        await scheduleTaskReminder(result.task);
      }
      
      showSuccess('Tarea creada correctamente', 'Éxito', () => {
        hideAlert();
        navigation.goBack();
      }, true, 2000);
    } else {
      // Mostrar error detallado al usuario
      const errorMessage = result.error || 'No se pudo crear la tarea. Verifica tu conexión a internet y que el servidor esté corriendo.';
      console.error('[CreateTaskScreen] Error al crear tarea:', errorMessage);
      showError(errorMessage);
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
      // Validar que no sea fecha pasada (permitir seleccionar hoy)
      // Normalizar directamente el objeto Date sin convertir a string primero
      const selectedDateNormalized = normalizeDateObjectToMidnight(date);
      const todayNormalized = getTodayAtMidnight();
      
      // Permitir seleccionar hoy (>= en lugar de >)
      if (selectedDateNormalized.getTime() < todayNormalized.getTime()) {
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
      <LinearGradient
        colors={['#FFFFFF', '#F5F8FF', '#E8F0FF']}
        style={styles.gradientBackground}
      >
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
              placeholderTextColor="#6B7280"
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
            <Text style={styles.label}>Descripción (Opcional)</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                errors.description && styles.inputError
              ]}
              placeholder="Describe los detalles de la tarea (opcional)..."
              placeholderTextColor="#6B7280"
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
              <ActivityIndicator size="small" color={Colors.blue} style={styles.loader} />
            ) : familyMembers.length === 0 ? (
              <View style={styles.emptyFamilyContainer}>
                <Text style={styles.emptyFamilyText}>
                  No tienes miembros en tu familia
                </Text>
                <TouchableOpacity
                  style={styles.addFamilyButton}
                  onPress={() => navigation.navigate('Family')}
                >
                  <LinearGradient
                    colors={[Colors.blue, Colors.blueDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.addFamilyButtonGradient}
                  >
                    <Text style={styles.addFamilyButtonText}>Ir a Mi Familia</Text>
                  </LinearGradient>
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
                    <Ionicons name="person" size={16} color={Colors.blue} style={{ marginRight: Spacing.xs }} />
                    <Text style={styles.dropdownItemText}>
                      Yo mismo
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
                    // Validar que no sea fecha pasada (permitir seleccionar hoy)
                    if (dateValue) {
                      const selectedDateNormalized = normalizeDateToMidnight(dateValue);
                      const todayNormalized = getTodayAtMidnight();
                      
                      // Comparar usando getTime() para evitar problemas de referencia
                      if (selectedDateNormalized.getTime() < todayNormalized.getTime()) {
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
                  min={(() => {
                    const today = getTodayAtMidnight();
                    const year = today.getFullYear();
                    const month = String(today.getMonth() + 1).padStart(2, '0');
                    const day = String(today.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                  })()}
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    fontSize: '16px',
                    borderRadius: '12px',
                    border: errors.dueDate ? '2px solid #EF4444' : '2px solid #E5E7EB',
                    backgroundColor: '#FFFFFF',
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
                  <Ionicons name="calendar" size={20} color={Colors.blue} />
                </TouchableOpacity>
                {showDatePicker && DateTimePicker && (
                  <DateTimePicker
                    value={selectedDate || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                    minimumDate={getTodayAtMidnight()}
                    locale="es-ES"
                    themeVariant="light"
                    accentColor={Colors.blue}
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
                    border: '2px solid #E5E7EB',
                    backgroundColor: '#FFFFFF',
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
                  <Ionicons name="time" size={20} color={Colors.blue} />
                </TouchableOpacity>
                {showTimePicker && DateTimePicker && (
                  <DateTimePicker
                    value={reminderTime ? new Date(`2000-01-01T${reminderTime}`) : new Date()}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event: any, selectedTime?: Date) => {
                      setShowTimePicker(false);
                      if (selectedTime && event.type === 'set') {
                        // Validar hora si la fecha seleccionada es hoy
                        if (dueDate) {
                          const selectedDateNormalized = normalizeDateToMidnight(dueDate);
                          const todayNormalized = getTodayAtMidnight();
                          
                          // Si la fecha es hoy, validar que la hora no sea anterior a la actual
                          if (selectedDateNormalized.getTime() === todayNormalized.getTime()) {
                            const now = new Date();
                            const selectedDateTime = new Date();
                            selectedDateTime.setHours(selectedTime.getHours());
                            selectedDateTime.setMinutes(selectedTime.getMinutes());
                            selectedDateTime.setSeconds(0);
                            
                            if (selectedDateTime < now) {
                              setErrors({ ...errors, reminderTime: 'La hora no puede ser anterior a la hora actual' });
                              return;
                            }
                          }
                        }
                        
                        const hours = selectedTime.getHours().toString().padStart(2, '0');
                        const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
                        setReminderTime(`${hours}:${minutes}`);
                        if (errors.reminderTime) {
                          setErrors({ ...errors, reminderTime: undefined });
                        }
                      }
                    }}
                    locale="es-ES"
                    themeVariant="light"
                    accentColor={Colors.blue}
                  />
                )}
                <Text style={styles.helperText}>
                  Toca el campo para seleccionar una hora (opcional)
                </Text>
                {errors.reminderTime && (
                  <Text style={styles.errorText}>{errors.reminderTime}</Text>
                )}
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

          {/* Categorías/Etiquetas */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Categorías/Etiquetas (Opcional)</Text>
            <CategorySelector
              selectedCategories={categories}
              availableCategories={availableCategories}
              onChange={setCategories}
              maxCategories={10}
              placeholder="Ej: Cocina, Limpieza, Compras..."
            />
            <Text style={styles.helperText}>
              Organiza tus tareas con etiquetas. Puedes crear nuevas o usar las existentes.
            </Text>
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
                isLoading && styles.buttonDisabled
              ]}
              onPress={handleCreateTask}
              disabled={isLoading}
            >
              <LinearGradient
                colors={[Colors.orange, Colors.orangeDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.createButtonGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.createButtonText}>Crear Tarea</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      </LinearGradient>
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
    flex: 1
  },
  gradientBackground: {
    flex: 1
  },
  keyboardView: {
    flex: 1
  },
  scrollContent: {
    padding: Math.max(Spacing.lg, SCREEN_WIDTH * 0.05),
    paddingBottom: Spacing.xl,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%'
  },
  inputContainer: {
    marginBottom: Spacing.lg
  },
  label: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm
  },
  input: {
    backgroundColor: '#FAFBFC',
    borderRadius: BorderRadius.base,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md + 2,
    fontSize: Typography.sizes.base,
    borderWidth: 2,
    borderColor: '#E0E7FF',
    color: Colors.textPrimary,
    ...Shadows.sm
  },
  inputError: {
    borderColor: Colors.red
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 14
  },
  errorText: {
    color: Colors.orange,
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs
  },
  helperText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs
  },
  datePickerButton: {
    backgroundColor: '#FAFBFC',
    borderRadius: BorderRadius.base,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md + 2,
    borderWidth: 2,
    borderColor: '#E0E7FF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Shadows.sm
  },
  datePickerButtonText: {
    fontSize: 16,
    color: '#1F2937',
    flex: 1
  },
  datePickerPlaceholder: {
    color: '#6B7280'
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 8
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center'
  },
  priorityButtonHigh: {
    backgroundColor: Colors.blue,
    borderColor: Colors.blue
  },
  priorityButtonMedium: {
    backgroundColor: Colors.priorityMedium,
    borderColor: Colors.priorityMedium
  },
  priorityButtonLow: {
    backgroundColor: Colors.priorityLow,
    borderColor: Colors.priorityLow
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280'
  },
  priorityButtonTextActive: {
    color: Colors.white
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20
  },
  button: {
    flex: 1,
    borderRadius: BorderRadius.base,
    overflow: 'hidden',
    ...Shadows.base
  },
  cancelButton: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.border
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    paddingVertical: Spacing.base,
    textAlign: 'center'
  },
  createButtonGradient: {
    paddingVertical: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.base
  },
  createButtonText: {
    color: Colors.white,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold
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
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed'
  },
  emptyFamilyText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    textAlign: 'center'
  },
  addFamilyButton: {
    overflow: 'hidden',
    borderRadius: BorderRadius.base,
    ...Shadows.base
  },
  addFamilyButtonGradient: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.base
  },
  addFamilyButtonText: {
    color: Colors.white,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold
  },
  dropdown: {
    backgroundColor: '#FAFBFC',
    borderRadius: BorderRadius.base,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md + 2,
    borderWidth: 2,
    borderColor: '#E0E7FF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Shadows.sm
  },
  dropdownText: {
    fontSize: 16,
    color: '#1F2937',
    flex: 1
  },
  placeholder: {
    color: '#6B7280'
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8
  },
  dropdownList: {
    marginTop: 8,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    maxHeight: 200,
    overflow: 'hidden'
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.backgroundTertiary,
    flexDirection: 'row',
    alignItems: 'center'
  },
  dropdownItemSelected: {
    backgroundColor: Colors.blue + '15'
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#1F2937'
  }
});

export default CreateTaskScreen;


