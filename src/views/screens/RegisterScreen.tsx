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
  Alert,
  ActivityIndicator
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/AppNavigator';
import { useAppDispatch } from '../../store/hooks';
import { setUser, setLoading } from '../../store/slices/authSlice';
import AuthViewModel from '../../viewmodels/AuthViewModel';

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
  const authViewModel = new AuthViewModel();

  /**
   * Maneja el registro de usuario
   * Aplica validaciones antes de enviar a Firebase
   */
  const handleRegister = async () => {
    // Limpiar errores previos
    setErrors({});

    // Validar campos usando el ViewModel
    const validationErrors = authViewModel.validateSignUpForm(
      email,
      password,
      confirmPassword,
      displayName
    );

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    dispatch(setLoading(true));

    try {
      const result = await authViewModel.signUp(
        email,
        password,
        confirmPassword,
        displayName
      );

      if (result.success && result.user) {
        dispatch(setUser(result.user));
        Alert.alert(
          '¡Registro Exitoso!',
          `Bienvenido ${displayName || 'a HomeSync'}`,
          [{ text: 'Continuar' }]
        );
      } else {
        Alert.alert('Error en el Registro', result.error || 'No se pudo completar el registro');
      }
    } catch (error) {
      console.error('Error inesperado:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado al registrar');
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
                style={[styles.input, errors.displayName && styles.inputError]}
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
                style={[styles.input, errors.email && styles.inputError]}
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
              <Text style={styles.label}>Contraseña *</Text>
              <TextInput
                style={[styles.input, errors.password && styles.inputError]}
                placeholder="Mínimo 6 caracteres (letras y números)"
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
                style={[styles.input, errors.confirmPassword && styles.inputError]}
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

