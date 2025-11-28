/**
 * TaskListScreen - Pantalla de lista/dashboard de tareas
 * 
 * Muestra todas las tareas del usuario con opciones de
 * filtrado, edición y eliminación.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  RefreshControl
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { setTasks, removeTask, updateTask, setLoading } from '../../store/slices/taskSlice';
import TaskRepository from '../../repositories/TaskRepository';
import { TaskModel } from '../../models/TaskModel';
import CustomAlert from '../../components/CustomAlert';
import { useCustomAlert } from '../../hooks/useCustomAlert';

type TaskListScreenNavigationProp = StackNavigationProp<any, 'TaskList'>;

interface Props {
  navigation: TaskListScreenNavigationProp;
}

const TaskListScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAppSelector((state) => state.auth);
  const { tasks, isLoading } = useAppSelector((state) => state.tasks);
  const dispatch = useAppDispatch();
  const { alertState, showSuccess, showError, showConfirm, hideAlert } = useCustomAlert();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const taskRepository = new TaskRepository();

  /**
   * Carga las tareas del usuario
   */
  const loadTasks = useCallback(async () => {
    if (!user?.uid) return;

    dispatch(setLoading(true));
    const result = await taskRepository.getTasks(user.uid);

    if (result.success && result.tasks) {
      dispatch(setTasks(result.tasks));
    } else {
      showError(result.error || 'No se pudieron cargar las tareas');
    }
    dispatch(setLoading(false));
  }, [user?.uid, dispatch, showError]);

  useEffect(() => {
    // Limpiar tareas anteriores cuando cambia el usuario
    if (user?.uid) {
      dispatch(setTasks([]));
      loadTasks();
    } else {
      // Si no hay usuario, limpiar tareas
      dispatch(setTasks([]));
    }
  }, [user?.uid, dispatch, loadTasks]);

  /**
   * Refresca la lista de tareas
   */
  const onRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
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
    const newStatus = !task.isCompleted;
    
    dispatch(setLoading(true));
    const result = await taskRepository.toggleTaskCompletion(task.id, newStatus);

    if (result.success && result.task) {
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
    showConfirm(
      '¿Estás seguro de que deseas eliminar esta tarea?',
      'Eliminar Tarea',
      async () => {
        dispatch(setLoading(true));
        const result = await taskRepository.deleteTask(taskId);

        if (result.success) {
          dispatch(removeTask(taskId));
          showSuccess('Tarea eliminada correctamente');
        } else {
          showError(result.error || 'No se pudo eliminar la tarea');
        }
        dispatch(setLoading(false));
      },
      undefined,
      'Eliminar',
      'Cancelar'
    );
  };

  /**
   * Filtra las tareas según el filtro seleccionado
   */
  const getFilteredTasks = (): TaskModel[] => {
    switch (filter) {
      case 'pending':
        return tasks.filter(task => !task.isCompleted);
      case 'completed':
        return tasks.filter(task => task.isCompleted);
      default:
        return tasks;
    }
  };

  /**
   * Obtiene el color según la prioridad
   */
  const getPriorityColor = (priority: string): string => {
    switch (priority) {
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

  /**
   * Renderiza una tarea individual
   */
  const renderTask = ({ item }: { item: TaskModel }) => (
    <TouchableOpacity
      style={styles.taskCard}
      onPress={() => navigateToTaskDetail(item)}
    >
      <View style={styles.taskHeader}>
        <View style={styles.taskTitleRow}>
          <TouchableOpacity
            style={[
              styles.checkbox,
              item.isCompleted && styles.checkboxChecked
            ]}
            onPress={() => toggleTaskCompletion(item)}
          >
            {item.isCompleted && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
          <View style={styles.taskInfo}>
            <Text
              style={[
                styles.taskTitle,
                item.isCompleted && styles.taskTitleCompleted
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text style={styles.taskDescription} numberOfLines={2}>
              {item.description}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteTask(item.id)}
        >
          <Text style={styles.deleteButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.taskFooter}>
        <View style={styles.taskMeta}>
          <View
            style={[
              styles.priorityBadge,
              { backgroundColor: getPriorityColor(item.priority) }
            ]}
          >
            <Text style={styles.priorityText}>{item.priority}</Text>
          </View>
          <Text style={styles.assignedText}>👤 {item.assignedTo}</Text>
        </View>
        <Text style={styles.dueDateText}>
          📅 {new Date(item.dueDate).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

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

  const filteredTasks = getFilteredTasks();
  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => !t.isCompleted).length,
    completed: tasks.filter(t => t.isCompleted).length
  };

  return (
    <SafeAreaView style={styles.container}>
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
          onPress={() => setFilter('all')}
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
          onPress={() => setFilter('pending')}
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
          onPress={() => setFilter('completed')}
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
      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Cargando tareas...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          renderItem={renderTask}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {/* Botón flotante para crear tarea */}
      <TouchableOpacity
        style={styles.fab}
        onPress={navigateToCreateTask}
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
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  taskTitleRow: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'flex-start'
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  checkboxChecked: {
    backgroundColor: '#4A90E2'
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  taskInfo: {
    flex: 1
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#999'
  },
  taskDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20
  },
  deleteButton: {
    padding: 4
  },
  deleteButtonText: {
    fontSize: 20
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0'
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  priorityBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4
  },
  priorityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  assignedText: {
    fontSize: 12,
    color: '#666'
  },
  dueDateText: {
    fontSize: 12,
    color: '#666'
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


