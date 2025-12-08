/**
 * AppNavigator - Configuración de navegación principal
 * 
 * Gestiona la navegación entre pantallas y el flujo de autenticación
 */

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { Colors } from '../constants/design';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, View, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, BorderRadius } from '../constants/design';
import { logout } from '../store/slices/authSlice';
import { clearTasks } from '../store/slices/taskSlice';
import AuthRepository from '../repositories/AuthRepository';
import CustomAlert from '../components/CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';

// Importar pantallas
import LoginScreen from '../views/screens/LoginScreen';
import RegisterScreen from '../views/screens/RegisterScreen';
import HomeScreen from '../views/screens/HomeScreen';
import LoadingScreen from '../views/screens/LoadingScreen';
import TaskListScreen from '../views/screens/TaskListScreen';
import CreateTaskScreen from '../views/screens/CreateTaskScreen';
import TaskDetailScreen from '../views/screens/TaskDetailScreen';
import FamilyScreen from '../views/screens/FamilyScreen';
import FamilyGroupsScreen from '../views/screens/FamilyGroupsScreen';
import FamilyGroupDetailScreen from '../views/screens/FamilyGroupDetailScreen';
import CalendarScreen from '../views/screens/CalendarScreen';
import { TaskModel } from '../models/TaskModel';

/**
 * Tipos de parámetros para las rutas
 */
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type AppStackParamList = {
  Home: undefined;
  TaskList: undefined;
  CreateTask: undefined;
  TaskDetail: { task: TaskModel };
  Family: undefined;
  FamilyGroups: undefined;
  FamilyGroupDetail: { groupId: string };
  Calendar: undefined;
};

const AuthStack = createStackNavigator<AuthStackParamList>();
const AppStack = createStackNavigator<AppStackParamList>();

/**
 * Stack de autenticación (Login y Registro)
 */
const AuthNavigator = () => {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#fff' }
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
};

/**
 * Componente de header con gradiente
 */
const GradientHeader = () => (
  <LinearGradient
    colors={[Colors.blue, Colors.blueDark]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 0 }}
    style={{ flex: 1 }}
  />
);

/**
 * Componente de botón de logout para el header
 */
const LogoutHeaderButton = () => {
  const dispatch = useAppDispatch();
  const { alertState, showError, showConfirm, hideAlert } = useCustomAlert();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  const performLogout = async () => {
    setIsLoggingOut(true);
    try {
      const authRepository = new AuthRepository();
      const result = await authRepository.signOut();
      
      if (result.success) {
        dispatch(clearTasks());
        dispatch(logout());
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
    <>
      <TouchableOpacity
        onPress={handleLogout}
        disabled={isLoggingOut}
        style={headerStyles.logoutButton}
      >
        {isLoggingOut ? (
          <ActivityIndicator size="small" color={Colors.white} />
        ) : (
          <>
            <Ionicons name="log-out-outline" size={16} color={Colors.white} style={{ marginRight: Spacing.xs }} />
            <Text style={headerStyles.logoutButtonText}>Cerrar Sesión</Text>
          </>
        )}
      </TouchableOpacity>
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
    </>
  );
};

const headerStyles = StyleSheet.create({
  logoutButton: {
    marginRight: Spacing.base,
    marginVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: BorderRadius.base,
    borderWidth: 1,
    borderColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center'
  },
  logoutButtonText: {
    color: Colors.white,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold
  }
});

/**
 * Stack de la aplicación (después de autenticarse)
 */
const AppNavigator = () => {
  return (
    <AppStack.Navigator
      screenOptions={{
        headerBackground: () => <GradientHeader />,
        headerTintColor: Colors.white,
        headerTitleStyle: {
          fontWeight: 'bold'
        },
        headerStyle: {
          ...(Platform.OS === 'android' && {
            elevation: 0,
            borderBottomWidth: 0
          })
        }
      }}
    >
      <AppStack.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ 
          title: 'HomeSync',
          headerRight: () => <LogoutHeaderButton />
        }}
      />
      <AppStack.Screen 
        name="TaskList" 
        component={TaskListScreen}
        options={{ title: 'Mis Tareas' }}
      />
      <AppStack.Screen 
        name="CreateTask" 
        component={CreateTaskScreen}
        options={{ title: 'Nueva Tarea' }}
      />
      <AppStack.Screen 
        name="TaskDetail" 
        component={TaskDetailScreen}
        options={{ title: 'Detalle de Tarea' }}
      />
      <AppStack.Screen 
        name="Family" 
        component={FamilyScreen}
        options={{ title: 'Mi Familia' }}
      />
      <AppStack.Screen 
        name="FamilyGroups" 
        component={FamilyGroupsScreen}
        options={{ title: 'Mis Grupos Familiares' }}
      />
      <AppStack.Screen 
        name="FamilyGroupDetail" 
        component={FamilyGroupDetailScreen}
        options={{ title: 'Detalle del Grupo' }}
      />
      <AppStack.Screen 
        name="Calendar" 
        component={CalendarScreen}
        options={{ title: 'Calendario' }}
      />
    </AppStack.Navigator>
  );
};

/**
 * Navegador raíz - decide qué stack mostrar según autenticación
 */
const RootNavigator = () => {
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);

  // Mostrar pantalla de carga mientras verifica la sesión
  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

export default RootNavigator;

