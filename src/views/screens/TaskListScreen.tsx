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
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  RefreshControl,
  LayoutAnimation,
  UIManager,
  Alert
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { setTasks, removeTask, updateTask, setLoading } from '../../store/slices/taskSlice';
import TaskRepository from '../../repositories/TaskRepository';
import FamilyRepository from '../../repositories/FamilyRepository';
import { TaskModel } from '../../models/TaskModel';
import TaskItem from '../../components/TaskItem';
import CustomAlert from '../../components/CustomAlert';
import { useCustomAlert } from '../../hooks/useCustomAlert';
import { subscribeToTasks } from '../../services/TaskFirestoreService';
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
  const [userNameMap, setUserNameMap] = useState<Map<string, string>>(new Map());
  const [isOnline, setIsOnline] = useState(true);
  const [displayedTasks, setDisplayedTasks] = useState<TaskModel[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  
  const taskRepository = new TaskRepository();
  const unsubscribeTasksRef = useRef<Unsubscribe | null>(null);
  const unsubscribeNetInfoRef = useRef<any>(null);

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
    unsubscribeTasksRef.current = subscribeToTasks(
      user.uid,
      (tasks: TaskModel[]) => {
        // Las tareas ya vienen ordenadas del servicio
        configureLayoutAnimation();
        dispatch(setTasks(tasks));
        resetPagination(tasks);
      }
    );
  }, [user?.uid, isOnline, dispatch]);

  /**
   * Resetea la paginación y actualiza las tareas mostradas
   */
  const resetPagination = (tasksToDisplay: TaskModel[]) => {
    setCurrentPage(0);
    const filtered = getFilteredTasksFromList(tasksToDisplay);
    setDisplayedTasks(filtered.slice(0, PAGE_SIZE));
    setHasMore(filtered.length > PAGE_SIZE);
  };

  /**
   * Filtra las tareas según el filtro seleccionado
   */
  const getFilteredTasksFromList = (tasksList: TaskModel[]): TaskModel[] => {
    switch (filter) {
      case 'pending':
        return tasksList.filter(task => !task.isCompleted);
      case 'completed':
        return tasksList.filter(task => task.isCompleted);
      default:
        return tasksList;
    }
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
  }, [hasMore, isLoading, currentPage, tasks, filter]);


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
        setupTasksListener();
      } else {
        // Detener listener cuando se pierde la conexión
        if (unsubscribeTasksRef.current) {
          unsubscribeTasksRef.current();
          unsubscribeTasksRef.current = null;
        }
      }
    });
  }, [setupTasksListener]);

  // Cargar mapa de nombres cuando cambia el usuario
  useEffect(() => {
    if (user?.uid) {
      loadUserNameMap();
    } else {
      setUserNameMap(new Map());
    }
  }, [user?.uid, user?.displayName, user?.email, loadUserNameMap]);

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

  // Actualizar tareas mostradas cuando cambian las tareas o el filtro
  useEffect(() => {
    const filtered = getFilteredTasksFromList(tasks);
    resetPagination(filtered);
  }, [tasks, filter]);

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
    const result = await taskRepository.toggleTaskCompletion(task.id, newStatus);

    if (result.success && result.task) {
      configureLayoutAnimation();
      dispatch(updateTask(result.task));
    } else {
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
        const result = await taskRepository.deleteTask(taskId);

        if (result.success) {
          configureLayoutAnimation();
          dispatch(removeTask(taskId));
          showSuccess('Tarea eliminada correctamente');
        } else {
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
   * Renderiza el footer de la lista (para infinite scroll)
   */
  const renderFooter = () => {
    if (!hasMore) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#4A90E2" />
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
      {/* Banner de conexión offline */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>⚠️ Sin conexión a internet</Text>
        </View>
      )}

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

      {/* Lista de tareas */}
      {isLoading && !refreshing && displayedTasks.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Cargando tareas...</Text>
        </View>
      ) : (
        <FlatList
          data={displayedTasks}
          renderItem={renderTask}
          keyExtractor={(item) => item.id}
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
      )}

      {/* Botón flotante para crear tarea */}
      <TouchableOpacity
        style={styles.fab}
        onPress={navigateToCreateTask}
        disabled={!isOnline}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

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
  offlineBanner: {
    backgroundColor: '#FF3B30',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center'
  },
  offlineText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  statBox: {
    flex: 1,
    alignItems: 'center'
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A90E2'
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center'
  },
  filterButtonActive: {
    backgroundColor: '#4A90E2'
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500'
  },
  filterButtonTextActive: {
    color: '#fff'
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
    color: '#333',
    marginBottom: 8
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
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
    color: '#666'
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
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8
  },
  fabText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '300'
  }
});

export default TaskListScreen;
