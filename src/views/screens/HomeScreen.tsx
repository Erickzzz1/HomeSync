/**
 * HomeScreen - Pantalla principal de la aplicación
 * 
 * Se muestra después de que el usuario inicia sesión exitosamente.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  ActivityIndicator,
  Image,
  Dimensions,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/design';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import { clearTasks } from '../../store/slices/taskSlice';
import AuthRepository from '../../repositories/AuthRepository';
import { AppStackParamList } from '../../navigation/AppNavigator';
import CustomAlert from '../../components/CustomAlert';
import { useCustomAlert } from '../../hooks/useCustomAlert';
import { initializeNotifications, setupNotificationListeners } from '../../services/NotificationService';

type HomeScreenNavigationProp = StackNavigationProp<AppStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const { alertState, showError, showConfirm, hideAlert } = useCustomAlert();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  /**
   * Inicializa notificaciones cuando el componente se monta
   */
  useEffect(() => {
    if (user?.uid) {
      // Inicializar notificaciones
      initializeNotifications();

      // Configurar listeners de notificaciones
      const cleanup = setupNotificationListeners(
        (notification) => {
          // Notificación recibida mientras la app está en primer plano
          console.log('Notificación recibida:', notification);
        },
        (response) => {
          // Usuario tocó la notificación
          const data = response.notification.request.content.data;
          if (data?.type === 'task_assigned' || data?.type === 'task_completed' || 
              data?.type === 'task_reassigned' || data?.type === 'task_date_changed') {
            // Navegar a la lista de tareas para ver la tarea
            navigation.navigate('TaskList');
          } else if (data?.type === 'group_member_added' || data?.type === 'group_member_removed' || 
                     data?.type === 'group_member_left' || data?.type === 'group_admin_assigned' || 
                     data?.type === 'group_deleted') {
            // Navegar a grupos familiares para ver la notificación
            navigation.navigate('FamilyGroups');
          }
        }
      );

      return cleanup;
    }
  }, [user?.uid, navigation]);

  /**
   * Extrae solo el primer nombre del nombre completo
   * Ejemplo: "Juan Perez" -> "Juan", "María José" -> "María"
   */
  const getFirstName = (fullName: string | null | undefined): string => {
    if (!fullName) return '';
    // Obtener el primer nombre (antes del primer espacio)
    const firstName = fullName.trim().split(' ')[0];
    return firstName;
  };

  /**
   * Maneja el cierre de sesión
   */
  const handleLogout = () => {
    showConfirm(
      '¿Estás seguro que deseas cerrar sesión?',
      'Cerrar Sesión',
      () => performLogout(),
      undefined,
      'Cerrar Sesión',
      'Cancelar'
    );
  };

  /**
   * Ejecuta el cierre de sesión
   */
  const performLogout = async () => {
    setIsLoggingOut(true);
    try {
      const authRepository = new AuthRepository();
      const result = await authRepository.signOut();
      
      if (result.success) {
        // Limpiar tareas del estado antes de cerrar sesión
        dispatch(clearTasks());
        dispatch(logout());
        // console.log('Sesión cerrada correctamente');
      } else {
        const errorMsg = result.error || 'No se pudo cerrar sesión';
        showError(errorMsg);
      }
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      showError('Error inesperado al cerrar sesión');
    } finally {
      setIsLoggingOut(false);
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
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Header de Bienvenida */}
            <View style={styles.welcomeCard}>
              <View style={styles.welcomeIconContainer}>
                <Image 
                  source={require('../../../assets/icon.png')} 
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.welcomeTitle}>
                {user?.displayName 
                  ? `¡Bienvenid@, ${getFirstName(user.displayName)}!`
                  : '¡Bienvenid@!'}
              </Text>
              <Text style={styles.welcomeSubtitle}>
                Has iniciado sesión en HomeSync
              </Text>
              {user?.email && (
                <View style={styles.emailContainer}>
                  <Ionicons name="mail" size={16} color={Colors.blue} style={styles.emailIcon} />
                  <Text style={styles.userEmail}>{user.email}</Text>
                </View>
              )}
            </View>

            {/* Botón de Ir a Tareas */}
            <TouchableOpacity
              style={styles.tasksButton}
              onPress={() => navigation.navigate('TaskList')}
            >
              <LinearGradient
                colors={[Colors.blue, Colors.blueDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Ionicons name="list" size={20} color={Colors.white} style={styles.buttonIcon} />
                <Text style={styles.tasksButtonText}>Ver Mis Tareas</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Botón de Grupos Familiares */}
            <TouchableOpacity
              style={styles.familyButton}
              onPress={() => navigation.navigate('FamilyGroups')}
            >
              <LinearGradient
                colors={[Colors.orange, Colors.orangeDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Ionicons name="people" size={20} color={Colors.white} style={styles.buttonIcon} />
                <Text style={styles.familyButtonText}>Mis Grupos Familiares</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Botón de Cerrar Sesión */}
            <TouchableOpacity
              style={[styles.logoutButton, isLoggingOut && styles.logoutButtonDisabled]}
              onPress={handleLogout}
              disabled={isLoggingOut}
            >
              <LinearGradient
                colors={[Colors.orange, Colors.orangeDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.logoutButtonGradient}
              >
                {isLoggingOut ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Versión 0.1.0 - Integración con Firebase
              </Text>
            </View>
          </View>
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
    flexGrow: 1,
    paddingBottom: Spacing.xl
  },
  content: {
    flex: 1,
    padding: Math.max(Spacing.lg, SCREEN_WIDTH * 0.05),
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%'
  },
  welcomeCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.md
  },
  welcomeIconContainer: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
    ...Shadows.lg,
    overflow: 'hidden',
    padding: Spacing.sm
  },
  logoImage: {
    width: '90%',
    height: '90%'
  },
  welcomeTitle: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center'
  },
  welcomeSubtitle: {
    fontSize: Typography.sizes.base,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    fontWeight: Typography.weights.medium
  },
  emailContainer: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.blue + '15',
    borderRadius: BorderRadius.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs
  },
  emailIcon: {
    marginRight: Spacing.xs
  },
  userEmail: {
    fontSize: Typography.sizes.sm,
    color: Colors.blue,
    fontWeight: Typography.weights.semibold
  },
  buttonIcon: {
    marginRight: Spacing.sm
  },
  tasksButton: {
    borderRadius: BorderRadius.base,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...Shadows.base
  },
  buttonGradient: {
    paddingVertical: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.base
  },
  tasksButtonText: {
    color: Colors.white,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold
  },
  familyButton: {
    borderRadius: BorderRadius.base,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...Shadows.base
  },
  familyButtonText: {
    color: Colors.white,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold
  },
  logoutButton: {
    borderRadius: BorderRadius.base,
    marginTop: 'auto',
    overflow: 'hidden',
    ...Shadows.base
  },
  logoutButtonGradient: {
    paddingVertical: Spacing.base,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderRadius: BorderRadius.base
  },
  logoutButtonDisabled: {
    opacity: 0.6
  },
  logoutButtonText: {
    color: Colors.textInverse,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold
  },
  footer: {
    marginTop: Spacing.base,
    alignItems: 'center'
  },
  footerText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary
  }
});

export default HomeScreen;

