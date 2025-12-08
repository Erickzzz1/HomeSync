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
  Modal,
  Dimensions
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
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
      <LinearGradient
        colors={['#FFFFFF', '#F5F8FF', '#E8F0FF']}
        style={styles.gradientBackground}
      >
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
            <ActivityIndicator size="small" color={Colors.blue} style={styles.shareCodeLoader} />
          ) : (
            <View style={styles.shareCodeContainer}>
              <Text style={styles.shareCode}>{shareCode || 'No disponible'}</Text>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={copyShareCode}
                disabled={!shareCode}
              >
                <LinearGradient
                  colors={[Colors.blue, Colors.blueDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.copyButtonGradient}
                >
                  <Ionicons name="copy" size={16} color={Colors.white} style={{ marginRight: Spacing.xs }} />
                  <Text style={styles.copyButtonText}>Copiar</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Botones de acción */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowJoinModal(true)}
          >
            <LinearGradient
              colors={[Colors.blue, Colors.blueDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionButtonGradient}
            >
              <Ionicons name="link" size={16} color={Colors.white} style={{ marginRight: Spacing.xs }} />
              <Text style={styles.actionButtonText}>Unirse a un Grupo</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowCreateModal(true)}
          >
            <LinearGradient
              colors={[Colors.orange, Colors.orangeDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionButtonGradient}
            >
              <Ionicons name="add" size={16} color={Colors.white} style={{ marginRight: Spacing.xs }} />
              <Text style={styles.actionButtonText}>Crear Nuevo Grupo</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Lista de grupos */}
        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={Colors.blue} />
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
      </LinearGradient>

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
                style={[styles.modalButton, isJoining && styles.modalButtonDisabled]}
                onPress={handleJoinGroup}
                disabled={isJoining || joinGroupCode.length !== 6}
              >
                <LinearGradient
                  colors={[Colors.blue, Colors.blueDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalButtonGradient}
                >
                  {isJoining ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalButtonCreateText}>Unirse</Text>
                  )}
                </LinearGradient>
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
                style={[styles.modalButton, isCreating && styles.modalButtonDisabled]}
                onPress={handleCreateGroup}
                disabled={isCreating || newGroupName.trim().length < 3}
              >
                <LinearGradient
                  colors={[Colors.orange, Colors.orangeDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalButtonGradient}
                >
                  {isCreating ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalButtonCreateText}>Crear</Text>
                  )}
                </LinearGradient>
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
    flex: 1
  },
  gradientBackground: {
    flex: 1
  },
  scrollContent: {
    padding: Math.max(Spacing.lg, SCREEN_WIDTH * 0.05),
    paddingBottom: Spacing.xl,
    maxWidth: 700,
    alignSelf: 'center',
    width: '100%'
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
    borderRadius: BorderRadius.base,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
    ...Shadows.sm
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
    backgroundColor: Colors.blue + '20',
    borderLeftColor: Colors.blue
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
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.md
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
    backgroundColor: '#F0F7FF',
    padding: Spacing.base + 4,
    borderRadius: BorderRadius.base,
    borderWidth: 2,
    borderColor: Colors.blue,
    borderStyle: 'dashed',
    ...Shadows.sm
  },
  copyButton: {
    overflow: 'hidden',
    borderRadius: BorderRadius.base,
    ...Shadows.base
  },
  copyButtonGradient: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.base
  },
  copyButtonText: {
    color: Colors.white,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.base,
    marginBottom: Spacing.lg
  },
  actionButton: {
    flex: 1,
    borderRadius: BorderRadius.base,
    overflow: 'hidden',
    ...Shadows.base
  },
  actionButtonGradient: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderRadius: BorderRadius.base
  },
  actionButtonText: {
    color: Colors.white,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold
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
    padding: Spacing['3xl'],
    alignItems: 'center'
  },
  emptyStateTitle: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
    textAlign: 'center'
  },
  emptyStateText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.lineHeights.relaxed * Typography.sizes.sm,
    paddingHorizontal: Spacing.lg
  },
  groupsList: {
    gap: 12
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base + 4,
    marginBottom: Spacing.md,
    ...Shadows.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.blue
  },
  groupCardContent: {
    flex: 1
  },
  groupName: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs
  },
  groupMembersCount: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    fontWeight: Typography.weights.medium
  },
  groupCode: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
    fontWeight: Typography.weights.semibold
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
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
    ...Shadows.lg
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
    backgroundColor: '#FAFBFC',
    borderRadius: BorderRadius.base,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md + 2,
    fontSize: Typography.sizes.base,
    marginBottom: Spacing.lg,
    borderWidth: 2,
    borderColor: '#E0E7FF',
    color: Colors.textPrimary,
    ...Shadows.sm
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12
  },
  modalButton: {
    flex: 1,
    borderRadius: BorderRadius.base,
    overflow: 'hidden',
    ...Shadows.base
  },
  modalButtonGradient: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.base
  },
  modalButtonCancel: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.border
  },
  modalButtonDisabled: {
    opacity: 0.6
  },
  modalButtonCancelText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    paddingVertical: Spacing.md,
    textAlign: 'center'
  },
  modalButtonCreateText: {
    color: Colors.white,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold
  }
});

export default FamilyGroupsScreen;

