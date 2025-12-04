/**
 * TaskItem - Componente para renderizar una tarea individual
 * 
 * Muestra: Título, Fecha, Prioridad, Checkbox y botón de eliminar (solo si es el creador)
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform
} from 'react-native';
import { TaskModel } from '../models/TaskModel';

interface TaskItemProps {
  task: TaskModel;
  currentUserId: string;
  assignedUserName: string;
  onToggleComplete: (task: TaskModel) => void;
  onDelete: (taskId: string) => void;
  onPress: (task: TaskModel) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  currentUserId,
  assignedUserName,
  onToggleComplete,
  onDelete,
  onPress
}) => {
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
   * Formatea la fecha para mostrar
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(date);
    taskDate.setHours(0, 0, 0, 0);

    const diffTime = taskDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Hoy';
    } else if (diffDays === 1) {
      return 'Mañana';
    } else if (diffDays === -1) {
      return 'Ayer';
    } else if (diffDays < 0) {
      return `Hace ${Math.abs(diffDays)} días`;
    } else {
      return `En ${diffDays} días`;
    }
  };

  /**
   * Obtiene el primer nombre del nombre completo
   */
  const getFirstName = (fullName: string): string => {
    if (!fullName) return 'Sin nombre';
    return fullName.trim().split(' ')[0];
  };

  // Determinar si el usuario actual puede eliminar esta tarea
  const canDelete = task.createdBy === currentUserId;

  return (
    <TouchableOpacity
      style={styles.taskCard}
      onPress={() => onPress(task)}
      activeOpacity={0.7}
    >
      <View style={styles.taskHeader}>
        <View style={styles.taskTitleRow}>
          <TouchableOpacity
            style={[
              styles.checkbox,
              task.isCompleted && styles.checkboxChecked
            ]}
            onPress={(e) => {
              e.stopPropagation();
              onToggleComplete(task);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {task.isCompleted && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
          <View style={styles.taskInfo}>
            <Text
              style={[
                styles.taskTitle,
                task.isCompleted && styles.taskTitleCompleted
              ]}
              numberOfLines={1}
            >
              {task.title}
            </Text>
            {task.description && (
              <Text style={styles.taskDescription} numberOfLines={2}>
                {task.description}
              </Text>
            )}
          </View>
        </View>

        {/* Botón de eliminar solo visible si el usuario es el creador */}
        {canDelete && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.deleteButtonText}>🗑️</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.taskFooter}>
        <View style={styles.taskMeta}>
          <View
            style={[
              styles.priorityBadge,
              { backgroundColor: getPriorityColor(task.priority) }
            ]}
          >
            <Text style={styles.priorityText}>{task.priority}</Text>
          </View>
          <Text style={styles.assignedText}>
            {task.assignedTo === currentUserId || assignedUserName === 'Yo' 
              ? 'Asignado para mi' 
              : `Asignado a: ${getFirstName(assignedUserName)}`}
          </Text>
        </View>
        <Text style={[
          styles.dueDateText,
          new Date(task.dueDate) < new Date() && !task.isCompleted && styles.dueDateOverdue
        ]}>
          📅 {formatDate(task.dueDate)}
        </Text>
      </View>

      {/* Categorías */}
      {task.categories && task.categories.length > 0 && (
        <View style={styles.categoriesContainer}>
          {task.categories.slice(0, 3).map((category, index) => (
            <View key={`${category}-${index}`} style={styles.categoryTag}>
              <Text style={styles.categoryText}>{category}</Text>
            </View>
          ))}
          {task.categories.length > 3 && (
            <Text style={styles.moreCategoriesText}>
              +{task.categories.length - 3} más
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
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
    marginRight: 12,
    backgroundColor: '#fff'
  },
  checkboxChecked: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2'
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
    padding: 4,
    marginLeft: 8
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
  dueDateOverdue: {
    color: '#FF3B30',
    fontWeight: '600'
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0'
  },
  categoryTag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  categoryText: {
    color: '#1976D2',
    fontSize: 11,
    fontWeight: '500'
  },
  moreCategoriesText: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic'
  }
});

export default TaskItem;

