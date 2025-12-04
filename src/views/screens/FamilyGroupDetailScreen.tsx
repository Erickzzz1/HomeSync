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
  Platform
} from 'react-native';
import { StackNavigationProp, RouteProp } from '@react-navigation/stack';
import { AppStackParamList } from '../../navigation/AppNavigator';
import FamilyGroupRepository from '../../repositories/FamilyGroupRepository';
import { FamilyGroup, FamilyGroupMember } from '../../repositories/interfaces/IFamilyGroupRepository';
import CustomAlert from '../../components/CustomAlert';
import { useCustomAlert } from '../../hooks/useCustomAlert';
import { useAppSelector } from '../../store/hooks';

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
          <ActivityIndicator size="large" color="#4A90E2" />
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
                <Text style={styles.copyButtonText}>📋 Copiar</Text>
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
            <Text style={styles.leaveGroupButtonText}>🚪 Salir del Grupo</Text>
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
              <Text style={styles.deleteGroupButtonText}>🗑️ Eliminar Grupo</Text>
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
              placeholderTextColor="#999"
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
              {isAdding ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.addButtonText}>Agregar</Text>
              )}
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
                          <Text style={[
                            styles.roleBadgeText,
                            member.role === 'admin' && styles.roleBadgeTextAdmin
                          ]}>
                            {member.role === 'admin' ? '👑 Admin' : '👤 Miembro'}
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
                        <Text style={styles.removeButtonText}>Eliminar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

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
    backgroundColor: '#F5F5F5'
  },
  scrollContent: {
    padding: 20
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666'
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20
  },
  shareCodeContainer: {
    marginTop: 12
  },
  shareCodeLabel: {
    fontSize: 14,
    color: '#666',
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A90E2',
    letterSpacing: 4,
    textAlign: 'center',
    backgroundColor: '#F0F7FF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4A90E2',
    borderStyle: 'dashed'
  },
  copyButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8
  },
  copyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  shareCodeDescription: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center'
  },
  leaveGroupButton: {
    marginTop: 16,
    backgroundColor: '#FF9500',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center'
  },
  leaveGroupButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  deleteGroupButton: {
    marginTop: 12,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center'
  },
  deleteGroupButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  addMemberContainer: {
    flexDirection: 'row',
    gap: 12
  },
  shareCodeInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 2,
    textAlign: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0'
  },
  addButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
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
    color: '#666',
    textAlign: 'center'
  },
  membersList: {
    gap: 12
  },
  memberCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0'
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
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1
  },
  currentUserBadge: {
    fontSize: 14,
    fontWeight: '400',
    color: '#4A90E2'
  },
  roleBadge: {
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8
  },
  roleBadgeAdmin: {
    backgroundColor: '#FFD700'
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666'
  },
  roleBadgeTextAdmin: {
    color: '#8B6914'
  },
  memberEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8
  },
  roleSelector: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0'
  },
  roleLabel: {
    fontSize: 12,
    color: '#666',
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
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center'
  },
  roleButtonActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2'
  },
  roleButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666'
  },
  roleButtonTextActive: {
    color: '#fff'
  },
  removeButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  }
});

export default FamilyGroupDetailScreen;

