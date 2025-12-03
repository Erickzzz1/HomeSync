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
  ActivityIndicator
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/AppNavigator';
import { useAppDispatch } from '../../store/hooks';
import { setUser, setLoading } from '../../store/slices/authSlice';
import AuthViewModel from '../../viewmodels/AuthViewModel';
import CustomAlert from '../../components/CustomAlert';
import { useCustomAlert } from '../../hooks/useCustomAlert';

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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={navigateToLogin} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Volver</Text>
            </TouchableOpacity>
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
                placeholderTextColor="#999"
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
                placeholderTextColor="#999"
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
                placeholderTextColor="#999"
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
                placeholderTextColor="#999"
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
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Crear Cuenta</Text>
              )}
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
    backgroundColor: '#fff'
  },
  scrollContent: {
    flexGrow: 1
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 40
  },
  header: {
    marginBottom: 32
  },
  backButton: {
    marginBottom: 16
  },
  backButtonText: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '600'
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#666'
  },
  form: {
    width: '100%'
  },
  inputContainer: {
    marginBottom: 20
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 2,
    borderColor: 'transparent'
  },
  inputError: {
    borderColor: '#FF3B30'
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4
  },
  helperText: {
    color: '#999',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4
  },
  button: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24
  },
  loginLinkText: {
    color: '#666',
    fontSize: 14
  },
  loginLink: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: '600'
  },
  footer: {
    marginTop: 32,
    alignItems: 'center'
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18
  }
});

export default RegisterScreen;

