/**
 * CalendarScreen - Vista de calendario para tareas
 * 
 * Muestra las tareas en un calendario mensual/semanal
 * Permite ver tareas por fecha y navegar entre meses
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Platform
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppSelector } from '../../store/hooks';
import { TaskModel } from '../../models/TaskModel';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { subscribeToTasks } from '../../services/TaskFirestoreService';
import { Unsubscribe } from 'firebase/firestore';
import { Colors } from '../../constants/design';
import { Ionicons } from '@expo/vector-icons';

type CalendarScreenNavigationProp = StackNavigationProp<AppStackParamList, 'Calendar'>;

interface Props {
  navigation: CalendarScreenNavigationProp;
}

const CalendarScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAppSelector((state) => state.auth);
  const { tasks } = useAppSelector((state) => state.tasks);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [tasksForSelectedDate, setTasksForSelectedDate] = useState<TaskModel[]>([]);
  const unsubscribeTasksRef = React.useRef<Unsubscribe | null>(null);

  /**
   * Obtiene el nombre del mes en español
   */
  const getMonthName = (date: Date): string => {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[date.getMonth()];
  };

  /**
   * Obtiene el nombre del día de la semana
   */
  const getDayName = (date: Date): string => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return days[date.getDay()];
  };

  /**
   * Formatea una fecha como YYYY-MM-DD
   */
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  /**
   * Obtiene todas las fechas del mes actual
   */
  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];

    // Agregar días del mes anterior para completar la semana
    const startDay = firstDay.getDay();
    for (let i = startDay - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      days.push(prevDate);
    }

    // Agregar días del mes actual
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }

    // Agregar días del mes siguiente para completar la semana
    const remainingDays = 42 - days.length; // 6 semanas * 7 días
    for (let day = 1; day <= remainingDays; day++) {
      days.push(new Date(year, month + 1, day));
    }

    return days;
  };

  /**
   * Obtiene las fechas de la semana actual
   */
  const getDaysInWeek = (date: Date): Date[] => {
    const day = date.getDay();
    const diff = date.getDate() - day; // Diferencia al domingo
    const sunday = new Date(date.setDate(diff));
    const days: Date[] = [];

    for (let i = 0; i < 7; i++) {
      const newDate = new Date(sunday);
      newDate.setDate(sunday.getDate() + i);
      days.push(newDate);
    }

    return days;
  };

  /**
   * Obtiene las tareas para una fecha específica
   */
  const getTasksForDate = (date: string): TaskModel[] => {
    return tasks.filter(task => {
      if (!task.dueDate) return false;
      const taskDate = task.dueDate.split('T')[0]; // Solo la parte de la fecha
      return taskDate === date;
    });
  };

  /**
   * Obtiene el número de tareas para una fecha
   */
  const getTaskCountForDate = (date: string): number => {
    return getTasksForDate(date).length;
  };

  /**
   * Verifica si una fecha tiene tareas
   */
  const hasTasks = (date: string): boolean => {
    return getTaskCountForDate(date) > 0;
  };

  /**
   * Navega al mes anterior
   */
  const goToPreviousMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  /**
   * Navega al mes siguiente
   */
  const goToNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  /**
   * Navega a la semana anterior
   */
  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  /**
   * Navega a la semana siguiente
   */
  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  /**
   * Va al día de hoy
   */
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(formatDate(new Date()));
  };

  /**
   * Maneja la selección de una fecha
   */
  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    const tasksForDate = getTasksForDate(date);
    setTasksForSelectedDate(tasksForDate);
  };

  /**
   * Obtiene el nombre del usuario asignado
   */
  const getAssignedUserName = (assignedToUid: string): string => {
    if (!assignedToUid) return 'Sin asignar';
    if (assignedToUid === user?.uid) {
      return user.displayName || user.email || 'Yo';
    }
    return assignedToUid;
  };

  /**
   * Configura el listener de tareas
   */
  useEffect(() => {
    if (!user?.uid) return;

    unsubscribeTasksRef.current = subscribeToTasks(
      user.uid,
      () => {
        // Las tareas se actualizan automáticamente desde Redux
        if (selectedDate) {
          const tasksForDate = getTasksForDate(selectedDate);
          setTasksForSelectedDate(tasksForDate);
        }
      }
    );

    return () => {
      if (unsubscribeTasksRef.current) {
        unsubscribeTasksRef.current();
      }
    };
  }, [user?.uid, selectedDate, tasks]);

  /**
   * Actualiza las tareas cuando cambia la fecha seleccionada
   */
  useEffect(() => {
    if (selectedDate) {
      const tasksForDate = getTasksForDate(selectedDate);
      setTasksForSelectedDate(tasksForDate);
    }
  }, [selectedDate, tasks]);

  /**
   * Renderiza un día del calendario
   */
  const renderDay = (date: Date, isCurrentMonth: boolean) => {
    const dateStr = formatDate(date);
    const isToday = dateStr === formatDate(new Date());
    const isSelected = selectedDate === dateStr;
    const taskCount = getTaskCountForDate(dateStr);
    const hasTasksOnDate = hasTasks(dateStr);

    return (
      <TouchableOpacity
        key={dateStr}
        style={[
          styles.dayCell,
          !isCurrentMonth && styles.dayCellOtherMonth,
          isToday && styles.dayCellToday,
          isSelected && styles.dayCellSelected
        ]}
        onPress={() => handleDateSelect(dateStr)}
      >
        <Text
          style={[
            styles.dayNumber,
            !isCurrentMonth && styles.dayNumberOtherMonth,
            isToday && styles.dayNumberToday,
            isSelected && styles.dayNumberSelected
          ]}
        >
          {date.getDate()}
        </Text>
        {hasTasksOnDate && (
          <View style={styles.taskIndicator}>
            <View style={[
              styles.taskDot,
              taskCount > 3 && styles.taskDotMany
            ]} />
            {taskCount > 1 && (
              <Text style={styles.taskCount}>{taskCount > 9 ? '9+' : taskCount}</Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  /**
   * Renderiza el encabezado del calendario
   */
  const renderHeader = () => {
    if (viewMode === 'month') {
      return (
        <View style={styles.header}>
          <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
            <Text style={styles.navButtonText}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={styles.monthName}>{getMonthName(currentDate)}</Text>
            <Text style={styles.yearName}>{currentDate.getFullYear()}</Text>
          </View>
          <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
            <Text style={styles.navButtonText}>›</Text>
          </TouchableOpacity>
        </View>
      );
    } else {
      const weekStart = getDaysInWeek(currentDate)[0];
      const weekEnd = getDaysInWeek(currentDate)[6];
      return (
        <View style={styles.header}>
          <TouchableOpacity onPress={goToPreviousWeek} style={styles.navButton}>
            <Text style={styles.navButtonText}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={styles.weekName}>
              {weekStart.getDate()} {getMonthName(weekStart)} - {weekEnd.getDate()} {getMonthName(weekEnd)}
            </Text>
            <Text style={styles.yearName}>{currentDate.getFullYear()}</Text>
          </View>
          <TouchableOpacity onPress={goToNextWeek} style={styles.navButton}>
            <Text style={styles.navButtonText}>›</Text>
          </TouchableOpacity>
        </View>
      );
    }
  };

  /**
   * Renderiza el calendario mensual
   */
  const renderMonthView = () => {
    const days = getDaysInMonth(currentDate);
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    return (
      <View style={styles.calendar}>
        {/* Días de la semana */}
        <View style={styles.weekDays}>
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day, index) => (
            <View key={index} style={styles.weekDay}>
              <Text style={styles.weekDayText}>{day}</Text>
            </View>
          ))}
        </View>

        {/* Días del mes */}
        <View style={styles.daysGrid}>
          {days.map((date) => {
            const isCurrentMonth = date.getMonth() === currentMonth && date.getFullYear() === currentYear;
            return renderDay(date, isCurrentMonth);
          })}
        </View>
      </View>
    );
  };

  /**
   * Renderiza el calendario semanal
   */
  const renderWeekView = () => {
    const days = getDaysInWeek(currentDate);

    return (
      <View style={styles.calendar}>
        {/* Días de la semana */}
        <View style={styles.weekDays}>
          {days.map((date, index) => {
            const dateStr = formatDate(date);
            const isToday = dateStr === formatDate(new Date());
            const isSelected = selectedDate === dateStr;
            const taskCount = getTaskCountForDate(dateStr);

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.weekDayColumn,
                  isToday && styles.weekDayColumnToday,
                  isSelected && styles.weekDayColumnSelected
                ]}
                onPress={() => handleDateSelect(dateStr)}
              >
                <Text style={[
                  styles.weekDayName,
                  isToday && styles.weekDayNameToday
                ]}>
                  {getDayName(date)}
                </Text>
                <Text style={[
                  styles.weekDayNumber,
                  isToday && styles.weekDayNumberToday
                ]}>
                  {date.getDate()}
                </Text>
                {taskCount > 0 && (
                  <View style={styles.weekTaskIndicator}>
                    <Text style={styles.weekTaskCount}>{taskCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Selector de vista */}
      <View style={styles.viewModeSelector}>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'month' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('month')}
        >
          <Text style={[styles.viewModeText, viewMode === 'month' && styles.viewModeTextActive]}>
            Mes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'week' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('week')}
        >
          <Text style={[styles.viewModeText, viewMode === 'week' && styles.viewModeTextActive]}>
            Semana
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.todayButton}
          onPress={goToToday}
        >
          <Text style={styles.todayButtonText}>Hoy</Text>
        </TouchableOpacity>
      </View>

      {/* Encabezado del calendario */}
      {renderHeader()}

      {/* Calendario */}
      <ScrollView style={styles.calendarContainer}>
        {viewMode === 'month' ? renderMonthView() : renderWeekView()}

        {/* Tareas del día seleccionado */}
        {selectedDate && (
          <View style={styles.tasksContainer}>
            <View style={styles.tasksHeader}>
              <Text style={styles.tasksHeaderText}>
                Tareas del {new Date(selectedDate).toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </Text>
              <Text style={styles.tasksCount}>
                {tasksForSelectedDate.length} {tasksForSelectedDate.length === 1 ? 'tarea' : 'tareas'}
              </Text>
            </View>

            {tasksForSelectedDate.length === 0 ? (
              <View style={styles.emptyTasks}>
                <Text style={styles.emptyTasksText}>No hay tareas para esta fecha</Text>
              </View>
            ) : (
              tasksForSelectedDate.map((task) => (
                <TouchableOpacity
                  key={task.id}
                  style={styles.taskCard}
                  onPress={() => navigation.navigate('TaskDetail', { task })}
                >
                  <View style={styles.taskCardContent}>
                    <View style={styles.taskCardHeader}>
                      <Text style={styles.taskCardTitle}>{task.title}</Text>
                      {task.priority && (
                        <View style={[
                          styles.taskCardPriority,
                          task.priority === 'Alta' && styles.taskCardPriorityHigh,
                          task.priority === 'Media' && styles.taskCardPriorityMedium,
                          task.priority === 'Baja' && styles.taskCardPriorityLow
                        ]}>
                          <Text style={styles.taskCardPriorityText}>{task.priority}</Text>
                        </View>
                      )}
                    </View>
                    {task.description && (
                      <Text style={styles.taskCardDescription} numberOfLines={2}>
                        {task.description}
                      </Text>
                    )}
                    <View style={styles.taskCardFooter}>
                      <View style={styles.taskCardAssignedContainer}>
                        <Ionicons name="person" size={14} color={Colors.blue} style={{ marginRight: 4 }} />
                        <Text style={styles.taskCardAssigned}>
                          {getAssignedUserName(task.assignedTo)}
                        </Text>
                      </View>
                      {task.categories && task.categories.length > 0 && (
                        <View style={styles.taskCardCategories}>
                          {task.categories.slice(0, 3).map((cat, idx) => (
                            <View key={idx} style={styles.taskCardCategory}>
                              <Text style={styles.taskCardCategoryText}>{cat}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA'
  },
  viewModeSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 8,
    alignItems: 'center'
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    alignItems: 'center'
  },
  viewModeButtonActive: {
    backgroundColor: Colors.blue
  },
  viewModeText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500'
  },
  viewModeTextActive: {
    color: '#FFFFFF',
    fontWeight: '600'
  },
  todayButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.blue,
    alignItems: 'center'
  },
  todayButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center'
  },
  navButtonText: {
    fontSize: 24,
    color: Colors.blue,
    fontWeight: 'bold'
  },
  headerTitle: {
    alignItems: 'center'
  },
  monthName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937'
  },
  weekName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937'
  },
  yearName: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2
  },
  calendarContainer: {
    flex: 1
  },
  calendar: {
    backgroundColor: '#FFFFFF',
    padding: 16
  },
  weekDays: {
    flexDirection: 'row',
    marginBottom: 8
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280'
  },
  weekDayColumn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 2
  },
  weekDayColumnToday: {
    backgroundColor: '#E3F2FD'
  },
  weekDayColumnSelected: {
    backgroundColor: Colors.blue
  },
  weekDayName: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4
  },
  weekDayNameToday: {
    color: Colors.blue,
    fontWeight: '600'
  },
  weekDayNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937'
  },
  weekDayNumberToday: {
    color: Colors.blue
  },
  weekTaskIndicator: {
    marginTop: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.blue,
    alignItems: 'center',
    justifyContent: 'center'
  },
  weekTaskCount: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold'
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    borderRadius: 8,
    margin: 1
  },
  dayCellOtherMonth: {
    opacity: 0.3
  },
  dayCellToday: {
    backgroundColor: '#E3F2FD'
  },
  dayCellSelected: {
    backgroundColor: Colors.blue
  },
  dayNumber: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500'
  },
  dayNumberOtherMonth: {
    color: '#6B7280'
  },
  dayNumberToday: {
    color: Colors.blue,
    fontWeight: 'bold'
  },
  dayNumberSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold'
  },
  taskIndicator: {
    position: 'absolute',
    bottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2
  },
  taskDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.blue
  },
  taskDotMany: {
    backgroundColor: Colors.blueDark
  },
  taskCount: {
    fontSize: 8,
    color: '#6B7280',
    fontWeight: '600'
  },
  tasksContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginTop: 16
  },
  tasksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  tasksHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1
  },
  tasksCount: {
    fontSize: 14,
    color: '#6B7280'
  },
  emptyTasks: {
    padding: 32,
    alignItems: 'center'
  },
  emptyTasksText: {
    fontSize: 14,
    color: '#6B7280'
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  taskCardContent: {
    gap: 8
  },
  taskCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  taskCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1
  },
  taskCardPriority: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8
  },
  taskCardPriorityHigh: {
    backgroundColor: Colors.orange
  },
  taskCardPriorityMedium: {
    backgroundColor: Colors.blue
  },
  taskCardPriorityLow: {
    backgroundColor: Colors.priorityLow
  },
  taskCardPriorityText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600'
  },
  taskCardDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20
  },
  taskCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4
  },
  taskCardAssignedContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  taskCardAssigned: {
    fontSize: 12,
    color: '#6B7280'
  },
  taskCardCategories: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap'
  },
  taskCardCategory: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  taskCardCategoryText: {
    fontSize: 10,
    color: Colors.blue,
    fontWeight: '500'
  }
});

export default CalendarScreen;

