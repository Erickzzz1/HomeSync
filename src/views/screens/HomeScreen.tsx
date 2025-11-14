/**
 * HomeScreen - Pantalla principal de la aplicación
 * 
 * Se muestra después de que el usuario inicia sesión exitosamente.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Platform,
  ActivityIndicator
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import AuthRepository from '../../repositories/AuthRepository';
import { AppStackParamList } from '../../navigation/AppNavigator';

type HomeScreenNavigationProp = StackNavigationProp<AppStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  /**
   * Maneja el cierre de sesión
   */
  const handleLogout = async () => {
    // En web, usar confirm; en móvil, usar Alert
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('¿Estás seguro que deseas cerrar sesión?');
      if (confirmed) {
        await performLogout();
      }
    } else {
      Alert.alert(
        'Cerrar Sesión',
        '¿Estás seguro que deseas cerrar sesión?',
        [
          {
            text: 'Cancelar',
            style: 'cancel'
          },
          {
            text: 'Cerrar Sesión',
            style: 'destructive',
            onPress: async () => {
              await performLogout();
            }
          }
        ]
      );
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
        dispatch(logout());
        console.log('✅ Sesión cerrada correctamente');
      } else {
        const errorMsg = result.error || 'No se pudo cerrar sesión';
        if (Platform.OS === 'web') {
          alert('Error: ' + errorMsg);
        } else {
          Alert.alert('Error', errorMsg);
        }
      }
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      if (Platform.OS === 'web') {
        alert('Error inesperado al cerrar sesión');
      } else {
        Alert.alert('Error', 'Error inesperado al cerrar sesión');
      }
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header de Bienvenida */}
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeEmoji}>👋</Text>
          <Text style={styles.welcomeTitle}>
            ¡Bienvenido{user?.displayName ? `, ${user.displayName}` : ''}!
          </Text>
          <Text style={styles.welcomeSubtitle}>
            Has iniciado sesión en HomeSync
          </Text>
          {user?.email && (
            <Text style={styles.userEmail}>{user.email}</Text>
          )}
        </View>

      

        {/* Botón de Ir a Tareas */}
        <TouchableOpacity
          style={styles.tasksButton}
          onPress={() => navigation.navigate('TaskList')}
        >
          <Text style={styles.tasksButtonText}>📝 Ver Mis Tareas</Text>
        </TouchableOpacity>

        {/* Botón de Cerrar Sesión */}
        <TouchableOpacity
          style={[styles.logoutButton, isLoggingOut && styles.logoutButtonDisabled]}
          onPress={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
          )}
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Versión 0.1.0 - Integración con Firebase
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  content: {
    flex: 1,
    padding: 20
  },
  welcomeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  welcomeEmoji: {
    fontSize: 48,
    marginBottom: 12
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center'
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8
  },
  userEmail: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '500'
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  featureItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20
  },
  tasksButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12
  },
  tasksButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 'auto'
  },
  logoutButtonDisabled: {
    opacity: 0.6
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  footer: {
    marginTop: 16,
    alignItems: 'center'
  },
  footerText: {
    fontSize: 12,
    color: '#999'
  }
});

export default HomeScreen;

