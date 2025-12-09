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
  ActivityIndicator,
  Dimensions,
  TouchableWithoutFeedback
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { updateTask as updateTaskRedux, setLoading } from '../../store/slices/taskSlice';
import TaskRepository from '../../repositories/TaskRepository';
import FamilyRepository from '../../repositories/FamilyRepository';
import FamilyGroupRepository from '../../repositories/FamilyGroupRepository';
import { FamilyMember } from '../../repositories/interfaces/IFamilyRepository';
import TaskViewModel from '../../viewmodels/TaskViewModel';
import { TaskModel, TaskPriority } from '../../models/TaskModel';
import CustomAlert from '../../components/CustomAlert';
import { useCustomAlert } from '../../hooks/useCustomAlert';
import { syncReminders } from '../../services/ReminderService';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/design';
import CategorySelector from '../../components/CategorySelector';
import { getSavedCategories, saveCategories } from '../../services/CategoryService';
import ConflictResolutionModal from '../../components/ConflictResolutionModal';
import { ConflictInfo, createConflictInfo, ConflictResolution } from '../../services/ConflictResolutionService';
import { Ionicons } from '@expo/vector-icons';
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
  const [description, setDescription] = useState(task.description || '');
  const [assignedTo, setAssignedTo] = useState(task.assignedTo);
  const [assignedToName, setAssignedToName] = useState<string>('');
  const [dueDate, setDueDate] = useState(task.dueDate);
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    task.dueDate ? new Date(task.dueDate) : null
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [categories, setCategories] = useState<string[]>(task.categories || []);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<{
    title?: string;
    description?: string;
    assignedTo?: string;
    dueDate?: string;
    priority?: string;
  }>({});
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<Array<{ uid: string; name: string }>>([]);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [isLoadingFamily, setIsLoadingFamily] = useState(true);

  const taskRepository = new TaskRepository();
  const familyGroupRepository = new FamilyGroupRepository();
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

    // Cargar miembros de grupos familiares
    try {
      const groupsResult = await familyGroupRepository.getMyFamilyGroups();
      if (groupsResult.success && groupsResult.groups) {
        // Obtener miembros de cada grupo
        const groupPromises = groupsResult.groups.map(async (group) => {
          const groupDetailResult = await familyGroupRepository.getFamilyGroup(group.id);
          if (groupDetailResult.success && groupDetailResult.group) {
            return groupDetailResult.group.members.map(member => ({
              uid: member.uid,
              name: member.displayName || member.email || 'Sin nombre'
            }));
          }
          return [];
        });

        const allGroupMembersArrays = await Promise.all(groupPromises);
        const allGroupMembers = allGroupMembersArrays.flat();
        
        allGroupMembers.forEach((member) => {
          if (member.uid && !nameMap.has(member.uid)) {
            nameMap.set(member.uid, member.name);
          }
        });
      }
    } catch (error) {
      console.error('Error al cargar miembros de grupos para mapeo de nombres:', error);
    }
    
    setUserNameMap(nameMap);
  }, [user?.uid, user?.displayName, user?.email]);

  // Establecer el nombre del asignado cuando se carga el mapa de nombres
  useEffect(() => {
    if (task.assignedTo && userNameMap.size > 0) {
      const assignedName = getAssignedUserName(task.assignedTo);
      setAssignedToName(assignedName);
    }
  }, [userNameMap, task.assignedTo]);

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

  /**
   * Obtiene el nombre del creador de la tarea
   */
  const getCreatorName = (createdByUid: string): string => {
    if (!createdByUid) return 'Desconocido';
    
    // Si es el usuario actual
    if (createdByUid === user?.uid) {
      return 'Tú';
    }
    
    // Buscar en el mapa de nombres
    return userNameMap.get(createdByUid) || createdByUid;
  };

  useEffect(() => {
    if (user?.uid) {
      loadUserNameMap();
      loadAvailableCategories();
      loadSavedCategories();
      loadFamilyMembers();
    }
  }, [user?.uid, loadUserNameMap]);

  /**
   * Carga los miembros de la familia y grupos para el selector
   */
  /**
   * Carga la lista de familiares para asignar la tarea
   * Si la tarea tiene un groupId, solo carga los miembros de ese grupo
   */
  const loadFamilyMembers = async () => {
    if (!user?.uid) return;
    
    setIsLoadingFamily(true);
    const members: Array<{ uid: string; name: string }> = [];
    
    try {
      // Si la tarea tiene un groupId, solo cargar miembros de ese grupo
      if (task.groupId) {
        console.log('[TaskDetailScreen] Cargando miembros del grupo de la tarea:', task.groupId);
        const groupResult = await familyGroupRepository.getFamilyGroup(task.groupId);
        
        if (groupResult.success && groupResult.group) {
          // Agregar el usuario actual
          members.push({
            uid: user.uid,
            name: user.displayName || user.email || 'Yo mismo'
          });
          
          // Agregar miembros del grupo
          groupResult.group.members.forEach((member) => {
            if (member.uid !== user?.uid) {
              members.push({
                uid: member.uid,
                name: member.displayName || member.email || 'Sin nombre'
              });
            }
          });
          
          console.log('[TaskDetailScreen] Miembros del grupo cargados:', members.length);
        } else {
          console.error('[TaskDetailScreen] No se pudo cargar el grupo:', task.groupId);
          // Fallback: agregar solo el usuario actual
          members.push({
            uid: user.uid,
            name: user.displayName || user.email || 'Yo mismo'
          });
        }
      } else {
        // Si no hay groupId, cargar todos los miembros como antes
        console.log('[TaskDetailScreen] Cargando todos los miembros (tarea sin grupo)');
        
        // Agregar el usuario actual
        members.push({
          uid: user.uid,
          name: user.displayName || user.email || 'Yo mismo'
        });
        
        // Cargar familiares
        const familyRepository = new FamilyRepository();
        const familyResult = await familyRepository.getFamilyMembers();
        if (familyResult.success && familyResult.familyMembers) {
          familyResult.familyMembers.forEach((member) => {
            members.push({
              uid: member.uid,
              name: member.displayName || member.email || 'Sin nombre'
            });
          });
        }
        
        // Cargar miembros de grupos familiares
        const groupsResult = await familyGroupRepository.getMyFamilyGroups();
        if (groupsResult.success && groupsResult.groups) {
          const groupPromises = groupsResult.groups.map(async (group) => {
            const groupDetailResult = await familyGroupRepository.getFamilyGroup(group.id);
            if (groupDetailResult.success && groupDetailResult.group) {
              return groupDetailResult.group.members.map(member => ({
                uid: member.uid,
                name: member.displayName || member.email || 'Sin nombre'
              }));
            }
            return [];
          });
          
          const allGroupMembersArrays = await Promise.all(groupPromises);
          const allGroupMembers = allGroupMembersArrays.flat();
          
          // Agregar miembros de grupos que no estén ya en la lista
          allGroupMembers.forEach((member) => {
            if (member.uid && !members.find(m => m.uid === member.uid)) {
              members.push(member);
            }
          });
        }
      }
      
      setFamilyMembers(members);
    } catch (error) {
      console.error('Error al cargar miembros para selector:', error);
      // En caso de error, al menos agregar el usuario actual
      members.push({
        uid: user.uid,
        name: user.displayName || user.email || 'Yo mismo'
      });
      setFamilyMembers(members);
    } finally {
      setIsLoadingFamily(false);
    }
  };

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
   * Carga las categorías disponibles de las tareas existentes
   */
  const loadAvailableCategories = async () => {
    try {
      if (!user?.uid) return;
      
      const result = await taskRepository.getTasks(user.uid);
      if (result.success && result.tasks) {
        // Extraer todas las categorías únicas de las tareas
        const allCategories = new Set<string>();
        result.tasks.forEach(t => {
          if (t.categories && Array.isArray(t.categories)) {
            t.categories.forEach(cat => {
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

    // Preparar datos de actualización incluyendo la versión actual
    const updateData = {
      title,
      description,
      assignedTo,
      dueDate,
      priority,
      categories: categories.length > 0 ? categories : [],
      version: task.version || 1 // Incluir versión para detección de conflictos
    };

    const result = await taskRepository.updateTask(task.id, updateData);

    setIsSaving(false);
    dispatch(setLoading(false));

    // Si hay un conflicto, mostrar el modal de resolución
    if (!result.success && result.errorCode === 'CONFLICT' && result.conflict) {
      const localTask = { ...task };
      const localChanges = updateData;
      const conflict = createConflictInfo(
        result.conflict.serverTask,
        localTask,
        localChanges,
        result.conflict.lastModifiedByName
      );
      setConflictInfo(conflict);
      setShowConflictModal(true);
      return;
    }

    if (result.success && result.task) {
      dispatch(updateTaskRedux(result.task));
      
      // Actualizar la tarea local con la nueva versión
      const updatedTask = { ...task, ...result.task };
      
      // Guardar las categorías usadas para reutilización futura
      if (categories.length > 0) {
        await saveCategories(categories);
      }
      
      // Sincronizar recordatorios después de actualizar
      await syncReminders([result.task], []);
      
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
    setDescription(task.description || '');
    setAssignedTo(task.assignedTo);
    const currentAssignedName = getAssignedUserName(task.assignedTo);
    setAssignedToName(currentAssignedName);
    setDueDate(task.dueDate);
    setSelectedDate(task.dueDate ? new Date(task.dueDate) : null);
    setPriority(task.priority);
    setCategories(task.categories || []);
    setValidationErrors({});
    setIsEditing(false);
    setShowDatePicker(false);
    setShowMemberDropdown(false);
  };

  /**
   * Resuelve un conflicto aplicando la resolución elegida
   */
  const handleResolveConflict = async (resolution: ConflictResolution, resolvedData: any) => {
    if (!conflictInfo) return;

    setShowConflictModal(false);
    setIsSaving(true);
    dispatch(setLoading(true));

    // Actualizar con los datos resueltos
    const result = await taskRepository.updateTask(task.id, resolvedData);

    setIsSaving(false);
    dispatch(setLoading(false));

    if (result.success && result.task) {
      dispatch(updateTaskRedux(result.task));
      
      // Actualizar el estado local con la tarea resuelta
      const updatedTask = { ...task, ...result.task };
      
      // Si se eligió usar el servidor, actualizar los campos locales
      if (resolution === 'useServer') {
        setTitle(result.task.title);
        setDescription(result.task.description || '');
        setAssignedTo(result.task.assignedTo);
        setDueDate(result.task.dueDate);
        setSelectedDate(result.task.dueDate ? new Date(result.task.dueDate) : null);
        setPriority(result.task.priority);
        setCategories(result.task.categories || []);
        setDescription(result.task.description || '');
      }
      
      // Sincronizar recordatorios
      await syncReminders([result.task], []);
      
      setIsEditing(false);
      setConflictInfo(null);
      showSuccess('Conflicto resuelto y tarea actualizada', 'Éxito', () => {
        hideAlert();
        navigation.goBack();
      }, true, 2000);
    } else {
      showError(result.error || 'No se pudo resolver el conflicto');
      setConflictInfo(null);
    }
  };

  /**
   * Cancela la resolución de conflicto
   */
  const handleCancelConflict = () => {
    setShowConflictModal(false);
    setConflictInfo(null);
    setIsEditing(false);
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
    // Si no está en formato YYYY-MM-DD, intentar parsearlo como Date
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    return new Date(year, month, day, 0, 0, 0, 0);
  };

  /**
   * Formatea la fecha para mostrar en el input
   * Devuelve un string en formato YYYY-MM-DD normalizado a medianoche
   */
  const formatDateForDisplay = (date: Date | null): string => {
    if (!date) return '';
    // Normalizar la fecha a medianoche local antes de formatear
    const normalizedDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0, 0, 0, 0
    );
    const year = normalizedDate.getFullYear();
    const month = String(normalizedDate.getMonth() + 1).padStart(2, '0');
    const day = String(normalizedDate.getDate()).padStart(2, '0');
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
      // Normalizar la fecha seleccionada a medianoche local
      const normalizedDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        0, 0, 0, 0
      );
      setSelectedDate(normalizedDate);
      const formattedDate = formatDateForDisplay(normalizedDate);
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
        return Colors.priorityHigh;
      case 'Media':
        return Colors.blue;
      case 'Baja':
        return Colors.priorityLow;
      default:
        return '#6B7280';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#FFFFFF', '#F5F8FF', '#E8F0FF']}
        style={styles.gradientBackground}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
        {/* Estado */}
        <View style={styles.statusBadge}>
          <LinearGradient
            colors={task.isCompleted ? [Colors.green, Colors.greenDark] : [Colors.orange, Colors.orangeDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.statusBadgeGradient}
          >
            <Ionicons 
              name={task.isCompleted ? 'checkmark-circle' : 'time'} 
              size={20} 
              color={Colors.white} 
              style={{ marginRight: 8 }} 
            />
            <Text style={styles.statusText}>
              {task.isCompleted ? 'Completada' : 'Pendiente'}
            </Text>
          </LinearGradient>
        </View>

        {/* Título */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Título</Text>
          {isEditing ? (
            <>
              <TextInput
                style={[
                  styles.input,
                  validationErrors.title ? styles.inputError : null
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
          <Text style={styles.sectionLabel}>Descripción (Opcional)</Text>
          {isEditing ? (
            <>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  validationErrors.description ? styles.inputError : null
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
                placeholder="Ingresa la descripción de la tarea (opcional)"
              />
              {validationErrors.description && (
                <Text style={styles.errorText}>{validationErrors.description}</Text>
              )}
            </>
          ) : (
            <Text style={styles.sectionValue}>{task.description || 'Sin descripción'}</Text>
          )}
        </View>

        {/* Asignado a */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Asignado a</Text>
          {isEditing ? (
            <>
              {isLoadingFamily ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={Colors.blue} />
                  <Text style={styles.loadingText}>Cargando miembros...</Text>
                </View>
              ) : (
                <View style={[styles.dropdownContainer, showMemberDropdown && { marginBottom: 200 }]}>
                  <TouchableOpacity
                    style={[
                      styles.dropdown,
                      validationErrors.assignedTo ? styles.inputError : null
                    ]}
                    onPress={() => setShowMemberDropdown(!showMemberDropdown)}
                    disabled={isSaving}
                  >
                    <Text style={[styles.dropdownText, !assignedToName && styles.placeholder]} numberOfLines={1}>
                      {assignedToName || 'Selecciona un miembro'}
                    </Text>
                    <Ionicons 
                      name={showMemberDropdown ? 'chevron-up' : 'chevron-down'} 
                      size={20} 
                      color={Colors.textSecondary} 
                    />
                  </TouchableOpacity>
                  {showMemberDropdown && (
                    <ScrollView 
                      style={styles.dropdownList}
                      nestedScrollEnabled={true}
                      keyboardShouldPersistTaps="handled"
                    >
                      {familyMembers.map((member) => (
                        <TouchableOpacity
                          key={member.uid}
                          style={[
                            styles.dropdownItem,
                            assignedTo === member.uid && styles.dropdownItemSelected
                          ]}
                          onPress={() => {
                            setAssignedTo(member.uid);
                            setAssignedToName(member.name);
                            setShowMemberDropdown(false);
                            if (validationErrors.assignedTo) {
                              setValidationErrors({ ...validationErrors, assignedTo: undefined });
                            }
                          }}
                        >
                          <Ionicons 
                            name="person" 
                            size={16} 
                            color={assignedTo === member.uid ? Colors.white : Colors.blue} 
                            style={{ marginRight: Spacing.xs }} 
                          />
                          <Text style={[
                            styles.dropdownItemText,
                            assignedTo === member.uid && styles.dropdownItemTextSelected
                          ]} numberOfLines={1}>
                            {member.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}
              {validationErrors.assignedTo && (
                <Text style={styles.errorText}>{validationErrors.assignedTo}</Text>
              )}
            </>
          ) : (
            <Text style={styles.sectionValue}>
              {task.assignedTo === user?.uid 
                ? 'Asignado para mi' 
                : `Asignado a: ${getAssignedUserName(task.assignedTo)}`}
            </Text>
          )}
        </View>

        {/* Creado por */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Asignado por</Text>
          <Text style={styles.sectionValue}>
            {getCreatorName(task.createdBy)}
          </Text>
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
                      if (dateValue) {
                        // Normalizar la fecha a medianoche local antes de guardarla
                        const normalizedDate = normalizeDateToMidnight(dateValue);
                        setSelectedDate(normalizedDate);
                        const formattedDate = formatDateForDisplay(normalizedDate);
                        setDueDate(formattedDate);
                      } else {
                        setDueDate('');
                        setSelectedDate(null);
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
                      fontFamily: 'inherit',
                      borderRadius: '8px',
                      border: validationErrors.dueDate ? '2px solid #FF6B35' : '2px solid #E0E0E0',
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                      boxSizing: 'border-box',
                      color: '#1F2937',
                      fontWeight: '500'
                    }}
                  />
                </View>
              ) : (
                // En móvil, usar botón que abre el date picker
                <>
                  <TouchableOpacity
                    style={[
                      styles.datePickerButton,
                      validationErrors.dueDate ? styles.inputError : null
                    ]}
                    onPress={openDatePicker}
                    disabled={isSaving}
                  >
                    <Text style={styles.datePickerButtonText}>
                      {dueDate || 'Selecciona una fecha'}
                    </Text>
                    <Ionicons name="calendar" size={20} color={Colors.blue} />
                  </TouchableOpacity>
                  {showDatePicker && DateTimePicker && (
                    <DateTimePicker
                      value={selectedDate || new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(event: any, date?: Date) => {
                        handleDateChange(event, date);
                        // Limpiar error cuando el usuario seleccione una fecha
                        if (validationErrors.dueDate && date) {
                          setValidationErrors({ ...validationErrors, dueDate: undefined });
                        }
                      }}
                      minimumDate={getTodayAtMidnight()}
                      locale="es-ES"
                      themeVariant="light"
                      accentColor={Colors.blue}
                    />
                  )}
                </>
              )}
              {validationErrors.dueDate && (
                <Text style={styles.errorText}>{validationErrors.dueDate}</Text>
              )}
            </>
          ) : (
            <View style={styles.sectionValueContainer}>
              <Ionicons name="calendar" size={16} color={Colors.blue} style={{ marginRight: 8 }} />
              <Text style={styles.sectionValue}>
                {(() => {
                  // Normalizar la fecha antes de mostrarla para evitar problemas de zona horaria
                  const normalizedDate = normalizeDateToMidnight(task.dueDate);
                  return normalizedDate.toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  });
                })()}
              </Text>
            </View>
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

        {/* Categorías/Etiquetas */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Categorías/Etiquetas</Text>
          {isEditing ? (
            <CategorySelector
              selectedCategories={categories}
              availableCategories={availableCategories}
              onChange={setCategories}
              maxCategories={10}
              placeholder="Ej: Cocina, Limpieza, Compras..."
            />
          ) : (
            task.categories && task.categories.length > 0 ? (
              <View style={styles.categoriesContainer}>
                {task.categories.map((category, index) => (
                  <View key={`${category}-${index}`} style={styles.categoryTag}>
                    <Text style={styles.categoryText}>{category}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.sectionValue, { color: Colors.textSecondary, fontStyle: 'italic' }]}>
                Sin categorías
              </Text>
            )
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
              style={[styles.button, isSaving && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              <LinearGradient
                colors={[Colors.orange, Colors.orangeDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveButtonGradient}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Guardar</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          // Solo mostrar el botón de editar si el usuario es el creador de la tarea
          user?.uid === task.createdBy && (
            <TouchableOpacity
              style={styles.button}
              onPress={() => setIsEditing(true)}
            >
              <LinearGradient
                colors={[Colors.blue, Colors.blueDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.editButtonGradient}
              >
                <Ionicons name="create" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.editButtonText}>Editar Tarea</Text>
              </LinearGradient>
            </TouchableOpacity>
          )
        )}
        </ScrollView>
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
      <ConflictResolutionModal
        visible={showConflictModal}
        conflict={conflictInfo}
        onResolve={handleResolveConflict}
        onCancel={handleCancelConflict}
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
  scrollContent: {
    padding: Math.max(Spacing.lg, SCREEN_WIDTH * 0.05),
    paddingBottom: Spacing.xl,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%'
  },
  statusBadge: {
    overflow: 'hidden',
    borderRadius: BorderRadius.base,
    marginBottom: Spacing.xl
  },
  statusBadgeGradient: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderRadius: BorderRadius.base
  },
  statusText: {
    color: Colors.white,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
    ...Shadows.md
  },
  sectionLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  sectionValue: {
    fontSize: Typography.sizes.base,
    color: Colors.textPrimary,
    lineHeight: Typography.lineHeights.relaxed * Typography.sizes.base
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.base,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontSize: Typography.sizes.base,
    borderWidth: 2,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    ...Shadows.sm
  },
  datePickerButton: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.base,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Shadows.sm
  },
  datePickerButtonText: {
    fontSize: Typography.sizes.base,
    color: Colors.textPrimary,
    fontWeight: Typography.weights.medium,
    flex: 1
  },
  sectionValueContainer: {
    flexDirection: 'row',
    alignItems: 'center'
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
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.base,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm
  },
  priorityButtonHigh: {
    backgroundColor: Colors.orange,
    borderColor: Colors.orange
  },
  priorityButtonMedium: {
    backgroundColor: Colors.blue,
    borderColor: Colors.blue
  },
  priorityButtonLow: {
    backgroundColor: Colors.priorityLow,
    borderColor: Colors.priorityLow
  },
  priorityButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.textSecondary
  },
  priorityButtonTextActive: {
    color: Colors.white
  },
  priorityBadge: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.base,
    alignSelf: 'flex-start',
    ...Shadows.sm
  },
  priorityBadgeText: {
    color: Colors.white,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold
  },
  metadataContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    ...Shadows.sm
  },
  metadataText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12
  },
  button: {
    flex: 1,
    borderRadius: BorderRadius.base,
    overflow: 'hidden',
    ...Shadows.base
  },
  editButtonGradient: {
    paddingVertical: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.base
  },
  editButtonText: {
    color: Colors.white,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold
  },
  saveButtonGradient: {
    paddingVertical: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.base
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold
  },
  cancelButton: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.border,
    ...Shadows.sm
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    paddingVertical: Spacing.base,
    textAlign: 'center'
  },
  buttonDisabled: {
    opacity: 0.6
  },
  inputError: {
    borderColor: Colors.orange,
    borderWidth: 2
  },
  errorText: {
    color: Colors.orange,
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
    fontWeight: Typography.weights.medium
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8
  },
  categoryTag: {
    backgroundColor: Colors.blue,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    ...Shadows.xs
  },
  categoryText: {
    color: Colors.white,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium
  },
  dropdownContainer: {
    position: 'relative',
    zIndex: 10
  },
  dropdown: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.base,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Shadows.sm
  },
  dropdownText: {
    fontSize: Typography.sizes.base,
    color: Colors.textPrimary,
    fontWeight: Typography.weights.medium,
    flex: 1
  },
  placeholder: {
    color: Colors.textSecondary
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.base,
    marginTop: Spacing.xs,
    borderWidth: 2,
    borderColor: Colors.border,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    ...Shadows.md
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    minHeight: 48
  },
  dropdownItemSelected: {
    backgroundColor: Colors.blue
  },
  dropdownItemText: {
    fontSize: Typography.sizes.base,
    color: Colors.textPrimary,
    fontWeight: Typography.weights.medium
  },
  dropdownItemTextSelected: {
    color: Colors.white
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm
  },
  loadingText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary
  }
});

export default TaskDetailScreen;


