/**
 * SyncIndicator - Componente para mostrar el estado de sincronización
 * 
 * Muestra el estado actual de sincronización con el servidor
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

export type SyncStatus = 'synced' | 'syncing' | 'error' | 'offline';

interface SyncIndicatorProps {
  status: SyncStatus;
  lastSyncTime?: Date | null;
  message?: string;
}

const SyncIndicator: React.FC<SyncIndicatorProps> = ({
  status,
  lastSyncTime,
  message
}) => {
  /**
   * Formatea la última vez que se sincronizó
   */
  const formatLastSync = (): string => {
    if (!lastSyncTime) return '';
    
    const now = new Date();
    const diff = now.getTime() - lastSyncTime.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (seconds < 60) {
      return 'Hace unos segundos';
    } else if (minutes < 60) {
      return `Hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
    } else if (hours < 24) {
      return `Hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    } else {
      return lastSyncTime.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  /**
   * Obtiene el color según el estado
   */
  const getStatusColor = (): string => {
    switch (status) {
      case 'synced':
        return '#34C759';
      case 'syncing':
        return '#4A90E2';
      case 'error':
        return '#FF3B30';
      case 'offline':
        return '#FF9500';
      default:
        return '#999';
    }
  };

  /**
   * Obtiene el texto según el estado
   */
  const getStatusText = (): string => {
    if (message) return message;
    
    switch (status) {
      case 'synced':
        return 'Sincronizado';
      case 'syncing':
        return 'Sincronizando...';
      case 'error':
        return 'Error de sincronización';
      case 'offline':
        return 'Sin conexión';
      default:
        return 'Desconocido';
    }
  };

  /**
   * Obtiene el ícono según el estado
   */
  const getStatusIcon = (): string => {
    switch (status) {
      case 'synced':
        return '✓';
      case 'syncing':
        return '';
      case 'error':
        return '⚠';
      case 'offline':
        return '📡';
      default:
        return '?';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: getStatusColor() }]}>
      {status === 'syncing' ? (
        <ActivityIndicator size="small" color="#fff" style={styles.icon} />
      ) : (
        <Text style={styles.icon}>{getStatusIcon()}</Text>
      )}
      <Text style={styles.text}>{getStatusText()}</Text>
      {lastSyncTime && status === 'synced' && (
        <Text style={styles.timeText}>{formatLastSync()}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6
  },
  icon: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold'
  },
  text: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600'
  },
  timeText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 4
  }
});

export default SyncIndicator;

