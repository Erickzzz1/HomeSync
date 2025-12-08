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
import { Ionicons } from '@expo/vector-icons';
import { TaskModel } from '../models/TaskModel';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/design';

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
   * Obtiene el color según la prioridad (solo azul con diferentes intensidades)
   */
  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'Alta':
        return Colors.blue;
      case 'Media':
        return Colors.priorityMedium;
      case 'Baja':
        return Colors.priorityLow;
      default:
        return Colors.blue;
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
            {task.isCompleted && <Ionicons name="checkmark" size={16} color={Colors.white} />}
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
            <Ionicons name="trash" size={20} color={Colors.orange} />
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
        <View style={styles.dueDateContainer}>
          <Ionicons name="calendar" size={14} color={new Date(task.dueDate) < new Date() && !task.isCompleted ? Colors.orange : Colors.blue} />
          <Text style={[
            styles.dueDateText,
            new Date(task.dueDate) < new Date() && !task.isCompleted && styles.dueDateOverdue
          ]}>
            {formatDate(task.dueDate)}
          </Text>
        </View>
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
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.base,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.base,
    borderLeftWidth: 4,
    borderLeftColor: Colors.blue
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
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    borderColor: Colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    backgroundColor: Colors.white
  },
  checkboxChecked: {
    backgroundColor: Colors.blue,
    borderColor: Colors.blue
  },
  taskInfo: {
    flex: 1
  },
  taskTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary
  },
  taskDescription: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    lineHeight: Typography.lineHeights.normal * Typography.sizes.sm
  },
  deleteButton: {
    padding: 4,
    marginLeft: 8
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm
  },
  priorityBadge: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm
  },
  priorityText: {
    color: Colors.textInverse,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold
  },
  assignedText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs
  },
  dueDateText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary
  },
  dueDateOverdue: {
    color: Colors.orange,
    fontWeight: Typography.weights.semibold
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.xs + 2,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border
  },
  categoryTag: {
    backgroundColor: Colors.blue + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.base
  },
  categoryText: {
    color: Colors.blue,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium
  },
  moreCategoriesText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    fontStyle: 'italic'
  }
});

export default TaskItem;

