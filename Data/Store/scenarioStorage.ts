// Storage service for field scenarios using AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FieldScenario } from '../Models/fieldScenarios';

const SCENARIOS_STORAGE_KEY = '@dugout_pro:field_scenarios';
const SCENARIOS_LIST_KEY = '@dugout_pro:scenarios_list';

export interface StoredScenario {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// Get all scenario IDs and metadata
export async function getScenariosList(): Promise<StoredScenario[]> {
  try {
    const data = await AsyncStorage.getItem(SCENARIOS_LIST_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error getting scenarios list:', error);
    return [];
  }
}

// Get a specific scenario by ID
export async function getScenario(id: string): Promise<FieldScenario | null> {
  try {
    const data = await AsyncStorage.getItem(`${SCENARIOS_STORAGE_KEY}:${id}`);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('Error getting scenario:', error);
    return null;
  }
}

// Save a scenario
export async function saveScenario(scenario: FieldScenario): Promise<boolean> {
  try {
    // Save the full scenario
    await AsyncStorage.setItem(
      `${SCENARIOS_STORAGE_KEY}:${scenario.id}`,
      JSON.stringify(scenario)
    );
    
    // Update the list
    const list = await getScenariosList();
    const existingIndex = list.findIndex(s => s.id === scenario.id);
    const metadata: StoredScenario = {
      id: scenario.id,
      name: scenario.name,
      description: scenario.description,
      createdAt: scenario.createdAt,
      updatedAt: scenario.updatedAt,
    };
    
    if (existingIndex >= 0) {
      list[existingIndex] = metadata;
    } else {
      list.push(metadata);
    }
    
    // Sort by updatedAt descending (newest first)
    list.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    
    await AsyncStorage.setItem(SCENARIOS_LIST_KEY, JSON.stringify(list));
    return true;
  } catch (error) {
    console.error('Error saving scenario:', error);
    return false;
  }
}

// Delete a scenario
export async function deleteScenario(id: string): Promise<boolean> {
  try {
    // Remove the scenario data
    await AsyncStorage.removeItem(`${SCENARIOS_STORAGE_KEY}:${id}`);
    
    // Update the list
    const list = await getScenariosList();
    const filtered = list.filter(s => s.id !== id);
    await AsyncStorage.setItem(SCENARIOS_LIST_KEY, JSON.stringify(filtered));
    
    return true;
  } catch (error) {
    console.error('Error deleting scenario:', error);
    return false;
  }
}

// Generate a unique ID for new scenarios
export function generateScenarioId(): string {
  return `scenario_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

