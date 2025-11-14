/**
 * LoginScreen - Vista de inicio de sesión
 * 
 * Permite a los usuarios autenticarse con email y contraseña.
 * Implementa validaciones de entrada y manejo de errores.
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
  Alert,
  ActivityIndicator
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/AppNavigator';
import { useAppDispatch } from '../../store/hooks';
import { setUser, setLoading, setError } from '../../store/slices/authSlice';
import AuthViewModel from '../../viewmodels/AuthViewModel';

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
  const authViewModel = new AuthViewModel();

  /**
   * Maneja el inicio de sesión
   */
  const handleLogin = async () => {
    // Limpiar errores previos
    setErrors({});

    // Validar campos
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
        Alert.alert('¡Bienvenido!', 'Has iniciado sesión correctamente');
      } else {
        const errorMessage = result.error || 'Error al iniciar sesión';
        dispatch(setError(errorMessage));
        
        // Debug: ver qué errorCode está llegando
        console.log('Error code recibido:', result.errorCode);
        console.log('Error message:', errorMessage);
        
        // Mostrar error en el campo correspondiente
        if (result.errorCode === 'auth/wrong-password' || 
            result.errorCode === 'auth/invalid-credential' ||
            result.errorCode === 'auth/invalid-login-credentials' ||
            errorMessage.toLowerCase().includes('contraseña') ||
            errorMessage.toLowerCase().includes('password')) {
          // Error de contraseña incorrecta - mostrar en campo de contraseña
          setErrors({ password: 'Contraseña incorrecta' });
          // También mostrar en Alert para asegurar que se vea
          if (Platform.OS === 'web') {
            alert('Contraseña incorrecta');
          } else {
            Alert.alert('Error', 'Contraseña incorrecta');
          }
        } else if (result.errorCode === 'auth/user-not-found' ||
                   errorMessage.toLowerCase().includes('no existe') ||
                   errorMessage.toLowerCase().includes('not found')) {
          // Error de email no encontrado - mostrar en campo de email
          setErrors({ email: 'No existe una cuenta con este correo electrónico' });
        } else {
          // Otros errores - mostrar en Alert y también en campo de contraseña si parece ser de contraseña
          if (Platform.OS === 'web') {
            alert(errorMessage);
          } else {
            Alert.alert('Error', errorMessage);
          }
          // Si el mensaje menciona contraseña, también mostrarlo en el campo
          if (errorMessage.toLowerCase().includes('contraseña') || 
              errorMessage.toLowerCase().includes('password')) {
            setErrors({ password: errorMessage });
          }
        }
      }
    } catch (error) {
      console.error('Error inesperado:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado');
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
              <Text style={styles.label}>Contraseña</Text>
              <TextInput
                style={[styles.input, errors.password && styles.inputError]}
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

