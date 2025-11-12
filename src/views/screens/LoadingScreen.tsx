/**
 * LoadingScreen - Pantalla de carga inicial
 * 
 * Se muestra mientras se verifica el estado de autenticación persistente
 */

import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

const LoadingScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#4A90E2" />
      <Text style={styles.text}>Cargando HomeSync...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500'
  }
});

export default LoadingScreen;

