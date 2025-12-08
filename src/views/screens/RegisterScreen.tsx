/**
 * RegisterScreen - Vista de registro de usuario
 * 
 * Permite a nuevos usuarios crear una cuenta con validaciones
 * de seguridad implementadas en el ViewModel.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
  Dimensions
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/AppNavigator';
import { useAppDispatch } from '../../store/hooks';
import { setUser, setLoading } from '../../store/slices/authSlice';
import AuthViewModel from '../../viewmodels/AuthViewModel';
import CustomAlert from '../../components/CustomAlert';
import { useCustomAlert } from '../../hooks/useCustomAlert';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/design';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type RegisterScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Register'>;

interface Props {
  navigation: RegisterScreenNavigationProp;
}

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    displayName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  
  const dispatch = useAppDispatch();
  const { alertState, showSuccess, showError, hideAlert } = useCustomAlert();
  const authViewModel = new AuthViewModel();

  /**
   * Normaliza el nombre del usuario
   * Elimina espacios al inicio/final y reemplaza múltiples espacios internos por uno solo
   * Ejemplo: "Juan   Perez" -> "Juan Perez"
   */
  const normalizeDisplayName = (name: string): string => {
    if (!name) return '';
    // Trim espacios al inicio y final
    let normalized = name.trim();
    // Reemplazar múltiples espacios por uno solo usando regex
    normalized = normalized.replace(/\s+/g, ' ');
    return normalized;
  };

  /**
   * Extrae solo el primer nombre del nombre completo
   * Ejemplo: "Juan Perez" -> "Juan", "María José" -> "María"
   */
  const getFirstName = (fullName: string): string => {
    if (!fullName) return '';
    const normalized = normalizeDisplayName(fullName);
    // Obtener el primer nombre (antes del primer espacio)
    const firstName = normalized.split(' ')[0];
    return firstName;
  };

  /**
   * Normaliza el email
   * Convierte a minúsculas y elimina espacios
   */
  const normalizeEmail = (email: string): string => {
    return email.trim().toLowerCase();
  };

  /**
   * Maneja el registro de usuario
   * HU-02: Aplica normalización de datos y validaciones antes de enviar
   */
  const handleRegister = async () => {
    // Limpiar errores previos
    setErrors({});

    // Normalizar datos según HU-02
    const normalizedEmail = normalizeEmail(email);
    const normalizedDisplayName = displayName ? normalizeDisplayName(displayName) : '';

    // Validar campos usando el ViewModel (con datos normalizados)
    const validationErrors = authViewModel.validateSignUpForm(
      normalizedEmail,
      password,
      confirmPassword,
      normalizedDisplayName
    );

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    dispatch(setLoading(true));

    try {
      // Enviar datos normalizados al ViewModel
      const result = await authViewModel.signUp(
        normalizedEmail,
        password,
        confirmPassword,
        normalizedDisplayName || undefined // Solo enviar si hay nombre
      );

      if (result.success && result.user) {
        dispatch(setUser(result.user));
        
        // HU-02: Mensaje de bienvenida condicional e inclusivo
        // Mostrar solo el primer nombre y usar lenguaje inclusivo
        const welcomeMessage = normalizedDisplayName 
          ? `¡Bienvenid@, ${getFirstName(normalizedDisplayName)}!`
          : '¡Te damos la bienvenida!';
        
        showSuccess(
          welcomeMessage,
          '¡Registro Exitoso!',
          () => {
            hideAlert();
            // La navegación automática al AppStack ocurrirá cuando isAuthenticated cambie
            // El RootNavigator mostrará HomeScreen automáticamente
          },
          true,
          2000
        );
      } else {
        // El error ya viene normalizado del AuthRepository
        showError(result.error || 'Ocurrió un problema. Intenta más tarde', 'Error en el Registro');
      }
    } catch (error: any) {
      console.error('Error inesperado:', error);
      
      // Detectar errores de red
      if (error.message?.toLowerCase().includes('network') || 
          error.message?.toLowerCase().includes('fetch') ||
          error.message?.toLowerCase().includes('internet')) {
        showError('Error de conexión. Verifica tu internet', 'Error de Conexión');
      } else {
        showError('Ocurrió un problema. Intenta más tarde', 'Error en el Registro');
      }
    } finally {
      setIsLoading(false);
      dispatch(setLoading(false));
    }
  };

  /**
   * Vuelve a la pantalla de login
   */
  const navigateToLogin = () => {
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#FFFFFF', '#F5F8FF', '#E8F0FF']}
        style={styles.gradientBackground}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={navigateToLogin} style={styles.backButton}>
                <Ionicons name="arrow-back" size={20} color={Colors.blue} style={{ marginRight: 4 }} />
                <Text style={styles.backButtonText}>Volver</Text>
              </TouchableOpacity>
              <View style={styles.logoContainer}>
                <Image 
                  source={require('../../../assets/icon.png')} 
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.title}>Crear Cuenta</Text>
              <Text style={styles.subtitle}>
                Completa el formulario para registrarte
              </Text>
            </View>

            {/* Formulario */}
            <View style={styles.form}>
            {/* Campo Nombre */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nombre Completo (Opcional)</Text>
              <TextInput
                style={[styles.input, errors.displayName ? styles.inputError : null]}
                placeholder="Tu nombre"
                placeholderTextColor="#6B7280"
                value={displayName}
                onChangeText={(text) => {
                  setDisplayName(text);
                  if (errors.displayName) {
                    setErrors({ ...errors, displayName: undefined });
                  }
                }}
                autoCapitalize="words"
                editable={!isLoading}
              />
              {errors.displayName && (
                <Text style={styles.errorText}>{errors.displayName}</Text>
              )}
            </View>

            {/* Campo Email */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Correo Electrónico *</Text>
              <TextInput
                style={[styles.input, errors.email ? styles.inputError : null]}
                placeholder="correo@ejemplo.com"
                placeholderTextColor="#6B7280"
                value={email}
                onChangeText={(text) => {
                  // Normalizar email mientras el usuario escribe (mejor UX)
                  // Convertir a minúsculas automáticamente
                  const normalized = text.toLowerCase();
                  setEmail(normalized);
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
              <Text style={styles.label}>Contraseña *</Text>
              <TextInput
                style={[styles.input, errors.password ? styles.inputError : null]}
                placeholder="Mínimo 8 caracteres (letras y números)"
                placeholderTextColor="#6B7280"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) {
                    setErrors({ ...errors, password: undefined });
                  }
                }}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              {errors.password && (
                <Text style={styles.errorText}>{errors.password}</Text>
              )}
              <Text style={styles.helperText}>
                Debe contener letras y números para mayor seguridad
              </Text>
            </View>

            {/* Campo Confirmar Contraseña */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirmar Contraseña *</Text>
              <TextInput
                style={[styles.input, errors.confirmPassword ? styles.inputError : null]}
                placeholder="Repite tu contraseña"
                placeholderTextColor="#6B7280"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errors.confirmPassword) {
                    setErrors({ ...errors, confirmPassword: undefined });
                  }
                }}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              {errors.confirmPassword && (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              )}
            </View>

            {/* Botón de Registro */}
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              <LinearGradient
                colors={[Colors.orange, Colors.orangeDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.registerButtonGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Crear Cuenta</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Link a Login */}
            <View style={styles.loginLinkContainer}>
              <Text style={styles.loginLinkText}>
                ¿Ya tienes cuenta?{' '}
              </Text>
              <TouchableOpacity onPress={navigateToLogin} disabled={isLoading}>
                <Text style={styles.loginLink}>Inicia Sesión</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Al registrarte, aceptas nuestros términos de servicio y política de privacidad
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
    </KeyboardAvoidingView>
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
    paddingHorizontal: Math.max(Spacing.xl, SCREEN_WIDTH * 0.05),
    paddingVertical: Spacing['3xl'],
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%'
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing['4xl']
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm
  },
  backButtonText: {
    fontSize: Typography.sizes.base,
    color: Colors.blue,
    fontWeight: Typography.weights.semibold
  },
  logoContainer: {
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
  title: {
    fontSize: Typography.sizes['4xl'],
    fontWeight: Typography.weights.bold,
    color: Colors.blue,
    marginBottom: Spacing.sm,
    letterSpacing: -0.5,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: Typography.sizes.base,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.medium,
    textAlign: 'center'
  },
  form: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    ...Shadows.md
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
    backgroundColor: '#FAFBFC',
    borderRadius: BorderRadius.base,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md + 2,
    fontSize: Typography.sizes.base,
    borderWidth: 2,
    borderColor: '#E0E7FF',
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
  helperText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs
  },
  button: {
    borderRadius: BorderRadius.base,
    overflow: 'hidden',
    marginTop: Spacing.sm,
    ...Shadows.base
  },
  registerButtonGradient: {
    paddingVertical: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.base
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonText: {
    color: Colors.white,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold
  },
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    flexWrap: 'wrap'
  },
  loginLinkText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm
  },
  loginLink: {
    color: Colors.blue,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold
  },
  footer: {
    marginTop: Spacing['2xl'],
    alignItems: 'center',
    paddingHorizontal: Spacing.base
  },
  footerText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.lineHeights.relaxed * Typography.sizes.xs
  }
});

export default RegisterScreen;

