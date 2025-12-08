/**
 * CustomAlert - Componente de alerta personalizado
 * 
 * Reemplaza los Alert nativos con un diseño personalizado que incluye:
 * - Animación de paloma azul para mensajes de éxito
 * - Botones de aceptar/cancelar para confirmaciones
 * - Animaciones suaves de entrada y salida
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Platform,
  Dimensions
} from 'react-native';
import { Colors } from '../constants/design';
import { Ionicons } from '@expo/vector-icons';

export type AlertType = 'success' | 'confirm' | 'error';

interface CustomAlertProps {
  visible: boolean;
  type: AlertType;
  title: string;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

const { width } = Dimensions.get('window');

const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  type,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  autoClose = false,
  autoCloseDelay = 2000
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Animación de entrada
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true
        })
      ]).start();

      // Animación de la paloma (solo para éxito)
      if (type === 'success') {
        Animated.sequence([
          Animated.delay(100),
          Animated.spring(checkmarkScale, {
            toValue: 1,
            useNativeDriver: true,
            tension: 100,
            friction: 3
          })
        ]).start();
      }

      // Auto-cerrar si está habilitado
      if (autoClose && type === 'success') {
        const timer = setTimeout(() => {
          handleClose();
        }, autoCloseDelay);
        return () => clearTimeout(timer);
      }
    } else {
      // Resetear animaciones al cerrar
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      checkmarkScale.setValue(0);
    }
  }, [visible, type, autoClose, autoCloseDelay]);

  const handleClose = () => {
    // Cerrar el modal inmediatamente para evitar que el overlay se quede
    if (onCancel) {
      onCancel();
    }
    
    // Ejecutar la animación de salida
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true
      })
    ]).start(() => {
      // Para alerts de éxito, ejecutar onConfirm después de la animación si existe
      if (type === 'success' && onConfirm) {
        onConfirm();
      }
    });
  };

  const handleConfirm = () => {
    // Cerrar el modal inmediatamente para evitar que el overlay se quede
    if (onCancel) {
      onCancel();
    }
    
    // Ejecutar la animación de salida
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true
      })
    ]).start(() => {
      // Ejecutar el callback después de la animación si existe
      if (onConfirm) {
        onConfirm();
      }
    });
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <Animated.View
            style={[
              styles.iconContainer,
              styles.successIconContainer,
              {
                transform: [{ scale: checkmarkScale }]
              }
            ]}
          >
            <Ionicons name="checkmark" size={36} color="#FFFFFF" />
          </Animated.View>
        );
      case 'error':
        return (
          <View style={[styles.iconContainer, styles.errorIconContainer]}>
            <Ionicons name="close" size={36} color="#FFFFFF" />
          </View>
        );
      default:
        return null;
    }
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.alertContainer,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim
            }
          ]}
        >
          {/* Icono */}
          {getIcon()}

          {/* Título */}
          <Text style={styles.title}>{title}</Text>

          {/* Mensaje */}
          <Text style={styles.message}>{message}</Text>

          {/* Botones */}
          <View style={styles.buttonContainer}>
            {type === 'confirm' ? (
              <>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={handleClose}
                >
                  <Text style={styles.cancelButtonText}>{cancelText}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.confirmButton]}
                  onPress={handleConfirm}
                >
                  <Text style={styles.confirmButtonText}>{confirmText}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.successButton]}
                onPress={() => {
                  // Para errores y success, siempre cerrar el modal
                  handleConfirm();
                }}
              >
                <Text style={styles.successButtonText}>
                  {type === 'error' ? 'Aceptar' : 'OK'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  alertContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: width * 0.85,
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  successIconContainer: {
    backgroundColor: Colors.blue
  },
  errorIconContainer: {
    backgroundColor: Colors.orange
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center'
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  successButton: {
    backgroundColor: Colors.blue
  },
  successButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold'
  },
  confirmButton: {
    backgroundColor: Colors.blue
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold'
  },
  cancelButton: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default CustomAlert;

