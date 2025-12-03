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
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/AppNavigator';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setUser, setLoading, setError } from '../../store/slices/authSlice';
import AuthViewModel from '../../viewmodels/AuthViewModel';
import CustomAlert from '../../components/CustomAlert';
import { useCustomAlert } from '../../hooks/useCustomAlert';
import ApiService from '../../services/ApiService';

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
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>🏠</Text>
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
                placeholderTextColor="#999"
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
                placeholderTextColor="#999"
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
    backgroundColor: '#fff'
  },
  scrollContent: {
    flexGrow: 1
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingVertical: 40
  },
  header: {
    alignItems: 'center',
    marginBottom: 48
  },
  logo: {
    fontSize: 64,
    marginBottom: 16
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
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8
  },
  loginButton: {
    backgroundColor: '#4A90E2'
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0'
  },
  separatorText: {
    marginHorizontal: 16,
    color: '#999',
    fontSize: 14
  },
  registerButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4A90E2'
  },
  registerButtonText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: 'bold'
  },
  footer: {
    marginTop: 32,
    alignItems: 'center'
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center'
  }
});

export default LoginScreen;

