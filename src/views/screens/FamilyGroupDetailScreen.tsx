/**
 * FamilyGroupDetailScreen - Pantalla de detalle de un grupo familiar
 * 
 * Muestra los miembros del grupo y permite agregar/eliminar miembros
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
  Platform,
  Dimensions
} from 'react-native';
import { StackNavigationProp, RouteProp } from '@react-navigation/stack';
import { AppStackParamList } from '../../navigation/AppNavigator';
import FamilyGroupRepository from '../../repositories/FamilyGroupRepository';
import { FamilyGroup, FamilyGroupMember } from '../../repositories/interfaces/IFamilyGroupRepository';
import CustomAlert from '../../components/CustomAlert';
import { useCustomAlert } from '../../hooks/useCustomAlert';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/design';
import { useAppSelector } from '../../store/hooks';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Clipboard - usar API nativa según plataforma
const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (Platform.OS === 'web') {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      if (typeof document !== 'undefined') {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);
        return success;
      }
      return false;
    } else {
      try {
        const { Clipboard } = require('react-native');
        Clipboard.setString(text);
        return true;
      } catch {
        return false;
      }
    }
  } catch (error) {
    console.error('Error al copiar:', error);
    return false;
  }
};

type FamilyGroupDetailScreenNavigationProp = StackNavigationProp<AppStackParamList, 'FamilyGroupDetail'>;
type FamilyGroupDetailScreenRouteProp = RouteProp<AppStackParamList, 'FamilyGroupDetail'>;

interface Props {
  navigation: FamilyGroupDetailScreenNavigationProp;
  route: FamilyGroupDetailScreenRouteProp;
}

const FamilyGroupDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { groupId } = route.params;
  const { user } = useAppSelector((state) => state.auth);
  
  const [group, setGroup] = useState<FamilyGroup | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newShareCode, setNewShareCode] = useState('');
  const { alertState, showSuccess, showError, showConfirm, hideAlert } = useCustomAlert();

  const familyGroupRepository = new FamilyGroupRepository();

  /**
   * Carga el grupo al montar
   */
  useEffect(() => {
    loadGroup();
  }, [groupId]);

  /**
   * Recarga el grupo cuando la pantalla recibe foco
   */
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadGroup();
    });

    return unsubscribe;
  }, [navigation, groupId]);

  /**
   * Carga los detalles del grupo
   */
  const loadGroup = async () => {
    setIsLoading(true);
    try {
      const result = await familyGroupRepository.getFamilyGroup(groupId);
      if (result.success && result.group) {
        setGroup(result.group);
      } else {
        showError(result.error || 'Error al cargar el grupo');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error al cargar grupo:', error);
      showError('Error al cargar el grupo');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Copia el shareCode del grupo al portapapeles
   */
  const copyShareCode = async () => {
    if (!group) return;
    const success = await copyToClipboard(group.shareCode);
    if (success) {
      showSuccess('Código copiado al portapapeles', 'Éxito');
    } else {
      Alert.alert('Código del Grupo', group.shareCode, [{ text: 'OK' }]);
    }
  };

  /**
   * Agrega un nuevo miembro al grupo
   */
  const handleAddMember = async () => {
    if (!newShareCode || newShareCode.trim().length !== 6) {
      showError('El código debe tener exactamente 6 caracteres');
      return;
    }

    setIsAdding(true);
    try {
      const result = await familyGroupRepository.addGroupMember(groupId, newShareCode.toUpperCase().trim());
      if (result.success && result.member) {
        setNewShareCode('');
        await loadGroup();
        showSuccess(
          `${result.member.displayName || 'Usuario'} agregado al grupo`,
          'Miembro Agregado'
        );
      } else {
        showError(result.error || 'Error al agregar el miembro');
      }
    } catch (error) {
      console.error('Error al agregar miembro:', error);
      showError('Error al agregar el miembro');
    } finally {
      setIsAdding(false);
    }
  };

  /**
   * Elimina un miembro del grupo
   */
  const handleRemoveMember = (member: FamilyGroupMember) => {
    showConfirm(
      `¿Estás seguro que deseas eliminar a ${member.displayName || member.email} del grupo?`,
      'Eliminar Miembro',
      async () => {
        setIsLoading(true);
        try {
          console.log('Intentando eliminar miembro:', member.uid);
          const result = await familyGroupRepository.removeGroupMember(groupId, member.uid);
          console.log('Resultado de eliminar miembro:', result);
          if (result.success) {
            await loadGroup();
            showSuccess('Miembro eliminado del grupo', 'Eliminado');
          } else {
            showError(result.error || 'Error al eliminar el miembro');
          }
        } catch (error) {
          console.error('Error al eliminar miembro:', error);
          showError('Error al eliminar el miembro');
        } finally {
          setIsLoading(false);
        }
      },
      undefined,
      'Eliminar',
      'Cancelar'
    );
  };

  /**
   * Cambia el rol de un miembro
   */
  const handleChangeRole = async (member: FamilyGroupMember, newRole: 'admin' | 'member') => {
    if (!group) return;
    
    const currentUserRole = group.roles?.[user?.uid || ''] || 'member';
    if (currentUserRole !== 'admin') {
      showError('Solo los administradores pueden cambiar roles');
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await familyGroupRepository.updateGroupMemberRole(groupId, member.uid, newRole);
      if (result.success) {
        await loadGroup();
        showSuccess(`Rol de ${member.displayName || member.email} actualizado a ${newRole === 'admin' ? 'Administrador' : 'Miembro'}`);
      } else {
        showError(result.error || 'Error al actualizar el rol');
      }
    } catch (error) {
      console.error('Error al cambiar rol:', error);
      showError('Error al cambiar el rol');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Permite al usuario salir del grupo
   */
  const handleLeaveGroup = () => {
    if (!group) return;
    
    showConfirm(
      `¿Estás seguro que deseas abandonar el grupo "${group.name}"? Los demás miembros serán notificados.`,
      'Abandonar Grupo',
      async () => {
        setIsLoading(true);
        try {
          const result = await familyGroupRepository.leaveFamilyGroup(groupId);
          if (result.success) {
            showSuccess('Has abandonado el grupo correctamente');
            navigation.goBack();
          } else {
            showError(result.error || 'Error al abandonar el grupo');
          }
        } catch (error) {
          console.error('Error al abandonar grupo:', error);
          showError('Error al abandonar el grupo');
        } finally {
          setIsLoading(false);
        }
      },
      undefined,
      'Abandonar',
      'Cancelar'
    );
  };

  /**
   * Elimina el grupo
   */
  const handleDeleteGroup = () => {
    if (!group) return;
    
    showConfirm(
      `¿Estás seguro que deseas eliminar el grupo "${group.name}"? Esta acción no se puede deshacer.`,
      'Eliminar Grupo',
      async () => {
        setIsLoading(true);
        try {
          console.log('Intentando eliminar grupo:', groupId);
          const result = await familyGroupRepository.deleteFamilyGroup(groupId);
          console.log('Resultado de eliminar grupo:', result);
          if (result.success) {
            showSuccess('Grupo eliminado correctamente');
            navigation.goBack();
          } else {
            showError(result.error || 'Error al eliminar el grupo');
          }
        } catch (error) {
          console.error('Error al eliminar grupo:', error);
          showError('Error al eliminar el grupo');
        } finally {
          setIsLoading(false);
        }
      },
      undefined,
      'Eliminar',
      'Cancelar'
    );
  };

  if (isLoading && !group) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={Colors.blue} />
          <Text style={styles.loaderText}>Cargando grupo...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!group) {
    return null;
  }

  const currentUserRole = group.roles?.[user?.uid || ''] || 'member';
  const isCurrentUserAdmin = currentUserRole === 'admin';
  const isCurrentUserCreator = group.createdBy === user?.uid;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#FFFFFF', '#F5F8FF', '#E8F0FF']}
        style={styles.gradientBackground}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Información del grupo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{group.name}</Text>
          
          {/* ShareCode del grupo */}
          <View style={styles.shareCodeContainer}>
            <Text style={styles.shareCodeLabel}>Código del Grupo</Text>
            <View style={styles.shareCodeRow}>
              <Text style={styles.shareCode}>{group.shareCode}</Text>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={copyShareCode}
              >
                <LinearGradient
                  colors={[Colors.blue, Colors.blueDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.copyButtonGradient}
                >
                  <Ionicons name="copy" size={14} color={Colors.white} style={{ marginRight: Spacing.xs }} />
                  <Text style={styles.copyButtonText}>Copiar</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            <Text style={styles.shareCodeDescription}>
              Comparte este código para que otros puedan unirse al grupo
            </Text>
          </View>

          {/* Botón salir del grupo (visible para todos) */}
          <TouchableOpacity
            style={[styles.leaveGroupButton, isLoading && styles.buttonDisabled]}
            onPress={handleLeaveGroup}
            disabled={isLoading}
          >
            <LinearGradient
              colors={[Colors.blue, Colors.blueDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.leaveGroupButtonGradient}
            >
              <Ionicons name="log-out" size={16} color={Colors.white} style={{ marginRight: Spacing.xs }} />
              <Text style={styles.leaveGroupButtonText}>Salir del Grupo</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Botón eliminar grupo (solo para creador o admin) */}
          {(isCurrentUserAdmin || isCurrentUserCreator) && (
            <TouchableOpacity
              style={[styles.deleteGroupButton, isLoading && styles.buttonDisabled]}
              onPress={() => {
                console.log('Botón eliminar grupo presionado. isAdmin:', isCurrentUserAdmin, 'isCreator:', isCurrentUserCreator);
                handleDeleteGroup();
              }}
              disabled={isLoading}
            >
              <LinearGradient
                colors={[Colors.orange, Colors.orangeDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.deleteGroupButtonGradient}
              >
                <Ionicons name="trash" size={16} color={Colors.white} style={{ marginRight: Spacing.xs }} />
                <Text style={styles.deleteGroupButtonText}>Eliminar Grupo</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* Agregar miembro */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Agregar Miembro</Text>
          <Text style={styles.sectionDescription}>
            Ingresa el código de compartir de la persona que deseas agregar
          </Text>
          
          <View style={styles.addMemberContainer}>
            <TextInput
              style={styles.shareCodeInput}
              placeholder="ABC123"
              placeholderTextColor="#6B7280"
              value={newShareCode}
              onChangeText={(text) => {
                const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
                setNewShareCode(cleaned);
              }}
              maxLength={6}
              autoCapitalize="characters"
              editable={!isAdding}
            />
            <TouchableOpacity
              style={[styles.addButton, isAdding && styles.buttonDisabled]}
              onPress={handleAddMember}
              disabled={isAdding || newShareCode.length !== 6}
            >
              <LinearGradient
                colors={[Colors.blue, Colors.blueDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.addButtonGradient}
              >
                {isAdding ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.addButtonText}>Agregar</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Lista de miembros */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Miembros ({group.members.length})
          </Text>
          
          {group.members.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No hay miembros en el grupo aún
              </Text>
            </View>
          ) : (
            <View style={styles.membersList}>
              {group.members.map((member) => {
                const isCurrentUser = member.uid === user?.uid;
                const canChangeRole = isCurrentUserAdmin && !isCurrentUser;
                const canRemoveMember = isCurrentUserAdmin && !isCurrentUser;
                
                return (
                  <View key={member.uid} style={styles.memberCard}>
                    <View style={styles.memberInfo}>
                      <View style={styles.memberHeader}>
                        <Text style={styles.memberName}>
                          {member.displayName || 'Sin nombre'}
                          {isCurrentUser && <Text style={styles.currentUserBadge}> (Tú)</Text>}
                        </Text>
                        <View style={[
                          styles.roleBadge,
                          member.role === 'admin' && styles.roleBadgeAdmin
                        ]}>
                          <Ionicons 
                            name={member.role === 'admin' ? 'star' : 'person'} 
                            size={12} 
                            color={member.role === 'admin' ? '#8B6914' : '#6B7280'} 
                            style={{ marginRight: 4 }} 
                          />
                          <Text style={[
                            styles.roleBadgeText,
                            member.role === 'admin' && styles.roleBadgeTextAdmin
                          ]}>
                            {member.role === 'admin' ? 'Admin' : 'Miembro'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.memberEmail}>{member.email}</Text>
                      
                      {/* Selector de rol (solo para admins y no para sí mismo) */}
                      {canChangeRole && (
                        <View style={styles.roleSelector}>
                          <Text style={styles.roleLabel}>Cambiar rol:</Text>
                          <View style={styles.roleButtons}>
                            <TouchableOpacity
                              style={[
                                styles.roleButton,
                                member.role === 'admin' && styles.roleButtonActive
                              ]}
                              onPress={() => handleChangeRole(member, 'admin')}
                              disabled={isLoading || member.role === 'admin'}
                            >
                              <Text style={[
                                styles.roleButtonText,
                                member.role === 'admin' && styles.roleButtonTextActive
                              ]}>
                                Admin
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[
                                styles.roleButton,
                                member.role === 'member' && styles.roleButtonActive
                              ]}
                              onPress={() => handleChangeRole(member, 'member')}
                              disabled={isLoading || member.role === 'member'}
                            >
                              <Text style={[
                                styles.roleButtonText,
                                member.role === 'member' && styles.roleButtonTextActive
                              ]}>
                                Miembro
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                    {/* Botón eliminar solo visible para admins y no para sí mismo */}
                    {canRemoveMember && (
                      <TouchableOpacity
                        style={[styles.removeButton, isLoading && styles.buttonDisabled]}
                        onPress={() => {
                          console.log('Botón eliminar presionado para:', member.uid);
                          handleRemoveMember(member);
                        }}
                        disabled={isLoading}
                      >
                        <LinearGradient
                          colors={[Colors.orange, Colors.orangeDark]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.removeButtonGradient}
                        >
                          <Text style={styles.removeButtonText}>Eliminar</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
        </ScrollView>
      </LinearGradient>

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
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280'
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.md
  },
  sectionTitle: {
    fontSize: Typography.sizes['2xl'],
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
  shareCodeContainer: {
    marginTop: 12
  },
  shareCodeLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8
  },
  shareCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8
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
    paddingVertical: Spacing.md,
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
  shareCodeDescription: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center'
  },
  leaveGroupButton: {
    marginTop: Spacing.base,
    borderRadius: BorderRadius.base,
    overflow: 'hidden',
    ...Shadows.base
  },
  leaveGroupButtonGradient: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderRadius: BorderRadius.base
  },
  leaveGroupButtonText: {
    color: Colors.white,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold
  },
  deleteGroupButton: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.base,
    overflow: 'hidden',
    ...Shadows.base
  },
  deleteGroupButtonGradient: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderRadius: BorderRadius.base
  },
  deleteGroupButtonText: {
    color: Colors.white,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold
  },
  addMemberContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center'
  },
  shareCodeInput: {
    flex: 1,
    backgroundColor: '#FAFBFC',
    borderRadius: BorderRadius.base,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md + 2,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    letterSpacing: 2,
    textAlign: 'center',
    borderWidth: 2,
    borderColor: '#E0E7FF',
    color: Colors.textPrimary,
    ...Shadows.sm,
    minWidth: 0
  },
  addButton: {
    overflow: 'hidden',
    borderRadius: BorderRadius.base,
    ...Shadows.base,
    flexShrink: 0
  },
  addButtonGradient: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md + 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.base,
    minWidth: 80
  },
  addButtonText: {
    color: Colors.white,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold
  },
  buttonDisabled: {
    opacity: 0.6
  },
  emptyState: {
    padding: 40,
    alignItems: 'center'
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center'
  },
  membersList: {
    gap: 12
  },
  memberCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.base,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm
  },
  memberInfo: {
    flex: 1
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  memberName: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.textPrimary,
    flex: 1
  },
  currentUserBadge: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.blue
  },
  roleBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center'
  },
  roleBadgeAdmin: {
    backgroundColor: '#FFD700'
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280'
  },
  roleBadgeTextAdmin: {
    color: '#8B6914'
  },
  memberEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8
  },
  roleSelector: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  },
  roleLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 8
  },
  roleButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center'
  },
  roleButtonActive: {
    backgroundColor: Colors.blue,
    borderColor: Colors.blue,
    ...Shadows.sm
  },
  roleButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280'
  },
  roleButtonTextActive: {
    color: '#FFFFFF'
  },
  removeButton: {
    overflow: 'hidden',
    borderRadius: BorderRadius.base,
    ...Shadows.sm
  },
  removeButtonGradient: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm + 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.base
  },
  removeButtonText: {
    color: Colors.white,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold
  }
});

export default FamilyGroupDetailScreen;

