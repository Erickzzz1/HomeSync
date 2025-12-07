/**
 * TaskListScreen - Pantalla mejorada de lista/dashboard de tareas
 * 
 * HU-04: Implementa funcionalidades avanzadas:
 * - Tiempo real con polling (preparado para onSnapshot)
 * - Ordenamiento: Pendientes primero (por fecha), luego completadas
 * - Filtros: Todas | Pendientes | Completadas
 * - Infinite Scroll con paginación
 * - LayoutAnimation para animaciones suaves
 * - NetInfo para detectar conexión offline
 * - Permisos de borrado (solo creador)
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  SectionList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  RefreshControl,
  LayoutAnimation,
  UIManager,
  Alert,
  TextInput,
  Modal
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { setTasks, removeTask, updateTask, setLoading } from '../../store/slices/taskSlice';
import TaskRepository from '../../repositories/TaskRepository';
import FamilyRepository from '../../repositories/FamilyRepository';
import FamilyGroupRepository from '../../repositories/FamilyGroupRepository';
import { TaskModel } from '../../models/TaskModel';
import TaskItem from '../../components/TaskItem';
import CustomAlert from '../../components/CustomAlert';
import SyncIndicator from '../../components/SyncIndicator';
import { useCustomAlert } from '../../hooks/useCustomAlert';
import { subscribeToTasks } from '../../services/TaskFirestoreService';
import { syncReminders, cancelTaskReminder } from '../../services/ReminderService';
import { getSavedCategories } from '../../services/CategoryService';
import { Unsubscribe } from 'firebase/firestore';

// Habilitar LayoutAnimation en Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type TaskListScreenNavigationProp = StackNavigationProp<any, 'TaskList'>;

interface Props {
  navigation: TaskListScreenNavigationProp;
}

const PAGE_SIZE = 20; // Tamaño de página para infinite scroll

const TaskListScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAppSelector((state) => state.auth);
  const { tasks, isLoading } = useAppSelector((state) => state.tasks);
  const dispatch = useAppDispatch();
  const { alertState, showSuccess, showError, showConfirm, hideAlert } = useCustomAlert();
  
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [userNameMap, setUserNameMap] = useState<Map<string, string>>(new Map());
  const [isOnline, setIsOnline] = useState(true);
  const [displayedTasks, setDisplayedTasks] = useState<TaskModel[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  
  // Estado de sincronización
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'offline'>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Filtros avanzados
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [selectedAssignedTo, setSelectedAssignedTo] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  
  // Agrupación
  const [groupBy, setGroupBy] = useState<'none' | 'date' | 'priority' | 'both'>('none');
  
  const taskRepository = new TaskRepository();
  const familyGroupRepository = new FamilyGroupRepository();
  const unsubscribeTasksRef = useRef<Unsubscribe | null>(null);
  const unsubscribeNetInfoRef = useRef<any>(null);
  const previousTasksRef = useRef<TaskModel[]>([]);

  /**
   * Configura animaciones de layout
   */
  const configureLayoutAnimation = () => {
    LayoutAnimation.configureNext({
      duration: 300,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity
      }
    });
  };

  /**
   * Carga el mapa de nombres de usuarios (familiares + usuario actual)
   * También extrae usuarios de las tareas existentes para funcionar offline
   */
  const loadUserNameMap = useCallback(async () => {
    if (!user?.uid) return;

    const nameMap = new Map<string, string>();
    
    // Agregar el usuario actual al mapa
    nameMap.set(user.uid, user.displayName || user.email || 'Yo');
    
    // Cargar familiares desde la API (si hay conexión)
    if (isOnline) {
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
        // Si falla, continuamos con los usuarios extraídos de las tareas
        console.warn('Error al cargar familiares (continuando con usuarios de tareas):', error);
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
        console.warn('Error al cargar miembros de grupos (continuando):', error);
      }
    }
    
    // Extraer usuarios asignados de las tareas existentes (funciona offline)
    tasks.forEach(task => {
      if (task.assignedTo && task.assignedTo !== user.uid && !nameMap.has(task.assignedTo)) {
        // Si no tenemos el nombre, usar el UID temporalmente
        // Se actualizará cuando se carguen los familiares
        nameMap.set(task.assignedTo, task.assignedTo);
      }
    });
    
    setUserNameMap(nameMap);
  }, [user?.uid, user?.displayName, user?.email, isOnline, tasks]);

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
   * Configura el listener de onSnapshot para tareas en tiempo real
   */
  const setupTasksListener = useCallback(() => {
    // Limpiar listener anterior si existe
    if (unsubscribeTasksRef.current) {
      unsubscribeTasksRef.current();
      unsubscribeTasksRef.current = null;
    }

    if (!user?.uid || !isOnline) {
      dispatch(setTasks([]));
      setDisplayedTasks([]);
      return;
    }

    // Configurar listener en tiempo real
    setIsSyncing(true);
    setSyncStatus('syncing');
    
    unsubscribeTasksRef.current = subscribeToTasks(
      user.uid,
      (tasks: TaskModel[]) => {
        // Las tareas ya vienen ordenadas del servicio
        configureLayoutAnimation();
        dispatch(setTasks(tasks));
        resetPagination(tasks);
        
        // Sincronizar recordatorios cuando cambian las tareas
        syncReminders(tasks, previousTasksRef.current.map(t => t.id));
        previousTasksRef.current = tasks;
        
        // Actualizar estado de sincronización
        setIsSyncing(false);
        setSyncStatus('synced');
        setLastSyncTime(new Date());
      },
      (error) => {
        // Error en la sincronización
        setIsSyncing(false);
        setSyncStatus('error');
        console.error('Error en sincronización:', error);
      }
    );
  }, [user?.uid, isOnline, dispatch]);

  /**
   * Formatea una fecha para mostrar en el encabezado de grupo
   */
  const formatGroupDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    
    if (date.getTime() === today.getTime()) {
      return 'Hoy';
    }
    if (date.getTime() === tomorrow.getTime()) {
      return 'Mañana';
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    if (date.getTime() === yesterday.getTime()) {
      return 'Ayer';
    }
    
    // Si es de esta semana
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    if (date > weekAgo && date < today) {
      return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
    }
    
    // Formato estándar
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
  };

  /**
   * Agrupa las tareas según el tipo de agrupación seleccionado
   */
  const groupTasks = (tasksList: TaskModel[]): Array<{ title: string; data: TaskModel[] }> => {
    if (groupBy === 'none') {
      return [{ title: 'Todas las tareas', data: tasksList }];
    }

    const grouped: Map<string, TaskModel[]> = new Map();

    tasksList.forEach(task => {
      let groupKey = '';
      
      if (groupBy === 'date') {
        groupKey = task.dueDate || 'Sin fecha';
      } else if (groupBy === 'priority') {
        groupKey = task.priority;
      } else if (groupBy === 'both') {
        const dateKey = task.dueDate || 'Sin fecha';
        groupKey = `${task.priority} - ${dateKey}`;
      }

      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, []);
      }
      grouped.get(groupKey)!.push(task);
    });

    // Convertir a array y ordenar
    const sections = Array.from(grouped.entries()).map(([key, data]) => ({
      title: key,
      data: data.sort((a, b) => {
        // Ordenar por fecha dentro de cada grupo
        const dateA = new Date(a.dueDate).getTime();
        const dateB = new Date(b.dueDate).getTime();
        return dateA - dateB;
      })
    }));

    // Ordenar secciones
    if (groupBy === 'date' || groupBy === 'both') {
      sections.sort((a, b) => {
        const dateA = new Date(a.title.split(' - ').pop() || a.title).getTime();
        const dateB = new Date(b.title.split(' - ').pop() || b.title).getTime();
        if (isNaN(dateA) && isNaN(dateB)) return 0;
        if (isNaN(dateA)) return 1;
        if (isNaN(dateB)) return -1;
        return dateA - dateB;
      });
    } else if (groupBy === 'priority') {
      const priorityOrder = { 'Alta': 0, 'Media': 1, 'Baja': 2 };
      sections.sort((a, b) => {
        const orderA = priorityOrder[a.title as keyof typeof priorityOrder] ?? 3;
        const orderB = priorityOrder[b.title as keyof typeof priorityOrder] ?? 3;
        return orderA - orderB;
      });
    }

    return sections;
  };

  /**
   * Resetea la paginación y actualiza las tareas mostradas
   */
  const resetPagination = (tasksToDisplay: TaskModel[]) => {
    setCurrentPage(0);
    const filtered = getFilteredTasksFromList(tasksToDisplay);
    
    if (groupBy === 'none') {
      setDisplayedTasks(filtered.slice(0, PAGE_SIZE));
      setHasMore(filtered.length > PAGE_SIZE);
    } else {
      // Con agrupación, mostramos todas las tareas (no hay paginación)
      setDisplayedTasks(filtered);
      setHasMore(false);
    }
  };

  /**
   * Extrae todas las categorías únicas de las tareas
   */
  const extractCategories = useCallback((tasksList: TaskModel[]) => {
    const categoriesSet = new Set<string>();
    tasksList.forEach(task => {
      if (task.categories && Array.isArray(task.categories)) {
        task.categories.forEach(cat => {
          if (cat && cat.trim()) {
            categoriesSet.add(cat.trim());
          }
        });
      }
    });
    return Array.from(categoriesSet).sort();
  }, []);

  /**
   * Filtra las tareas según todos los filtros aplicados
   */
  const getFilteredTasksFromList = (tasksList: TaskModel[]): TaskModel[] => {
    let filtered = tasksList;

    // Aplicar filtro de estado (pendiente/completada)
    switch (filter) {
      case 'pending':
        filtered = filtered.filter(task => !task.isCompleted);
        break;
      case 'completed':
        filtered = filtered.filter(task => task.isCompleted);
        break;
      default:
        // 'all' - no filtrar por estado
        break;
    }

    // Aplicar filtro de categoría si hay una seleccionada
    if (selectedCategory) {
      filtered = filtered.filter(task => 
        task.categories && 
        task.categories.some(cat => 
          cat && cat.trim().toLowerCase() === selectedCategory.toLowerCase()
        )
      );
    }

    // Aplicar búsqueda por texto (título y descripción)
    if (searchText.trim()) {
      const searchLower = searchText.trim().toLowerCase();
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(searchLower) ||
        (task.description && task.description.toLowerCase().includes(searchLower))
      );
    }

    // Aplicar filtro por prioridad (puede ser múltiple)
    if (selectedPriorities.length > 0) {
      filtered = filtered.filter(task => selectedPriorities.includes(task.priority));
    }

    // Aplicar filtro por asignado
    if (selectedAssignedTo) {
      filtered = filtered.filter(task => task.assignedTo === selectedAssignedTo);
    }

    // Aplicar filtro por rango de fechas
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(task => {
        if (!task.dueDate) return false;
        const taskDate = new Date(task.dueDate);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate >= fromDate;
      });
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(task => {
        if (!task.dueDate) return false;
        const taskDate = new Date(task.dueDate);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate <= toDate;
      });
    }

    return filtered;
  };

  /**
   * Carga más tareas (infinite scroll)
   */
  const loadMoreTasks = useCallback(() => {
    if (!hasMore || isLoading) return;

    const filtered = getFilteredTasksFromList(tasks);
    const nextPage = currentPage + 1;
    const startIndex = nextPage * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    const newTasks = filtered.slice(startIndex, endIndex);

    if (newTasks.length > 0) {
      setDisplayedTasks(prev => [...prev, ...newTasks]);
      setCurrentPage(nextPage);
      setHasMore(endIndex < filtered.length);
    } else {
      setHasMore(false);
    }
  }, [hasMore, isLoading, currentPage, tasks, filter, selectedCategory, searchText, selectedPriorities, selectedAssignedTo, dateFrom, dateTo]);


  /**
   * Configura el listener de NetInfo
   */
  const setupNetInfo = useCallback(() => {
    if (unsubscribeNetInfoRef.current) {
      unsubscribeNetInfoRef.current();
    }

    unsubscribeNetInfoRef.current = NetInfo.addEventListener(state => {
      const online = state.isConnected ?? false;
      setIsOnline(online);
      
      if (online) {
        // Reconectar cuando vuelve la conexión
        setSyncStatus('syncing');
        setupTasksListener();
      } else {
        // Detener listener cuando se pierde la conexión
        setSyncStatus('offline');
        if (unsubscribeTasksRef.current) {
          unsubscribeTasksRef.current();
          unsubscribeTasksRef.current = null;
        }
      }
    });
  }, [setupTasksListener]);

  // Cargar mapa de nombres cuando cambia el usuario, conexión o tareas
  useEffect(() => {
    if (user?.uid) {
      loadUserNameMap();
    } else {
      setUserNameMap(new Map());
    }
  }, [user?.uid, user?.displayName, user?.email, isOnline, tasks, loadUserNameMap]);

  // Configurar listener de onSnapshot cuando cambia el usuario o la conexión
  useEffect(() => {
    setupTasksListener();
    return () => {
      if (unsubscribeTasksRef.current) {
        unsubscribeTasksRef.current();
      }
    };
  }, [setupTasksListener]);

  // Configurar NetInfo
  useEffect(() => {
    setupNetInfo();
    return () => {
      if (unsubscribeNetInfoRef.current) {
        unsubscribeNetInfoRef.current();
      }
    };
  }, [setupNetInfo]);

  // Actualizar categorías disponibles cuando cambian las tareas
  useEffect(() => {
    const loadAllCategories = async () => {
      // Obtener categorías de las tareas
      const taskCategories = extractCategories(tasks);
      
      // Obtener categorías guardadas
      const savedCategories = await getSavedCategories();
      
      // Combinar ambas listas
      const combined = new Set<string>();
      taskCategories.forEach(cat => combined.add(cat));
      savedCategories.forEach(cat => combined.add(cat));
      
      setAvailableCategories(Array.from(combined).sort());
    };
    
    loadAllCategories();
  }, [tasks, extractCategories]);

  // Actualizar tareas mostradas cuando cambian las tareas o cualquier filtro
  useEffect(() => {
    const filtered = getFilteredTasksFromList(tasks);
    resetPagination(filtered);
  }, [tasks, filter, selectedCategory, searchText, selectedPriorities, selectedAssignedTo, dateFrom, dateTo, groupBy]);

  /**
   * Refresca la lista de tareas
   * Con onSnapshot, solo forzamos una reconexión del listener
   */
  const onRefresh = async () => {
    if (!isOnline) {
      showError('Sin conexión a internet');
      return;
    }

    setRefreshing(true);
    setSyncStatus('syncing');
    // Reconectar el listener (onSnapshot se actualiza automáticamente)
    setupTasksListener();
    // Simular un pequeño delay para el feedback visual
    setTimeout(() => {
      setRefreshing(false);
    }, 500);
  };

  /**
   * Navega a la pantalla de crear tarea
   */
  const navigateToCreateTask = () => {
    navigation.navigate('CreateTask');
  };

  /**
   * Navega a los detalles de una tarea
   */
  const navigateToTaskDetail = (task: TaskModel) => {
    navigation.navigate('TaskDetail', { task });
  };

  /**
   * Cambia el estado de completado de una tarea
   */
  const toggleTaskCompletion = async (task: TaskModel) => {
    if (!isOnline) {
      showError('Sin conexión a internet');
      return;
    }

    const newStatus = !task.isCompleted;
    
    dispatch(setLoading(true));
    setSyncStatus('syncing');
    
    const result = await taskRepository.toggleTaskCompletion(task.id, newStatus);

    if (result.success && result.task) {
      configureLayoutAnimation();
      dispatch(updateTask(result.task));
      setSyncStatus('synced');
      setLastSyncTime(new Date());
      
      // Si se completó la tarea, cancelar el recordatorio
      if (newStatus) {
        await cancelTaskReminder(task.id);
      } else {
        // Si se desmarcó como completada, reprogramar el recordatorio
        await syncReminders([result.task], []);
      }
    } else {
      setSyncStatus('error');
      showError(result.error || 'No se pudo actualizar la tarea');
    }
    dispatch(setLoading(false));
  };

  /**
   * Elimina una tarea
   */
  const deleteTask = async (taskId: string) => {
    if (!isOnline) {
      Alert.alert('Error', 'Sin conexión a internet');
      return;
    }

    showConfirm(
      '¿Estás seguro de que deseas eliminar esta tarea?',
      'Eliminar Tarea',
      async () => {
        dispatch(setLoading(true));
        setSyncStatus('syncing');
        
        const result = await taskRepository.deleteTask(taskId);

        if (result.success) {
          configureLayoutAnimation();
          dispatch(removeTask(taskId));
          setSyncStatus('synced');
          setLastSyncTime(new Date());
          
          // Cancelar el recordatorio de la tarea eliminada
          await cancelTaskReminder(taskId);
          
          showSuccess('Tarea eliminada correctamente');
        } else {
          setSyncStatus('error');
          Alert.alert('Error', result.error || 'No se pudo eliminar la tarea');
        }
        dispatch(setLoading(false));
      },
      undefined,
      'Eliminar',
      'Cancelar'
    );
  };

  /**
   * Cambia el filtro de tareas
   */
  const changeFilter = (newFilter: 'all' | 'pending' | 'completed') => {
    configureLayoutAnimation();
    setFilter(newFilter);
  };

  /**
   * Cambia el filtro de categoría
   */
  const changeCategoryFilter = (category: string | null) => {
    configureLayoutAnimation();
    setSelectedCategory(category);
  };

  /**
   * Limpia todos los filtros avanzados
   */
  const clearAdvancedFilters = () => {
    setSearchText('');
    setSelectedPriorities([]);
    setSelectedAssignedTo(null);
    setDateFrom('');
    setDateTo('');
    configureLayoutAnimation();
  };

  /**
   * Toggle de prioridad (permite múltiples selecciones)
   */
  const togglePriority = (priority: string) => {
    setSelectedPriorities(prev => {
      if (prev.includes(priority)) {
        return prev.filter(p => p !== priority);
      } else {
        return [...prev, priority];
      }
    });
  };

  /**
   * Obtiene la lista de usuarios asignables (usuario actual + familiares + usuarios de tareas)
   */
  const getAssignableUsers = (): Array<{ uid: string; name: string }> => {
    const users: Array<{ uid: string; name: string }> = [];
    const addedUids = new Set<string>();
    
    // Agregar usuario actual
    if (user?.uid) {
      users.push({
        uid: user.uid,
        name: user.displayName || user.email || 'Yo'
      });
      addedUids.add(user.uid);
    }
    
    // Agregar usuarios del mapa (familiares + usuarios de tareas)
    userNameMap.forEach((name, uid) => {
      if (!addedUids.has(uid)) {
        users.push({ uid, name });
        addedUids.add(uid);
      }
    });
    
    // También extraer usuarios únicos de las tareas (por si acaso)
    tasks.forEach(task => {
      if (task.assignedTo && !addedUids.has(task.assignedTo)) {
        const name = getAssignedUserName(task.assignedTo);
        users.push({ uid: task.assignedTo, name });
        addedUids.add(task.assignedTo);
      }
    });
    
    return users;
  };

  /**
   * Verifica si hay filtros avanzados activos
   */
  const hasActiveAdvancedFilters = (): boolean => {
    return !!(
      searchText.trim() ||
      selectedPriorities.length > 0 ||
      selectedAssignedTo ||
      dateFrom ||
      dateTo
    );
  };

  /**
   * Renderiza una tarea individual usando el componente TaskItem
   */
  const renderTask = ({ item }: { item: TaskModel }) => (
    <TaskItem
      task={item}
      currentUserId={user?.uid || ''}
      assignedUserName={getAssignedUserName(item.assignedTo)}
      onToggleComplete={toggleTaskCompletion}
      onDelete={deleteTask}
      onPress={navigateToTaskDetail}
    />
  );

  /**
   * Renderiza el encabezado de una sección agrupada
   */
  const renderSectionHeader = ({ section }: { section: { title: string; data: TaskModel[] } }) => {
    if (groupBy === 'none') return null;
    
    let displayTitle = section.title;
    
    // Formatear título según el tipo de agrupación
    if (groupBy === 'date') {
      displayTitle = formatGroupDate(section.title);
    } else if (groupBy === 'priority') {
      displayTitle = `Prioridad: ${section.title}`;
    } else if (groupBy === 'both') {
      const [priority, date] = section.title.split(' - ');
      displayTitle = `${priority} - ${formatGroupDate(date)}`;
    }
    
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderTitle}>{displayTitle}</Text>
        <View style={styles.sectionHeaderBadge}>
          <Text style={styles.sectionHeaderBadgeText}>{section.data.length}</Text>
        </View>
      </View>
    );
  };

  /**
   * Renderiza el footer de la lista (para infinite scroll)
   */
  const renderFooter = () => {
    if (!hasMore) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#0066FF" />
      </View>
    );
  };

  /**
   * Renderiza mensaje cuando no hay tareas
   */
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateEmoji}>📝</Text>
      <Text style={styles.emptyStateTitle}>No hay tareas</Text>
      <Text style={styles.emptyStateText}>
        {filter === 'all'
          ? 'Comienza creando una nueva tarea'
          : `No hay tareas ${filter === 'pending' ? 'pendientes' : 'completadas'}`}
      </Text>
    </View>
  );

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => !t.isCompleted).length,
    completed: tasks.filter(t => t.isCompleted).length
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Banner de conexión offline y estado de sincronización */}
      <View style={styles.statusBanner}>
        {!isOnline ? (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineText}>⚠️ Sin conexión a internet</Text>
          </View>
        ) : (
          <View style={styles.syncBanner}>
            <SyncIndicator
              status={syncStatus}
              lastSyncTime={lastSyncTime}
            />
          </View>
        )}
      </View>

      {/* Header con estadísticas */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#FF9500' }]}>
            {stats.pending}
          </Text>
          <Text style={styles.statLabel}>Pendientes</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#34C759' }]}>
            {stats.completed}
          </Text>
          <Text style={styles.statLabel}>Completadas</Text>
        </View>
      </View>

      {/* Filtros */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => changeFilter('all')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === 'all' && styles.filterButtonTextActive
            ]}
          >
            Todas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'pending' && styles.filterButtonActive]}
          onPress={() => changeFilter('pending')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === 'pending' && styles.filterButtonTextActive
            ]}
          >
            Pendientes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'completed' && styles.filterButtonActive]}
          onPress={() => changeFilter('completed')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === 'completed' && styles.filterButtonTextActive
            ]}
          >
            Completadas
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filtro de Categorías - Mostrar siempre que haya categorías guardadas o en tareas */}
      {(availableCategories.length > 0 || selectedCategory) && (
        <View style={styles.categoryFilterContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryFilterScroll}
          >
            <TouchableOpacity
              style={[
                styles.categoryFilterButton,
                !selectedCategory && styles.categoryFilterButtonActive
              ]}
              onPress={() => changeCategoryFilter(null)}
            >
              <Text
                style={[
                  styles.categoryFilterText,
                  !selectedCategory && styles.categoryFilterTextActive
                ]}
              >
                Todas
              </Text>
            </TouchableOpacity>
            {availableCategories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryFilterButton,
                  selectedCategory === category && styles.categoryFilterButtonActive
                ]}
                onPress={() => changeCategoryFilter(
                  selectedCategory === category ? null : category
                )}
              >
                <Text
                  style={[
                    styles.categoryFilterText,
                    selectedCategory === category && styles.categoryFilterTextActive
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Selector de Agrupación */}
      <View style={styles.groupByContainer}>
        <Text style={styles.groupByLabel}>Agrupar por:</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.groupByScroll}
        >
          {[
            { key: 'none', label: 'Sin agrupar' },
            { key: 'date', label: '📅 Fecha' },
            { key: 'priority', label: '⚡ Prioridad' },
            { key: 'both', label: '📅⚡ Ambos' }
          ].map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.groupByButton,
                groupBy === option.key && styles.groupByButtonActive
              ]}
              onPress={() => {
                configureLayoutAnimation();
                setGroupBy(option.key as typeof groupBy);
              }}
            >
              <Text
                style={[
                  styles.groupByButtonText,
                  groupBy === option.key && styles.groupByButtonTextActive
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Botones de Vista y Filtro Avanzado */}
      <View style={styles.advancedFilterButtonContainer}>
        <TouchableOpacity
          style={styles.calendarButton}
          onPress={() => navigation.navigate('Calendar')}
        >
          <Text style={styles.calendarButtonText}>📅 Calendario</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.advancedFilterButton,
            hasActiveAdvancedFilters() && styles.advancedFilterButtonActive
          ]}
          onPress={() => setShowAdvancedFilter(true)}
        >
          <Text style={styles.advancedFilterButtonText}>
            🔍 Filtros Avanzados
            {hasActiveAdvancedFilters() && ' •'}
          </Text>
        </TouchableOpacity>
        {hasActiveAdvancedFilters() && (
          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={clearAdvancedFilters}
          >
            <Text style={styles.clearFiltersButtonText}>Limpiar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Lista de tareas */}
      {isLoading && !refreshing && displayedTasks.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066FF" />
          <Text style={styles.loadingText}>Cargando tareas...</Text>
        </View>
      ) : groupBy === 'none' ? (
        <FlatList
          data={displayedTasks}
          renderItem={renderTask}
          keyExtractor={(item, index) => {
            return item.id || `task-${index}`;
          }}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              enabled={isOnline}
            />
          }
          onEndReached={loadMoreTasks}
          onEndReachedThreshold={0.5}
          removeClippedSubviews={Platform.OS === 'android'}
          maxToRenderPerBatch={10}
          windowSize={10}
        />
      ) : (
        <SectionList
          sections={groupTasks(getFilteredTasksFromList(tasks))}
          renderItem={renderTask}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item, index) => {
            return item.id || `task-${index}`;
          }}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              enabled={isOnline}
            />
          }
          stickySectionHeadersEnabled={false}
          removeClippedSubviews={Platform.OS === 'android'}
        />
      )}

      {/* Botón flotante para crear tarea */}
      <TouchableOpacity
        style={styles.fab}
        onPress={navigateToCreateTask}
        disabled={!isOnline}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Modal de Filtro Avanzado */}
      <Modal
        visible={showAdvancedFilter}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAdvancedFilter(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtros Avanzados</Text>
              <TouchableOpacity
                onPress={() => setShowAdvancedFilter(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Búsqueda por texto */}
              <View style={styles.filterField}>
                <Text style={styles.filterLabel}>Buscar en título/descripción</Text>
                <TextInput
                  style={styles.filterInput}
                  placeholder="Ej: lavar, compras..."
                  placeholderTextColor="#6B7280"
                  value={searchText}
                  onChangeText={setSearchText}
                />
              </View>

              {/* Filtro por prioridad (múltiple) */}
              <View style={styles.filterField}>
                <Text style={styles.filterLabel}>Prioridad (puedes seleccionar varias)</Text>
                <View style={styles.priorityFilterContainer}>
                  {['Alta', 'Media', 'Baja'].map((priority) => {
                    const isSelected = selectedPriorities.includes(priority);
                    return (
                      <TouchableOpacity
                        key={priority}
                        style={[
                          styles.priorityFilterButton,
                          isSelected && styles.priorityFilterButtonActive,
                          priority === 'Alta' && isSelected && styles.priorityFilterButtonHigh,
                          priority === 'Media' && isSelected && styles.priorityFilterButtonMedium,
                          priority === 'Baja' && isSelected && styles.priorityFilterButtonLow
                        ]}
                        onPress={() => togglePriority(priority)}
                      >
                        <Text
                          style={[
                            styles.priorityFilterText,
                            isSelected && styles.priorityFilterTextActive
                          ]}
                        >
                          {priority}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Filtro por asignado */}
              <View style={styles.filterField}>
                <Text style={styles.filterLabel}>Asignado a</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.assigneeFilterScroll}
                >
                  <TouchableOpacity
                    style={[
                      styles.assigneeFilterButton,
                      !selectedAssignedTo && styles.assigneeFilterButtonActive
                    ]}
                    onPress={() => setSelectedAssignedTo(null)}
                  >
                    <Text
                      style={[
                        styles.assigneeFilterText,
                        !selectedAssignedTo && styles.assigneeFilterTextActive
                      ]}
                    >
                      Todos
                    </Text>
                  </TouchableOpacity>
                  {getAssignableUsers().map((userItem) => (
                    <TouchableOpacity
                      key={userItem.uid}
                      style={[
                        styles.assigneeFilterButton,
                        selectedAssignedTo === userItem.uid && styles.assigneeFilterButtonActive
                      ]}
                      onPress={() => setSelectedAssignedTo(
                        selectedAssignedTo === userItem.uid ? null : userItem.uid
                      )}
                    >
                      <Text
                        style={[
                          styles.assigneeFilterText,
                          selectedAssignedTo === userItem.uid && styles.assigneeFilterTextActive
                        ]}
                      >
                        {userItem.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Filtro por rango de fechas */}
              <View style={styles.filterField}>
                <Text style={styles.filterLabel}>Rango de fechas</Text>
                <View style={styles.dateRangeContainer}>
                  <View style={styles.dateInputContainer}>
                    <Text style={styles.dateInputLabel}>Desde</Text>
                    {Platform.OS === 'web' ? (
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e: any) => setDateFrom(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid #E5E7EB',
                          fontSize: '14px'
                        }}
                      />
                    ) : (
                      <TextInput
                        style={styles.filterInput}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="#6B7280"
                        value={dateFrom}
                        onChangeText={setDateFrom}
                      />
                    )}
                  </View>
                  <View style={styles.dateInputContainer}>
                    <Text style={styles.dateInputLabel}>Hasta</Text>
                    {Platform.OS === 'web' ? (
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e: any) => setDateTo(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid #E5E7EB',
                          fontSize: '14px'
                        }}
                      />
                    ) : (
                      <TextInput
                        style={styles.filterInput}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="#6B7280"
                        value={dateTo}
                        onChangeText={setDateTo}
                      />
                    )}
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={clearAdvancedFilters}
              >
                <Text style={styles.modalButtonSecondaryText}>Limpiar Todo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonPrimary}
                onPress={() => setShowAdvancedFilter(false)}
              >
                <Text style={styles.modalButtonPrimaryText}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
    backgroundColor: '#F8F9FA'
  },
  statusBanner: {
    paddingVertical: 8,
    paddingHorizontal: 16
  },
  offlineBanner: {
    backgroundColor: '#EF4444',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center'
  },
  offlineText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600'
  },
  syncBanner: {
    alignItems: 'flex-end'
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  statBox: {
    flex: 1,
    alignItems: 'center'
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0066FF'
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    alignItems: 'center'
  },
  filterButtonActive: {
    backgroundColor: '#0066FF'
  },
  filterButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500'
  },
  filterButtonTextActive: {
    color: '#FFFFFF'
  },
  categoryFilterContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  categoryFilterScroll: {
    paddingHorizontal: 20,
    gap: 8
  },
  categoryFilterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8
  },
  categoryFilterButtonActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#0066FF'
  },
  categoryFilterText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500'
  },
  categoryFilterTextActive: {
    color: '#0066FF',
    fontWeight: '600'
  },
  listContent: {
    padding: 16,
    paddingBottom: 80
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60
  },
  emptyStateEmoji: {
    fontSize: 64,
    marginBottom: 16
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center'
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280'
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center'
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0066FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '300'
  },
  advancedFilterButtonContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    alignItems: 'center',
    gap: 8
  },
  calendarButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#34C759',
    alignItems: 'center'
  },
  calendarButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600'
  },
  groupByContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  groupByLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
    fontWeight: '500'
  },
  groupByScroll: {
    gap: 8
  },
  groupByButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8
  },
  groupByButtonActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#0066FF'
  },
  groupByButtonText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500'
  },
  groupByButtonTextActive: {
    color: '#0066FF',
    fontWeight: '600'
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#0066FF'
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1
  },
  sectionHeaderBadge: {
    backgroundColor: '#0066FF',
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    marginLeft: 8
  },
  sectionHeaderBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 'bold'
  },
  advancedFilterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center'
  },
  advancedFilterButtonActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#0066FF'
  },
  advancedFilterButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500'
  },
  clearFiltersButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center'
  },
  clearFiltersButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937'
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalCloseButtonText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: 'bold'
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16
  },
  filterField: {
    marginBottom: 24
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8
  },
  filterInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    color: '#1F2937'
  },
  priorityFilterContainer: {
    flexDirection: 'row',
    gap: 8
  },
  priorityFilterButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center'
  },
  priorityFilterButtonActive: {
    borderWidth: 2
  },
  priorityFilterButtonHigh: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444'
  },
  priorityFilterButtonMedium: {
    backgroundColor: '#FF9500',
    borderColor: '#FF9500'
  },
  priorityFilterButtonLow: {
    backgroundColor: '#34C759',
    borderColor: '#34C759'
  },
  priorityFilterText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500'
  },
  priorityFilterTextActive: {
    color: '#FFFFFF',
    fontWeight: '600'
  },
  assigneeFilterScroll: {
    flexDirection: 'row'
  },
  assigneeFilterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8
  },
  assigneeFilterButtonActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#0066FF'
  },
  assigneeFilterText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500'
  },
  assigneeFilterTextActive: {
    color: '#0066FF',
    fontWeight: '600'
  },
  dateRangeContainer: {
    flexDirection: 'row',
    gap: 12
  },
  dateInputContainer: {
    flex: 1
  },
  dateInputLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12
  },
  modalButtonSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    alignItems: 'center'
  },
  modalButtonSecondaryText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600'
  },
  modalButtonPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#0066FF',
    alignItems: 'center'
  },
  modalButtonPrimaryText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600'
  }
});

export default TaskListScreen;
