/**
 * FamilyGroupsScreen - Pantalla de lista de grupos familiares
 * 
 * Muestra todos los grupos familiares del usuario y permite crear nuevos grupos
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AppStackParamList } from '../../navigation/AppNavigator';
import FamilyGroupRepository from '../../repositories/FamilyGroupRepository';
import FamilyRepository from '../../repositories/FamilyRepository';
import GroupNotificationRepository from '../../repositories/GroupNotificationRepository';
import { FamilyGroupSummary } from '../../repositories/interfaces/IFamilyGroupRepository';
import { GroupNotification } from '../../repositories/interfaces/IGroupNotificationRepository';
import CustomAlert from '../../components/CustomAlert';
import { useCustomAlert } from '../../hooks/useCustomAlert';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/design';

type FamilyGroupsScreenNavigationProp = StackNavigationProp<AppStackParamList, 'FamilyGroups'>;

interface Props {
  navigation: FamilyGroupsScreenNavigationProp;
}

const FamilyGroupsScreen: React.FC<Props> = ({ navigation }) => {
  const [groups, setGroups] = useState<FamilyGroupSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [isLoadingShareCode, setIsLoadingShareCode] = useState(true);
  const [notifications, setNotifications] = useState<GroupNotification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinGroupCode, setJoinGroupCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const { alertState, showSuccess, showError, hideAlert } = useCustomAlert();

  const familyGroupRepository = new FamilyGroupRepository();
  const familyRepository = new FamilyRepository();
  const groupNotificationRepository = new GroupNotificationRepository();

  /**
   * Carga los grupos, el shareCode y las notificaciones al montar
   */
  useEffect(() => {
    loadGroups();
    loadShareCode();
    loadNotifications();
  }, []);

  /**
   * Recarga los grupos, el shareCode y las notificaciones cuando la pantalla recibe foco
   */
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadGroups();
      loadShareCode();
      loadNotifications();
    });

    return unsubscribe;
  }, [navigation]);

  /**
   * Carga la lista de grupos
   */
  const loadGroups = async () => {
    setIsLoading(true);
    try {
      const result = await familyGroupRepository.getMyFamilyGroups();
      if (result.success && result.groups) {
        setGroups(result.groups);
      } else {
        showError(result.error || 'Error al cargar los grupos');
      }
    } catch (error) {
      console.error('Error al cargar grupos:', error);
      showError('Error al cargar los grupos');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Carga el shareCode del usuario
   */
  const loadShareCode = async () => {
    setIsLoadingShareCode(true);
    try {
      const result = await familyRepository.getMyShareCode();
      if (result.success && result.shareCode) {
        setShareCode(result.shareCode);
      } else {
        console.warn('No se pudo obtener el shareCode:', result.error);
      }
    } catch (error) {
      console.error('Error al cargar shareCode:', error);
    } finally {
      setIsLoadingShareCode(false);
    }
  };

  /**
   * Carga las notificaciones de grupos
   */
  const loadNotifications = async () => {
    setIsLoadingNotifications(true);
    try {
      const result = await groupNotificationRepository.getMyGroupNotifications();
      if (result.success && result.notifications) {
        console.log('Notificaciones cargadas:', result.notifications);
        setNotifications(result.notifications);
      } else {
        console.warn('No se pudieron cargar las notificaciones:', result.error);
      }
    } catch (error) {
      console.error('Error al cargar notificaciones:', error);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  /**
   * Elimina una notificación
   */
  const handleDeleteNotification = async (notificationId: string) => {
    try {
      const result = await groupNotificationRepository.deleteGroupNotification(notificationId);
      if (result.success) {
        await loadNotifications();
      } else {
        showError(result.error || 'Error al eliminar la notificación');
      }
    } catch (error) {
      console.error('Error al eliminar notificación:', error);
      showError('Error al eliminar la notificación');
    }
  };

  /**
   * Copia el shareCode al portapapeles
   */
  const copyShareCode = async () => {
    if (!shareCode) return;
    
    try {
      if (Platform.OS === 'web') {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(shareCode);
          showSuccess('Código copiado al portapapeles', 'Éxito');
          return;
        }
        if (typeof document !== 'undefined') {
          const textArea = document.createElement('textarea');
          textArea.value = shareCode;
          textArea.style.position = 'fixed';
          textArea.style.opacity = '0';
          document.body.appendChild(textArea);
          textArea.select();
          const success = document.execCommand('copy');
          document.body.removeChild(textArea);
          if (success) {
            showSuccess('Código copiado al portapapeles', 'Éxito');
            return;
          }
        }
      } else {
        try {
          const { Clipboard } = require('react-native');
          Clipboard.setString(shareCode);
          showSuccess('Código copiado al portapapeles', 'Éxito');
          return;
        } catch {
          // Fallback
        }
      }
      Alert.alert('Mi Código', shareCode, [{ text: 'OK' }]);
    } catch (error) {
      console.error('Error al copiar:', error);
      Alert.alert('Mi Código', shareCode, [{ text: 'OK' }]);
    }
  };

  /**
   * Crea un nuevo grupo familiar
   */
  const handleCreateGroup = async () => {
    if (!newGroupName || newGroupName.trim().length < 3) {
      showError('El nombre del grupo debe tener al menos 3 caracteres');
      return;
    }

    setIsCreating(true);
    try {
      const result = await familyGroupRepository.createFamilyGroup(newGroupName.trim());
      if (result.success && result.group) {
        setNewGroupName('');
        setShowCreateModal(false);
        await loadGroups();
        showSuccess(`Grupo "${result.group.name}" creado correctamente`);
        // Navegar al detalle del grupo recién creado
        navigation.navigate('FamilyGroupDetail', { groupId: result.group.id });
      } else {
        showError(result.error || 'Error al crear el grupo');
      }
    } catch (error) {
      console.error('Error al crear grupo:', error);
      showError('Error al crear el grupo');
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Navega al detalle de un grupo
   */
  const navigateToGroupDetail = (groupId: string) => {
    navigation.navigate('FamilyGroupDetail', { groupId });
  };

  /**
   * Maneja unirse a un grupo usando el código
   */
  const handleJoinGroup = async () => {
    if (!joinGroupCode || joinGroupCode.length !== 6) {
      showError('El código del grupo debe tener 6 caracteres');
      return;
    }

    setIsJoining(true);
    try {
      const result = await familyGroupRepository.joinFamilyGroupByCode(joinGroupCode.toUpperCase());
      if (result.success && result.group) {
        setJoinGroupCode('');
        setShowJoinModal(false);
        await loadGroups();
        showSuccess(result.message || `Te has unido al grupo "${result.group.name}" correctamente`);
        // Navegar al detalle del grupo recién unido
        if (result.group.id) {
          navigation.navigate('FamilyGroupDetail', { groupId: result.group.id });
        }
      } else {
        showError(result.error || 'Error al unirse al grupo');
      }
    } catch (error) {
      console.error('Error al unirse al grupo:', error);
      showError('Error al unirse al grupo');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Notificaciones de grupos */}
        {notifications.length > 0 && (
          <View style={styles.notificationsSection}>
            <Text style={styles.notificationsSectionTitle}>Notificaciones</Text>
            {notifications.map((notification) => {
              // Determinar el estilo según el tipo de notificación
              let cardStyle = styles.notificationCard;
              let textColor = '#856404';
              
              if (notification.type === 'member_added') {
                cardStyle = [styles.notificationCard, styles.notificationCardAdded];
                textColor = '#0C5460';
              } else if (notification.type === 'member_removed') {
                cardStyle = [styles.notificationCard, styles.notificationCardRemoved];
                textColor = '#721C24';
              } else if (notification.type === 'member_left') {
                cardStyle = [styles.notificationCard, styles.notificationCardLeft];
                textColor = '#856404';
              } else if (notification.type === 'admin_assigned') {
                cardStyle = [styles.notificationCard, styles.notificationCardAdmin];
                textColor = '#0C5460';
              } else if (notification.type === 'group_deleted') {
                cardStyle = [styles.notificationCard, styles.notificationCardDeleted];
                textColor = '#856404';
              }

              return (
                <View key={notification.id} style={cardStyle}>
                  <View style={styles.notificationContent}>
                    <Text style={[styles.notificationMessage, { color: textColor }]}>
                      {notification.message}
                    </Text>
                    <Text style={[styles.notificationDate, { color: textColor, opacity: 0.7 }]}>
                      {new Date(notification.createdAt).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.notificationDeleteButton}
                    onPress={() => handleDeleteNotification(notification.id)}
                  >
                    <Ionicons name="close" size={20} color={textColor} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* Sección de Mi ShareCode */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mi Código de Compartir</Text>
          <Text style={styles.sectionDescription}>
            Comparte este código con otros usuarios para que puedan agregarte a sus grupos
          </Text>
          
          {isLoadingShareCode ? (
            <ActivityIndicator size="small" color="#0066FF" style={styles.shareCodeLoader} />
          ) : (
            <View style={styles.shareCodeContainer}>
              <Text style={styles.shareCode}>{shareCode || 'No disponible'}</Text>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={copyShareCode}
                disabled={!shareCode}
              >
                <Ionicons name="copy" size={16} color={Colors.white} style={{ marginRight: Spacing.xs }} />
                <Text style={styles.copyButtonText}>Copiar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Botones de acción */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.joinButton]}
            onPress={() => setShowJoinModal(true)}
          >
            <Ionicons name="link" size={18} color={Colors.white} style={{ marginRight: Spacing.xs }} />
            <Text style={styles.actionButtonText}>Unirse a un Grupo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.createButton]}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add" size={18} color={Colors.white} style={{ marginRight: Spacing.xs }} />
            <Text style={styles.actionButtonText}>Crear Nuevo Grupo</Text>
          </TouchableOpacity>
        </View>

        {/* Lista de grupos */}
        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#0066FF" />
            <Text style={styles.loaderText}>Cargando grupos...</Text>
          </View>
        ) : groups.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people" size={64} color={Colors.blue} />
            <Text style={styles.emptyStateTitle}>No tienes grupos familiares</Text>
            <Text style={styles.emptyStateText}>
              Crea un grupo para comenzar a organizar tareas con tu familia
            </Text>
          </View>
        ) : (
          <View style={styles.groupsList}>
            {groups.map((group) => (
              <TouchableOpacity
                key={group.id}
                style={styles.groupCard}
                onPress={() => navigateToGroupDetail(group.id)}
              >
                <View style={styles.groupCardContent}>
                  <Text style={styles.groupName}>{group.name}</Text>
                  <Text style={styles.groupMembersCount}>
                    {group.membersCount} {group.membersCount === 1 ? 'miembro' : 'miembros'}
                  </Text>
                  <Text style={styles.groupCode}>Código: {group.shareCode}</Text>
                </View>
                <Text style={styles.groupArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal para unirse a un grupo */}
      <Modal
        visible={showJoinModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowJoinModal(false);
          setJoinGroupCode('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Unirse a un Grupo</Text>
            <Text style={styles.modalDescription}>
              Ingresa el código del grupo al que deseas unirte
            </Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="ABC123"
              placeholderTextColor="#6B7280"
              value={joinGroupCode}
              onChangeText={(text) => {
                const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
                setJoinGroupCode(cleaned);
              }}
              maxLength={6}
              autoCapitalize="characters"
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowJoinModal(false);
                  setJoinGroupCode('');
                }}
                disabled={isJoining}
              >
                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCreate, isJoining && styles.modalButtonDisabled]}
                onPress={handleJoinGroup}
                disabled={isJoining || joinGroupCode.length !== 6}
              >
                {isJoining ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonCreateText}>Unirse</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para crear grupo */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Crear Nuevo Grupo</Text>
            <Text style={styles.modalDescription}>
              Ingresa un nombre para tu grupo familiar
            </Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Ej: Familia Pérez, Casa Principal..."
              placeholderTextColor="#6B7280"
              value={newGroupName}
              onChangeText={setNewGroupName}
              maxLength={50}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowCreateModal(false);
                  setNewGroupName('');
                }}
                disabled={isCreating}
              >
                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCreate, isCreating && styles.modalButtonDisabled]}
                onPress={handleCreateGroup}
                disabled={isCreating || newGroupName.trim().length < 3}
              >
                {isCreating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonCreateText}>Crear</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white
  },
  scrollContent: {
    padding: Spacing.lg
  },
  notificationsSection: {
    marginBottom: 20
  },
  notificationsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  notificationCardAdded: {
    backgroundColor: '#D1ECF1',
    borderLeftColor: '#0D6EFD'
  },
  notificationCardRemoved: {
    backgroundColor: '#F8D7DA',
    borderLeftColor: '#DC3545'
  },
  notificationCardLeft: {
    backgroundColor: '#FFE5CC',
    borderLeftColor: '#FF9500'
  },
  notificationCardAdmin: {
    backgroundColor: '#D1ECF1',
    borderLeftColor: '#0D6EFD'
  },
  notificationCardDeleted: {
    backgroundColor: '#FFF3CD',
    borderLeftColor: '#FFC107'
  },
  notificationContent: {
    flex: 1
  },
  notificationMessage: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 4,
    lineHeight: 20
  },
  notificationDate: {
    fontSize: 12,
    color: '#856404',
    opacity: 0.7
  },
  notificationDeleteButton: {
    marginLeft: 12,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center'
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.base,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.base,
    borderWidth: 1,
    borderColor: Colors.border
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm
  },
  sectionDescription: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.base,
    lineHeight: Typography.lineHeights.normal * Typography.sizes.sm
  },
  shareCodeLoader: {
    marginVertical: 20
  },
  shareCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  shareCode: {
    flex: 1,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    color: Colors.blue,
    letterSpacing: 4,
    textAlign: 'center',
    backgroundColor: Colors.blue + '15',
    padding: Spacing.base,
    borderRadius: BorderRadius.base,
    borderWidth: 2,
    borderColor: Colors.blue,
    borderStyle: 'dashed'
  },
  copyButton: {
    backgroundColor: Colors.blue,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.base
  },
  copyButtonText: {
    color: Colors.white,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20
  },
  joinButton: {
    backgroundColor: Colors.blue
  },
  createButton: {
    backgroundColor: Colors.blue
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  actionButtonText: {
    color: Colors.white,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold
  },
  loaderContainer: {
    padding: 40,
    alignItems: 'center'
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280'
  },
  emptyState: {
    padding: 40,
    alignItems: 'center'
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center'
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20
  },
  groupsList: {
    gap: 12
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.base,
    padding: Spacing.base,
    ...Shadows.base,
    borderLeftWidth: 4,
    borderLeftColor: Colors.blue
  },
  groupCardContent: {
    flex: 1
  },
  groupName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4
  },
  groupMembersCount: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4
  },
  groupCode: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'monospace'
  },
  groupArrow: {
    fontSize: 24,
    color: Colors.blue,
    marginLeft: 12
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8
  },
  modalDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 20
  },
  modalInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    color: '#1F2937'
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  modalButtonCancel: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  modalButtonCreate: {
    backgroundColor: Colors.blue
  },
  modalButtonDisabled: {
    opacity: 0.6
  },
  modalButtonCancelText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600'
  },
  modalButtonCreateText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default FamilyGroupsScreen;

