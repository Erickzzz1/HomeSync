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
import { logout, setUser } from '../../store/slices/authSlice';
import { clearTasks } from '../../store/slices/taskSlice';
import AuthRepository from '../../repositories/AuthRepository';
import AuthViewModel from '../../viewmodels/AuthViewModel';
import { getFirebaseAuth } from '../../services/FirebaseService';
import { onAuthStateChanged } from 'firebase/auth';
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
  const { alertState, showError, showConfirm, showSuccess, hideAlert } = useCustomAlert();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [hideVerifiedBadge, setHideVerifiedBadge] = useState(false);
  const authViewModel = new AuthViewModel();

  // Resetear el estado del badge cuando el usuario se verifica
  useEffect(() => {
    if (user?.emailVerified) {
      setHideVerifiedBadge(false);
    }
  }, [user?.emailVerified]);

  /**
   * Inicializa notificaciones y listener de verificación de email cuando el componente se monta
   */
  useEffect(() => {
    if (user?.uid) {
      // Inicializar notificaciones
      initializeNotifications();

      // Configurar listeners de notificaciones
      const notificationCleanup = setupNotificationListeners(
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

      // Verificar periódicamente si el email fue verificado (solo si no está verificado)
      let checkVerificationInterval: NodeJS.Timeout | null = null;
      
      if (user && !user.emailVerified) {
        checkVerificationInterval = setInterval(async () => {
          try {
            const result = await authViewModel.reloadUser();
            // Si el email se verificó, actualizar Redux y mostrar mensaje
            if (result.success && result.user?.emailVerified) {
              // Detener el intervalo primero para evitar más ejecuciones
              if (checkVerificationInterval) {
                clearInterval(checkVerificationInterval);
                checkVerificationInterval = null;
              }
              
              // Actualizar Redux directamente para que el componente se re-renderice inmediatamente
              dispatch(setUser(result.user));
              
              showSuccess(
                '¡Email verificado!',
                'Tu correo electrónico ha sido verificado correctamente.',
                () => hideAlert(),
                true,
                3000
              );
            }
          } catch (error) {
            // Silenciar errores de polling
          }
        }, 3000); // Verificar cada 3 segundos mientras no esté verificado
      }

      // Limpiar cuando el componente se desmonte o el usuario cambie
      return () => {
        notificationCleanup();
        if (checkVerificationInterval) {
          clearInterval(checkVerificationInterval);
        }
      };
    }
  }, [user?.uid, user?.emailVerified, navigation]);

  /**
   * Efecto adicional: Detectar cuando el usuario regresa a la app después de verificar
   */
  useEffect(() => {
    if (user?.uid && !user.emailVerified) {
      // Verificar estado cuando el componente se enfoca (usuario regresa a la app)
      const checkOnFocus = async () => {
        try {
          const result = await authViewModel.reloadUser();
          // Si el email se verificó, actualizar Redux inmediatamente
          if (result.success && result.user?.emailVerified) {
            dispatch(setUser(result.user));
            showSuccess(
              '¡Email verificado!',
              'Tu correo electrónico ha sido verificado correctamente.',
              () => hideAlert(),
              true,
              3000
            );
          }
        } catch (error) {
          // Silenciar errores
        }
      };

      // Verificar inmediatamente
      checkOnFocus();

      // También verificar cuando la app vuelve al primer plano
      const subscription = navigation.addListener('focus', () => {
        checkOnFocus();
      });

      return () => {
        subscription();
      };
    }
  }, [user?.uid, user?.emailVerified, navigation, dispatch]);

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
   * Maneja el reenvío del email de verificación
   */
  const handleResendVerification = async () => {
    setIsSendingVerification(true);
    try {
      const result = await authViewModel.sendEmailVerification();
      
      if (result.success) {
        showSuccess(
          'Email de verificación enviado',
          'Revisa tu bandeja de entrada y haz clic en el enlace para verificar tu cuenta.',
          () => hideAlert(),
          true,
          4000
        );
        // Recargar usuario después de un momento para verificar si ya está verificado
        setTimeout(async () => {
          await authViewModel.reloadUser();
        }, 2000);
      } else {
        showError(result.error || 'No se pudo enviar el email de verificación');
      }
    } catch (error) {
      console.error('Error al reenviar verificación:', error);
      showError('Error inesperado al enviar el email de verificación');
    } finally {
      setIsSendingVerification(false);
    }
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
              
              {/* Banner de verificación de email */}
              {user && !user.emailVerified && (
                <View style={styles.verificationBanner}>
                  <View style={styles.verificationContent}>
                    <Ionicons name="mail-unread" size={20} color={Colors.orange} style={styles.verificationIcon} />
                    <View style={styles.verificationTextContainer}>
                      <Text style={styles.verificationTitle}>Verifica tu correo electrónico</Text>
                      <Text style={styles.verificationText}>
                        Hemos enviado un enlace de verificación a tu correo. Por favor, verifica tu cuenta.
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.resendButton, isSendingVerification && styles.resendButtonDisabled]}
                    onPress={handleResendVerification}
                    disabled={isSendingVerification}
                  >
                    {isSendingVerification ? (
                      <ActivityIndicator size="small" color={Colors.white} />
                    ) : (
                      <>
                        <Ionicons name="refresh" size={16} color={Colors.white} style={{ marginRight: 4 }} />
                        <Text style={styles.resendButtonText}>Reenviar</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
              
              {user?.emailVerified && !hideVerifiedBadge && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.green} style={{ marginRight: 4 }} />
                  <Text style={styles.verifiedText}>Correo verificado</Text>
                  <TouchableOpacity
                    onPress={() => setHideVerifiedBadge(true)}
                    style={styles.closeBadgeButton}
                  >
                    <Ionicons name="close" size={16} color={Colors.green} />
                  </TouchableOpacity>
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
  verificationBanner: {
    marginTop: Spacing.md,
    padding: Spacing.base,
    backgroundColor: '#FFF4E6',
    borderRadius: BorderRadius.base,
    borderWidth: 1,
    borderColor: Colors.orange + '40',
    ...Shadows.sm
  },
  verificationContent: {
    flexDirection: 'row',
    marginBottom: Spacing.sm
  },
  verificationIcon: {
    marginRight: Spacing.sm
  },
  verificationTextContainer: {
    flex: 1
  },
  verificationTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs
  },
  verificationText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    lineHeight: Typography.lineHeights.relaxed * Typography.sizes.xs
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.orange,
    borderRadius: BorderRadius.base,
    ...Shadows.sm
  },
  resendButtonDisabled: {
    opacity: 0.6
  },
  resendButtonText: {
    color: Colors.white,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold
  },
  verifiedBadge: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.green + '15',
    borderRadius: BorderRadius.base,
    borderWidth: 1,
    borderColor: Colors.green + '40'
  },
  verifiedText: {
    fontSize: Typography.sizes.sm,
    color: Colors.green,
    fontWeight: Typography.weights.semibold,
    flex: 1
  },
  closeBadgeButton: {
    marginLeft: Spacing.sm,
    padding: Spacing.xs,
    borderRadius: BorderRadius.full
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

