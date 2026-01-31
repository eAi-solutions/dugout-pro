// Component for browsing and managing saved scenarios
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, Alert, TextInput, Platform, useWindowDimensions, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FieldScenario } from '../Data/Models/fieldScenarios';
import { listScenarios, getScenario, deleteScenario, upsertScenario } from '../services/scenarioStore';
import { useAuth } from '../lib/AuthContext';
import { useCoachMode } from '../lib/CoachModeContext';

interface ScenarioLibraryProps {
  visible: boolean;
  onSelectScenario: (scenario: FieldScenario) => void;
  onClose: () => void;
  isDevMode?: boolean; // Deprecated: use Coach Mode instead
}

export default function ScenarioLibrary({ visible, onSelectScenario, onClose, isDevMode = false }: ScenarioLibraryProps) {
  const { coachModeUnlocked } = useCoachMode();
  // Use Coach Mode if available, fallback to isDevMode for backward compatibility
  const canDelete = coachModeUnlocked || isDevMode;
  const [scenarios, setScenarios] = useState<FieldScenario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();
  
  // Edit modal state
  const [editingScenario, setEditingScenario] = useState<FieldScenario | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Mobile menu state
  const [showMenuForScenario, setShowMenuForScenario] = useState<string | null>(null);
  
  // Delete confirmation modal state
  const [deleteConfirmScenario, setDeleteConfirmScenario] = useState<{ id: string; name: string } | null>(null);
  
  // Responsive design: use window dimensions
  const { width: windowWidth } = useWindowDimensions();
  const isCompact = windowWidth < 600; // Mobile/compact breakpoint

  const loadScenarios = useCallback(async () => {
    if (!user) {
      setError('Please log in to view scenarios');
      setScenarios([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await listScenarios();
      if (result.error) {
        setError(result.error.message);
        setScenarios([]);
      } else {
        setScenarios(result.data || []);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load scenarios';
      setError(errorMessage);
      setScenarios([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (visible && user) {
      loadScenarios();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, user]); // loadScenarios is stable when user doesn't change

  const handleSelectScenario = async (scenarioId: string) => {
    // First try to use scenario from the list if available
    const scenarioFromList = scenarios.find(s => s.id === scenarioId);
    if (scenarioFromList) {
      onSelectScenario(scenarioFromList);
      onClose();
      return;
    }

    // Otherwise fetch from Supabase
    try {
      const result = await getScenario(scenarioId);
      if (result.error) {
        Alert.alert('Error', result.error.message);
      } else if (result.data) {
        onSelectScenario(result.data);
        onClose();
      } else {
        Alert.alert('Error', 'Scenario not found');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load scenario';
      Alert.alert('Error', errorMessage);
    }
  };

  const handleEditScenario = (scenario: FieldScenario) => {
    if (!canDelete) {
      Alert.alert('View only: Coach Mode required', 'Coach Mode required to edit scenarios');
      return;
    }
    setEditingScenario(scenario);
    setEditName(scenario.name);
    setEditDescription(scenario.description || '');
    setShowEditModal(true);
    setShowMenuForScenario(null); // Close menu if open
  };

  const handleSaveEdit = async () => {
    if (!editingScenario || !canDelete) {
      return;
    }

    // Validate name
    if (!editName.trim()) {
      Alert.alert('Error', 'Scenario name is required');
      return;
    }

    // Update scenario with new name and description
    const updatedScenario: FieldScenario = {
      ...editingScenario,
      name: editName.trim(),
      description: editDescription.trim() || undefined,
    };

    const result = await upsertScenario(updatedScenario);
    if (result.error) {
      Alert.alert('Error', result.error.message);
    } else {
      // Refresh the list after successful update
      await loadScenarios();
      setShowEditModal(false);
      setEditingScenario(null);
      setEditName('');
      setEditDescription('');
    }
  };

  const handleDeleteScenario = (scenarioId: string, scenarioName: string) => {
    // Coach Mode guard: prevent deletion if Coach Mode is OFF
    if (!canDelete) {
      Alert.alert('View only: Coach Mode required', 'Coach Mode required to delete scenarios');
      return;
    }

    // Close menu if open
    setShowMenuForScenario(null);

    // Show confirmation modal
    setDeleteConfirmScenario({ id: scenarioId, name: scenarioName });
  };

  const performDelete = async () => {
    if (!deleteConfirmScenario || !canDelete) {
      return;
    }

    const result = await deleteScenario(deleteConfirmScenario.id);
    if (result.error) {
      Alert.alert('Error', result.error.message);
    } else {
      // Refresh the list after successful deletion
      await loadScenarios();
    }
    setDeleteConfirmScenario(null);
  };

  const filteredScenarios = scenarios.filter(scenario =>
    scenario.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (scenario.description && scenario.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        <View style={{ padding: 20, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#ddd' }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 15 }}>
            Scenario Library
          </Text>
          
          <TextInput
            style={{
              backgroundColor: '#f0f0f0',
              padding: 12,
              borderRadius: 8,
              fontSize: 16,
            }}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search scenarios..."
          />
        </View>

        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 16, color: '#666' }}>Loading scenarios...</Text>
          </View>
        ) : error ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <Text style={{ fontSize: 16, color: '#f44336', textAlign: 'center', marginBottom: 10 }}>
              {error}
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: '#2196F3',
                padding: 12,
                borderRadius: 8,
                paddingHorizontal: 20,
              }}
              onPress={loadScenarios}
            >
              <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : filteredScenarios.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <Text style={{ fontSize: 16, color: '#666', textAlign: 'center' }}>
              {scenarios.length === 0
                ? 'No scenarios saved yet. Create one by recording a scenario!'
                : 'No scenarios match your search.'}
            </Text>
          </View>
        ) : (
          <ScrollView style={{ flex: 1 }}>
              {filteredScenarios.map((scenario) => (
              <View
                key={scenario.id}
                style={styles.scenarioCard}
              >
                <View style={styles.headerRow}>
                  <View style={[styles.titleContainer, !canDelete && { marginRight: 0 }]}>
                    <Text 
                      style={styles.titleText}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {scenario.name}
                    </Text>
                  </View>
                  {/* Actions area - only in Coach Mode, aligned to far right */}
                  {canDelete && (
                    <View style={styles.actionsContainer}>
                      {isCompact ? (
                        // Mobile/compact: show "⋯" menu button
                        <TouchableOpacity
                          style={styles.compactMenuButton}
                          onPress={() => setShowMenuForScenario(scenario.id)}
                        >
                          <Text style={styles.compactMenuButtonText}>⋯</Text>
                        </TouchableOpacity>
                      ) : (
                        // Desktop/tablet: show icon-only buttons with tooltips
                        <>
                          <TouchableOpacity
                            style={styles.editButton}
                            onPress={() => handleEditScenario(scenario)}
                            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                            {...(Platform.OS === 'web' ? { title: 'Edit' } : {})}
                          >
                            <Ionicons name="create" size={20} color="white" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => handleDeleteScenario(scenario.id, scenario.name)}
                            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                            {...(Platform.OS === 'web' ? { title: 'Delete' } : {})}
                          >
                            <Ionicons name="trash" size={20} color="white" />
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  )}
                </View>
                
                {scenario.description && (
                  <Text style={styles.descriptionText}>
                    {scenario.description}
                  </Text>
                )}
                
                <Text style={styles.dateText}>
                  Updated: {formatDate(scenario.updatedAt)}
                </Text>
                
                <TouchableOpacity
                  style={styles.playButton}
                  onPress={() => handleSelectScenario(scenario.id)}
                >
                  <Text style={styles.playButtonText}>
                    Play Scenario
                  </Text>
                </TouchableOpacity>
              </View>
              ))}
            </ScrollView>
        )}

        <View style={{ padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#ddd' }}>
          <TouchableOpacity
            style={{
              backgroundColor: '#666',
              padding: 15,
              borderRadius: 8,
              alignItems: 'center',
            }}
            onPress={onClose}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Edit Scenario Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowEditModal(false);
          setEditingScenario(null);
          setEditName('');
          setEditDescription('');
        }}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: 'white',
              borderRadius: 12,
              padding: 20,
              width: '100%',
              maxWidth: 500,
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 20 }}>
              Edit Scenario
            </Text>

            <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#333' }}>
              Name
            </Text>
            <TextInput
              style={{
                backgroundColor: '#f0f0f0',
                padding: 12,
                borderRadius: 8,
                fontSize: 16,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: '#ddd',
              }}
              value={editName}
              onChangeText={setEditName}
              placeholder="Scenario name"
              autoFocus={true}
            />

            <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#333' }}>
              Notes
            </Text>
            <TextInput
              style={{
                backgroundColor: '#f0f0f0',
                padding: 12,
                borderRadius: 8,
                fontSize: 16,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: '#ddd',
                minHeight: 80,
                textAlignVertical: 'top',
                multiline: true,
              }}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Add notes about this scenario..."
              multiline={true}
              numberOfLines={4}
            />

            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
              <TouchableOpacity
                style={{
                  backgroundColor: '#999',
                  padding: 12,
                  borderRadius: 8,
                  paddingHorizontal: 20,
                }}
                onPress={() => {
                  setShowEditModal(false);
                  setEditingScenario(null);
                  setEditName('');
                  setEditDescription('');
                }}
              >
                <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  backgroundColor: '#2196F3',
                  padding: 12,
                  borderRadius: 8,
                  paddingHorizontal: 20,
                }}
                onPress={handleSaveEdit}
              >
                <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Mobile Bottom Sheet Modal for Actions */}
      {isCompact && (
        <Modal
          visible={!!showMenuForScenario}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowMenuForScenario(null)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              justifyContent: 'flex-end',
            }}
            onPress={() => setShowMenuForScenario(null)}
          >
            <View
              style={{
                backgroundColor: 'white',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                paddingBottom: 20,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                elevation: 5,
              }}
              onStartShouldSetResponder={() => true}
            >
              <View
                style={{
                  width: 40,
                  height: 4,
                  backgroundColor: '#ccc',
                  borderRadius: 2,
                  alignSelf: 'center',
                  marginTop: 8,
                  marginBottom: 16,
                }}
              />
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: 'bold',
                  paddingHorizontal: 20,
                  marginBottom: 20,
                }}
              >
                {showMenuForScenario && scenarios.find(s => s.id === showMenuForScenario)?.name}
              </Text>
              <TouchableOpacity
                style={{
                  padding: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: '#eee',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
                onPress={() => {
                  const scenario = scenarios.find(s => s.id === showMenuForScenario);
                  if (scenario) {
                    handleEditScenario(scenario);
                  }
                }}
              >
                <Ionicons name="create" size={20} color="#333" />
                <Text style={{ fontSize: 16, color: '#333' }}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
                onPress={() => {
                  const scenario = scenarios.find(s => s.id === showMenuForScenario);
                  if (scenario) {
                    handleDeleteScenario(scenario.id, scenario.name);
                  }
                }}
              >
                <Ionicons name="trash" size={20} color="#f44336" />
                <Text style={{ fontSize: 16, color: '#f44336' }}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  padding: 16,
                  marginTop: 8,
                  alignItems: 'center',
                }}
                onPress={() => setShowMenuForScenario(null)}
              >
                <Text style={{ fontSize: 16, color: '#666' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        visible={!!deleteConfirmScenario}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDeleteConfirmScenario(null)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: 'white',
              borderRadius: 12,
              padding: 20,
              width: '100%',
              maxWidth: 400,
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>
              Delete Scenario
            </Text>
            <Text style={{ fontSize: 16, color: '#666', marginBottom: 24 }}>
              Are you sure you want to delete "{deleteConfirmScenario?.name}"? This action cannot be undone.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
              <TouchableOpacity
                style={{
                  backgroundColor: '#999',
                  padding: 12,
                  borderRadius: 8,
                  paddingHorizontal: 20,
                }}
                onPress={() => setDeleteConfirmScenario(null)}
              >
                <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  backgroundColor: '#f44336',
                  padding: 12,
                  borderRadius: 8,
                  paddingHorizontal: 20,
                }}
                onPress={performDelete}
              >
                <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scenarioCard: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    minHeight: 40,
  },
  titleContainer: {
    flex: 1,
    minWidth: 0,
    marginRight: 10,
  },
  titleText: {
    fontSize: 18,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  compactMenuButton: {
    width: 44,
    height: 44,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactMenuButtonText: {
    fontSize: 18,
    color: '#666',
  },
  editButton: {
    backgroundColor: '#2196F3',
    padding: 8,
    borderRadius: 6,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  deleteButton: {
    backgroundColor: '#f44336',
    padding: 8,
    borderRadius: 6,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 10,
  },
  playButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  playButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

