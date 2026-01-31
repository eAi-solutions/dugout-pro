// Coach Mode button and PIN entry/setup component
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, Alert, ActivityIndicator } from 'react-native';
import { useCoachMode } from '../lib/CoachModeContext';
import { isValidCoachPin } from '../lib/coachPin';

export default function CoachModeButton() {
  const { coachModeUnlocked, hasCoachPin, loadingCoachPin, unlockCoachMode, lockCoachMode, setCoachPin } = useCoachMode();
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isSettingPin, setIsSettingPin] = useState(false);

  const handleButtonPress = () => {
    if (coachModeUnlocked) {
      // Immediate lock (session-only, no confirmation needed)
      lockCoachMode();
    } else {
      // Show PIN entry/setup based on hasCoachPin state
      // If hasCoachPin === false, only allow "Set Coach PIN"
      // If hasCoachPin === true, only allow "Unlock"
      if (!hasCoachPin) {
        setIsSettingPin(true);
      } else {
        setIsSettingPin(false);
      }
      setShowPinModal(true);
    }
  };

  const handleSetPin = async () => {
    // Validate 4-8 digits (numeric only)
    if (!isValidCoachPin(pin)) {
      Alert.alert('Error', 'PIN must be 4-8 digits (numeric only)');
      return;
    }
    if (pin !== confirmPin) {
      Alert.alert('Error', 'PINs do not match');
      return;
    }
    try {
      // setCoachPin() handles hashing via hashCoachPin() and saves to profiles.coach_pin_hash
      // On success, automatically unlocks for this session
      await setCoachPin(pin);
      setShowPinModal(false);
      setPin('');
      setConfirmPin('');
      // No need for success alert - unlock state change is visible in UI
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to set Coach PIN');
    }
  };

  const handleEnterPin = async () => {
    // Defensive check: only allow unlock if PIN is set
    if (!hasCoachPin) {
      Alert.alert('Error', 'Coach PIN must be set first');
      setShowPinModal(false);
      return;
    }
    // Validate 4-8 digits (numeric only)
    if (!isValidCoachPin(pin)) {
      Alert.alert('Error', 'PIN must be 4-8 digits (numeric only)');
      return;
    }
    // unlockCoachMode() uses verifyCoachPin(pin, coachPinHash) internally
    const success = await unlockCoachMode(pin);
    if (success) {
      setShowPinModal(false);
      setPin('');
      // No need for success alert - unlock state change is visible in UI
    } else {
      // Show error if incorrect PIN
      Alert.alert('Error', 'Incorrect PIN');
      setPin('');
    }
  };

  const handleCancel = () => {
    setShowPinModal(false);
    setPin('');
    setConfirmPin('');
  };

  return (
    <>
      <TouchableOpacity
        style={{
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 6,
          backgroundColor: coachModeUnlocked ? '#4CAF50' : '#666',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}
        onPress={handleButtonPress}
        disabled={loadingCoachPin}
      >
        {loadingCoachPin && <ActivityIndicator size="small" color="white" />}
        <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
          {coachModeUnlocked ? '🔓 Coach Mode ON' : hasCoachPin ? '🔒 Unlock Coach Mode' : '🔒 Set Coach PIN'}
        </Text>
      </TouchableOpacity>

      <Modal visible={showPinModal} transparent={true} animationType="fade">
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}>
          <View style={{
            backgroundColor: 'white',
            borderRadius: 12,
            padding: 20,
            width: '100%',
            maxWidth: 400,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 10,
            elevation: 10,
          }}>
            <Text style={{
              fontSize: 20,
              fontWeight: 'bold',
              marginBottom: 10,
              color: '#333',
            }}>
              {isSettingPin ? 'Set Coach PIN' : hasCoachPin ? 'Enter Coach PIN' : 'Set Coach PIN'}
            </Text>
            
            <Text style={{
              fontSize: 14,
              color: '#666',
              marginBottom: 15,
            }}>
              {isSettingPin 
                ? 'Create a PIN to protect Coach Mode features (4-8 digits, numeric only). This PIN will be required to unlock Coach Mode in the future.'
                : 'Enter your Coach PIN to unlock Coach Mode (4-8 digits, numeric only):'}
            </Text>

            <TextInput
              style={{
                backgroundColor: '#f5f5f5',
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                marginBottom: isSettingPin ? 15 : 20,
              }}
              value={pin}
              onChangeText={(text) => {
                // Only allow numeric input
                const numericText = text.replace(/[^0-9]/g, '');
                setPin(numericText);
              }}
              placeholder={isSettingPin ? 'Enter PIN (4-8 digits)' : 'Enter PIN'}
              secureTextEntry={true}
              autoFocus={true}
              keyboardType="numeric"
              maxLength={8}
            />

            {isSettingPin && (
              <TextInput
                style={{
                  backgroundColor: '#f5f5f5',
                  borderWidth: 1,
                  borderColor: '#ddd',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  marginBottom: 20,
                }}
                value={confirmPin}
                onChangeText={(text) => {
                  // Only allow numeric input
                  const numericText = text.replace(/[^0-9]/g, '');
                  setConfirmPin(numericText);
                }}
                placeholder="Confirm PIN"
                secureTextEntry={true}
                keyboardType="numeric"
                maxLength={8}
                onSubmitEditing={handleSetPin}
              />
            )}

            <View style={{
              flexDirection: 'row',
              gap: 10,
              justifyContent: 'flex-end',
            }}>
              <TouchableOpacity
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  backgroundColor: '#999',
                  borderRadius: 8,
                }}
                onPress={handleCancel}
              >
                <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  backgroundColor: '#9b59b6',
                  borderRadius: 8,
                }}
                onPress={isSettingPin ? handleSetPin : (hasCoachPin ? handleEnterPin : handleSetPin)}
              >
                <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                  {isSettingPin || !hasCoachPin ? 'Set PIN' : 'Unlock'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

