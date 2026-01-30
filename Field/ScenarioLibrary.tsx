// Component for browsing and managing saved scenarios
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, Alert, TextInput, Platform } from 'react-native';
import { StoredScenario, getScenariosList, getScenario, deleteScenario } from '../Data/Store/scenarioStorage';
import { FieldScenario } from '../Data/Models/fieldScenarios';

interface ScenarioLibraryProps {
  visible: boolean;
  onSelectScenario: (scenario: FieldScenario) => void;
  onClose: () => void;
  isDevMode?: boolean;
}

export default function ScenarioLibrary({ visible, onSelectScenario, onClose, isDevMode = false }: ScenarioLibraryProps) {
  const [scenarios, setScenarios] = useState<StoredScenario[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Debug log
  useEffect(() => {
    console.log('ScenarioLibrary isDevMode:', isDevMode);
  }, [isDevMode]);

  const loadScenarios = async () => {
    setLoading(true);
    try {
      const list = await getScenariosList();
      setScenarios(list);
    } catch (error) {
      console.error('Error loading scenarios:', error);
      Alert.alert('Error', 'Failed to load scenarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadScenarios();
    }
  }, [visible]);

  const handleSelectScenario = async (scenarioId: string) => {
    try {
      const scenario = await getScenario(scenarioId);
      if (scenario) {
        onSelectScenario(scenario);
        onClose();
      } else {
        Alert.alert('Error', 'Failed to load scenario');
      }
    } catch (error) {
      console.error('Error loading scenario:', error);
      Alert.alert('Error', 'Failed to load scenario');
    }
  };

  const handleDeleteScenario = (scenarioId: string, scenarioName: string) => {
    if (Platform.OS === 'web') {
      // Use window.confirm for web
      if (window.confirm(`Are you sure you want to delete "${scenarioName}"?`)) {
        deleteScenario(scenarioId)
          .then((success) => {
            if (success) {
              loadScenarios();
            } else {
              alert('Failed to delete scenario');
            }
          })
          .catch((error) => {
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
            onPress: async () => {
              try {
                const success = await deleteScenario(scenarioId);
                if (success) {
                  await loadScenarios();
                } else {
                  Alert.alert('Error', 'Failed to delete scenario');
                }
              } catch (error) {
                console.error('Error deleting scenario:', error);
                Alert.alert('Error', 'Failed to delete scenario');
              }
            },
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
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', flex: 1 }}>
                    {scenario.name}
                  </Text>
                  {isDevMode && (
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
                  )}
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

