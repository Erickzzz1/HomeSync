/**
 * useCustomAlert - Hook para manejar alertas personalizadas
 * 
 * Proporciona funciones para mostrar diferentes tipos de alertas
 */

import { useState, useCallback } from 'react';

export type AlertType = 'success' | 'confirm' | 'error';

interface AlertState {
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

export const useCustomAlert = () => {
  const [alertState, setAlertState] = useState<AlertState>({
    visible: false,
    type: 'success',
    title: '',
    message: ''
  });

  const showSuccess = useCallback((
    message: string,
    title: string = 'Éxito',
    onOk?: () => void,
    autoClose: boolean = true,
    autoCloseDelay: number = 2000
  ) => {
    setAlertState({
      visible: true,
      type: 'success',
      title,
      message,
      onConfirm: onOk,
      autoClose,
      autoCloseDelay
    });
  }, []);

  const showError = useCallback((
    message: string,
    title: string = 'Error',
    onOk?: () => void
  ) => {
    setAlertState({
      visible: true,
      type: 'error',
      title,
      message,
      onConfirm: onOk,
      autoClose: false
    });
  }, []);

  const showConfirm = useCallback((
    message: string,
    title: string = 'Confirmar',
    onConfirm?: () => void,
    onCancel?: () => void,
    confirmText: string = 'Aceptar',
    cancelText: string = 'Cancelar'
  ) => {
    setAlertState({
      visible: true,
      type: 'confirm',
      title,
      message,
      onConfirm,
      onCancel,
      confirmText,
      cancelText,
      autoClose: false
    });
  }, []);

  const hideAlert = useCallback(() => {
    setAlertState(prev => ({ ...prev, visible: false }));
  }, []);

  return {
    alertState,
    showSuccess,
    showError,
    showConfirm,
    hideAlert
  };
};


