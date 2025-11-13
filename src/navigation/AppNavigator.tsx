/**
 * AppNavigator - Configuración de navegación principal
 * 
 * Gestiona la navegación entre pantallas y el flujo de autenticación
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAppSelector } from '../store/hooks';

// Importar pantallas
import LoginScreen from '../views/screens/LoginScreen';
import RegisterScreen from '../views/screens/RegisterScreen';
import HomeScreen from '../views/screens/HomeScreen';
import LoadingScreen from '../views/screens/LoadingScreen';
import TaskListScreen from '../views/screens/TaskListScreen';
import CreateTaskScreen from '../views/screens/CreateTaskScreen';
import TaskDetailScreen from '../views/screens/TaskDetailScreen';
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
 * Stack de la aplicación (después de autenticarse)
 */
const AppNavigator = () => {
  return (
    <AppStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#4A90E2'
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold'
        }
      }}
    >
      <AppStack.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ title: 'HomeSync' }}
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

