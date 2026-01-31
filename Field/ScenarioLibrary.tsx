// Component for browsing and managing saved scenarios
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, Alert, TextInput, Platform } from 'react-native';
import { FieldScenario } from '../Data/Models/fieldScenarios';
import { listScenarios, getScenario, deleteScenario } from '../services/scenarioStore';
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

  const handleDeleteScenario = (scenarioId: string, scenarioName: string) => {
    // Coach Mode guard: prevent deletion if Coach Mode is OFF
    if (!canDelete) {
      Alert.alert('View only: Coach Mode required', 'Coach Mode required to delete scenarios');
      return;
    }

    const performDelete = async () => {
      // Double-check Coach Mode before calling Supabase
      if (!canDelete) {
        Alert.alert('View only: Coach Mode required', 'Coach Mode required to delete scenarios');
        return;
      }

      const result = await deleteScenario(scenarioId);
      if (result.error) {
        Alert.alert('Error', result.error.message);
      } else {
        // Refresh the list after successful deletion
        await loadScenarios();
      }
    };

    if (Platform.OS === 'web') {
      // Use window.confirm for web
      if (window.confirm(`Are you sure you want to delete "${scenarioName}"?`)) {
        performDelete().catch((error) => {
          console.error('Error deleting scenario:', error);
          alert('Failed to delete scenario');
        });
      }
    } else {
      // Use Alert for native
      Alert.alert(
        'Delete Scenario',
        `Are you sure you want to delete "${scenarioName}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: performDelete,
          },
        ]
      );
    }
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
                style={{
                  backgroundColor: 'white',
                  margin: 10,
                  padding: 15,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#ddd',
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5, alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', flex: 1 }}>
                    {scenario.name}
                  </Text>
                  {canDelete ? (
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#f44336',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 6,
                      }}
                      onPress={() => handleDeleteScenario(scenario.id, scenario.name)}
                    >
                      <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Delete</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                
                {scenario.description && (
                  <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                    {scenario.description}
                  </Text>
                )}
                
                <Text style={{ fontSize: 12, color: '#999', marginBottom: 10 }}>
                  Updated: {formatDate(scenario.updatedAt)}
                </Text>
                
                <TouchableOpacity
                  style={{
                    backgroundColor: '#2196F3',
                    padding: 12,
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                  onPress={() => handleSelectScenario(scenario.id)}
                >
                  <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
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
    </Modal>
  );
}

