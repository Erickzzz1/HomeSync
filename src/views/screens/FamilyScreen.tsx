/**
 * FamilyScreen - Pantalla de gestión de familia
 * 
 * HU-05: Permite ver el shareCode del usuario y agregar miembros a la familia
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
import { StackNavigationProp } from '@react-navigation/stack';
import { AppStackParamList } from '../../navigation/AppNavigator';
import FamilyRepository from '../../repositories/FamilyRepository';
import { FamilyMember } from '../../repositories/interfaces/IFamilyRepository';
import CustomAlert from '../../components/CustomAlert';
import { useCustomAlert } from '../../hooks/useCustomAlert';
import { useAppSelector } from '../../store/hooks';
// Clipboard - usar API nativa según plataforma
const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (Platform.OS === 'web') {
      // En web, usar la API del navegador
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      // Fallback para navegadores antiguos
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
      // En móvil (React Native), usar Clipboard de React Native
      try {
        const { Clipboard } = require('react-native');
        Clipboard.setString(text);
        return true;
      } catch {
        // Si no está disponible, retornar false para mostrar alerta
        return false;
      }
    }
  } catch (error) {
    console.error('Error al copiar:', error);
    return false;
  }
};

type FamilyScreenNavigationProp = StackNavigationProp<AppStackParamList, 'Family'>;

interface Props {
  navigation: FamilyScreenNavigationProp;
}

const FamilyScreen: React.FC<Props> = ({ navigation }) => {
  const [shareCode, setShareCode] = useState<string>('');
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [newShareCode, setNewShareCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const { alertState, showSuccess, showError, hideAlert } = useCustomAlert();

  const familyRepository = new FamilyRepository();
  const { user } = useAppSelector((state) => state.auth);
  
  // Obtener el rol del usuario actual
  const getCurrentUserRole = (): 'admin' | 'member' => {
    if (!user?.uid) return 'member';
    const currentUserMember = familyMembers.find(m => m.uid === user.uid);
    return currentUserMember?.role || 'member';
  };
  
  const isCurrentUserAdmin = (): boolean => {
    return getCurrentUserRole() === 'admin';
  };
  
  /**
   * Cambia el rol de un miembro
   */
  const handleChangeRole = async (member: FamilyMember, newRole: 'admin' | 'member') => {
    if (!isCurrentUserAdmin()) {
      showError('Solo los administradores pueden cambiar roles');
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await familyRepository.updateMemberRole(member.uid, newRole);
      if (result.success) {
        // Actualizar la lista local
        setFamilyMembers(familyMembers.map(m => 
          m.uid === member.uid ? { ...m, role: newRole } : m
        ));
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
   * Carga el shareCode y los familiares al montar
   */
  useEffect(() => {
    loadData();
  }, []);

  /**
   * Carga el shareCode y los familiares
   */
  const loadData = async () => {
    setIsLoadingMembers(true);
    try {
      // Cargar shareCode
      const shareCodeResult = await familyRepository.getMyShareCode();
      if (shareCodeResult.success && shareCodeResult.shareCode) {
        setShareCode(shareCodeResult.shareCode);
      }

      // Cargar familiares
      const membersResult = await familyRepository.getFamilyMembers();
      if (membersResult.success && membersResult.familyMembers) {
        setFamilyMembers(membersResult.familyMembers);
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  /**
   * Copia el shareCode al portapapeles
   */
  const copyShareCode = async () => {
    const success = await copyToClipboard(shareCode);
    if (success) {
      showSuccess('Código copiado al portapapeles', 'Éxito');
    } else {
      // Mostrar alerta con el código para copiar manualmente
      Alert.alert('Código de Compartir', shareCode, [{ text: 'OK' }]);
    }
  };

  /**
   * Agrega un nuevo miembro a la familia
   */
  const handleAddMember = async () => {
    if (!newShareCode || newShareCode.trim().length !== 6) {
      showError('El código debe tener exactamente 6 caracteres');
      return;
    }

    setIsLoading(true);
    try {
      const result = await familyRepository.addFamilyMember(newShareCode.toUpperCase().trim());

      if (result.success && result.member) {
        setNewShareCode('');
        // Recargar la lista completa desde el servidor para obtener todos los miembros sincronizados
        await loadData();
        showSuccess(
          `${result.member.displayName || 'Usuario'} agregado a tu familia`,
          'Miembro Agregado'
        );
      } else {
        showError(result.error || 'Error al agregar el miembro');
      }
    } catch (error) {
      console.error('Error al agregar miembro:', error);
      showError('Error al agregar el miembro');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Elimina un miembro de la familia
   */
  const handleRemoveMember = (member: FamilyMember) => {
    Alert.alert(
      'Eliminar Miembro',
      `¿Estás seguro que deseas eliminar a ${member.displayName || member.email} de tu familia?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              const result = await familyRepository.removeFamilyMember(member.uid);
              if (result.success) {
                // Recargar la lista completa desde el servidor para obtener la lista sincronizada
                await loadData();
                showSuccess('Miembro eliminado de tu familia', 'Eliminado');
              } else {
                showError(result.error || 'Error al eliminar el miembro');
              }
            } catch (error) {
              console.error('Error al eliminar miembro:', error);
              showError('Error al eliminar el miembro');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Botón para ir a grupos familiares */}
        <TouchableOpacity
          style={styles.groupsButton}
          onPress={() => navigation.navigate('FamilyGroups')}
        >
          <Text style={styles.groupsButtonText}>👨‍👩‍👧‍👦 Mis Grupos Familiares</Text>
          <Text style={styles.groupsButtonSubtext}>
            Crea y gestiona grupos familiares con nombres
          </Text>
        </TouchableOpacity>

        {/* Sección de Mi ShareCode */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mi Código de Compartir</Text>
          <Text style={styles.sectionDescription}>
            Comparte este código con tus familiares para que puedan agregarte a su lista
          </Text>
          
          {isLoadingMembers ? (
            <ActivityIndicator size="small" color="#0066FF" style={styles.loader} />
          ) : (
            <View style={styles.shareCodeContainer}>
              <Text style={styles.shareCode}>{shareCode || 'Cargando...'}</Text>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={copyShareCode}
                disabled={!shareCode}
              >
                <Text style={styles.copyButtonText}>📋 Copiar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Sección de Agregar Miembro */}
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
                // Solo permitir alfanuméricos y máximo 6 caracteres
                const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
                setNewShareCode(cleaned);
              }}
              maxLength={6}
              autoCapitalize="characters"
              editable={!isLoading}
            />
            <TouchableOpacity
              style={[styles.addButton, isLoading && styles.buttonDisabled]}
              onPress={handleAddMember}
              disabled={isLoading || newShareCode.length !== 6}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.addButtonText}>Agregar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Lista de Familiares */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mi Familia ({familyMembers.length})</Text>
          
          {isLoadingMembers ? (
            <ActivityIndicator size="small" color="#0066FF" style={styles.loader} />
          ) : familyMembers.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No tienes miembros en tu familia aún
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Agrega miembros usando sus códigos de compartir
              </Text>
            </View>
          ) : (
            <View style={styles.membersList}>
              {familyMembers.map((member) => {
                const isCurrentUser = member.uid === user?.uid;
                const canChangeRole = isCurrentUserAdmin() && !isCurrentUser;
                
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
                      <Text style={styles.memberCode}>Código: {member.shareCode}</Text>
                      
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
                    {!isCurrentUser && (
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleRemoveMember(member)}
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
    backgroundColor: '#F8F9FA'
  },
  scrollContent: {
    padding: 20
  },
  groupsButton: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  groupsButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4
  },
  groupsButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12
  },
  section: {
    backgroundColor: '#FFFFFF',
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
    color: '#1F2937',
    marginBottom: 8
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20
  },
  loader: {
    marginVertical: 20
  },
  shareCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  shareCode: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0066FF',
    letterSpacing: 4,
    textAlign: 'center',
    backgroundColor: '#F0F7FF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0066FF',
    borderStyle: 'dashed'
  },
  copyButton: {
    backgroundColor: '#0066FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600'
  },
  addMemberContainer: {
    flexDirection: 'row',
    gap: 12
  },
  shareCodeInput: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 2,
    textAlign: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    color: '#1F2937'
  },
  addButton: {
    backgroundColor: '#0066FF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100
  },
  addButtonText: {
    color: '#FFFFFF',
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
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center'
  },
  emptyStateSubtext: {
    fontSize: 14,
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
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB'
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
    color: '#1F2937',
    flex: 1
  },
  currentUserBadge: {
    fontSize: 14,
    fontWeight: '400',
    color: '#0066FF'
  },
  roleBadge: {
    backgroundColor: '#E5E7EB',
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
    color: '#6B7280'
  },
  roleBadgeTextAdmin: {
    color: '#8B6914'
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
    backgroundColor: '#0066FF',
    borderColor: '#0066FF'
  },
  roleButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280'
  },
  roleButtonTextActive: {
    color: '#FFFFFF'
  },
  memberEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4
  },
  memberCode: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
  },
  removeButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600'
  }
});

export default FamilyScreen;

