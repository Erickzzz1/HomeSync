/**
 * LoginScreen - Vista de inicio de sesión
 * 
 * HU-01: Inicio de sesión con correo y contraseña
 * 
 * Implementa:
 * - Validaciones de campos obligatorios
 * - Validación de formato de email (regex)
 * - Validación de contraseña (mínimo 8 caracteres)
 * - Manejo seguro de errores (nunca revela si el email existe)
 * - Persistencia de sesión con expo-secure-store
 * - Diferenciación entre errores de red y servidor
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/AppNavigator';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setUser, setLoading, setError } from '../../store/slices/authSlice';
import AuthViewModel from '../../viewmodels/AuthViewModel';
import CustomAlert from '../../components/CustomAlert';
import { useCustomAlert } from '../../hooks/useCustomAlert';
import ApiService from '../../services/ApiService';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/design';

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  
  const dispatch = useAppDispatch();
  const { alertState, showSuccess, showError, hideAlert } = useCustomAlert();
  const authViewModel = new AuthViewModel();
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);

  /**
   * Verifica si existe una sesión persistente al montar el componente
   */
  useEffect(() => {
    const checkPersistedSession = async () => {
      try {
        const token = await ApiService.getToken();
        if (token) {
          // Si hay token, el AuthRepository ya debería haber verificado la sesión
          // Solo verificamos que el estado de Redux esté sincronizado
          dispatch(setLoading(false));
        }
      } catch (error) {
        console.error('Error al verificar sesión persistente:', error);
      }
    };

    checkPersistedSession();
  }, []);

  /**
   * Redirige automáticamente si el usuario ya está autenticado
   */
  useEffect(() => {
    if (isAuthenticated) {
      // La navegación se manejará automáticamente por el RootNavigator
      // basado en el estado isAuthenticated
    }
  }, [isAuthenticated]);

  /**
   * Maneja el inicio de sesión
   * Implementa validaciones según HU-01
   */
  const handleLogin = async () => {
    // Limpiar errores previos
    setErrors({});

    // Validar campos obligatorios
    const validationErrors = authViewModel.validateSignInForm(email, password);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    dispatch(setLoading(true));

    try {
      const result = await authViewModel.signIn(email, password);

      if (result.success && result.user) {
        // Actualizar Redux store
        dispatch(setUser(result.user));
        showSuccess(
          'Has iniciado sesión correctamente',
          '¡Bienvenid@!',
          () => {
            hideAlert();
            // La navegación automática al AppStack ocurrirá cuando isAuthenticated cambie
            // El RootNavigator mostrará HomeScreen automáticamente
          },
          true,
          2000
        );
      } else {
        // Manejo de errores según HU-01
        dispatch(setError(result.error || 'No se pudo completar la solicitud. Inténtalo más tarde'));
        
        // Según HU-01: Todos los errores de credenciales muestran mensaje genérico
        if (result.errorCode === 'INVALID_CREDENTIALS') {
          // Error de credenciales: mensaje genérico (nunca revelar si el email existe)
          showError('Correo o contraseña incorrectos');
        } else if (result.errorCode === 'NETWORK_ERROR') {
          // Error de red
          showError('No hay conexión a internet');
        } else if (result.errorCode === 'VALIDATION_ERROR') {
          // Errores de validación ya se mostraron en los campos
          // No mostrar alert adicional
        } else {
          // Otros errores del servidor
          showError('No se pudo completar la solicitud. Inténtalo más tarde');
        }
      }
    } catch (error: any) {
      console.error('Error inesperado:', error);
      
      // Detectar errores de red
      if (error.message?.toLowerCase().includes('network') || 
          error.message?.toLowerCase().includes('fetch') ||
          error.message?.toLowerCase().includes('internet')) {
        showError('No hay conexión a internet');
      } else {
        showError('No se pudo completar la solicitud. Inténtalo más tarde');
      }
      
      dispatch(setError('Error inesperado'));
    } finally {
      setIsLoading(false);
      dispatch(setLoading(false));
    }
  };

  /**
   * Navega a la pantalla de registro
   */
  const navigateToRegister = () => {
    navigation.navigate('Register');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Header con gradiente */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="home" size={48} color={Colors.white} />
            </View>
            <Text style={styles.title}>HomeSync</Text>
            <Text style={styles.subtitle}>Asistente Digital del Hogar</Text>
          </View>

          {/* Formulario */}
          <View style={styles.form}>
            {/* Campo Email */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Correo Electrónico</Text>
              <TextInput
                style={[styles.input, errors.email ? styles.inputError : null]}
                placeholder="correo@ejemplo.com"
                placeholderTextColor={Colors.textTertiary}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) setErrors({ ...errors, email: undefined });
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              {errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}
            </View>

            {/* Campo Contraseña */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Contraseña</Text>
              <TextInput
                style={[styles.input, errors.password ? styles.inputError : null]}
                placeholder="Tu contraseña"
                placeholderTextColor={Colors.textTertiary}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) setErrors({ ...errors, password: undefined });
                }}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              {errors.password && (
                <Text style={styles.errorText}>{errors.password}</Text>
              )}
            </View>

            {/* Botón de Login */}
            <TouchableOpacity
              style={[styles.button, styles.loginButton, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Iniciar Sesión</Text>
              )}
            </TouchableOpacity>

            {/* Separador */}
            <View style={styles.separator}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>o</Text>
              <View style={styles.separatorLine} />
            </View>

            {/* Botón de Registro */}
            <TouchableOpacity
              style={[styles.button, styles.registerButton]}
              onPress={navigateToRegister}
              disabled={isLoading}
            >
              <Text style={styles.registerButtonText}>Crear Cuenta Nueva</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Al continuar, aceptas nuestros términos y condiciones
            </Text>
          </View>
        </View>
      </ScrollView>
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
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background
  },
  scrollContent: {
    flexGrow: 1
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
    paddingVertical: Spacing['3xl']
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing['4xl']
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
    ...Shadows.md
  },
  title: {
    fontSize: Typography.sizes['4xl'],
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    letterSpacing: -0.5
  },
  subtitle: {
    fontSize: Typography.sizes.base,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.medium
  },
  form: {
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
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.base,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md + 2,
    fontSize: Typography.sizes.base,
    borderWidth: 2,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    ...Shadows.sm
  },
  inputError: {
    borderColor: Colors.error
  },
  errorText: {
    color: Colors.error,
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs
  },
  button: {
    borderRadius: BorderRadius.base,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    ...Shadows.base
  },
  loginButton: {
    backgroundColor: Colors.blue
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonText: {
    color: Colors.textInverse,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xl
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border
  },
  separatorText: {
    marginHorizontal: Spacing.base,
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium
  },
  registerButton: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.blue
  },
  registerButtonText: {
    color: Colors.blue,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold
  },
  footer: {
    marginTop: Spacing['2xl'],
    alignItems: 'center'
  },
  footerText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    textAlign: 'center'
  }
});

export default LoginScreen;

