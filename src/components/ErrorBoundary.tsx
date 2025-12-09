/**
 * ErrorBoundary - Componente para capturar errores de React
 * 
 * Previene que la app se cierre completamente cuando hay un error
 * y muestra un mensaje amigable al usuario.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors, Typography, Spacing } from '../constants/design';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturó un error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>¡Oops! Algo salió mal</Text>
            <Text style={styles.message}>
              La aplicación encontró un error inesperado. Por favor, intenta reiniciar la app.
            </Text>
            
            {__DEV__ && this.state.error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorTitle}>Detalles del error (solo en desarrollo):</Text>
                <Text style={styles.errorText}>
                  {this.state.error.toString()}
                </Text>
                {this.state.errorInfo && (
                  <Text style={styles.errorText}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </View>
            )}

            <TouchableOpacity style={styles.button} onPress={this.handleReset}>
              <Text style={styles.buttonText}>Intentar de nuevo</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.large,
  },
  title: {
    ...Typography.h1,
    color: Colors.error,
    marginBottom: Spacing.medium,
    textAlign: 'center',
  },
  message: {
    ...Typography.body,
    color: Colors.textPrimary,
    marginBottom: Spacing.large,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: Colors.backgroundTertiary,
    padding: Spacing.medium,
    borderRadius: 8,
    marginBottom: Spacing.large,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.error,
  },
  errorTitle: {
    ...Typography.body,
    fontWeight: 'bold',
    color: Colors.error,
    marginBottom: Spacing.small,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: Colors.blue,
    paddingHorizontal: Spacing.large,
    paddingVertical: Spacing.medium,
    borderRadius: 8,
    minWidth: 200,
  },
  buttonText: {
    ...Typography.button,
    color: Colors.white,
    textAlign: 'center',
  },
});

export default ErrorBoundary;

