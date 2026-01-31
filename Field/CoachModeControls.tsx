// Coach Mode controls for main entry screen
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, Alert, Platform, ActivityIndicator } from 'react-native';
import { useCoachMode } from '../lib/CoachModeContext';
import { isValidCoachPin } from '../lib/coachPin';

export default function CoachModeControls() {
  const { coachModeUnlocked, hasCoachPin, loadingCoachPin, unlockCoachMode, lockCoachMode, setCoachPin, changeCoachPin } = useCoachMode();
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [currentPin, setCurrentPin] = useState('');

  const handleUnlockPress = () => {
    // If hasCoachPin === false, only allow "Set Coach PIN"
    // If hasCoachPin === true, only allow "Unlock"
    if (!hasCoachPin) {
      setIsSettingPin(true);
      setIsChangingPin(false);
    } else {
      setIsSettingPin(false);
      setIsChangingPin(false);
    }
    setShowPinModal(true);
  };

  const handleLockPress = () => {
    // Immediate lock (session-only, no confirmation needed)
    lockCoachMode();
  };

  const handleChangePinPress = () => {
    // Only allow change PIN if hasCoachPin === true and coachModeUnlocked === true
    if (!hasCoachPin) {
      Alert.alert('Error', 'Coach PIN must be set first');
      return;
    }
    if (!coachModeUnlocked) {
      Alert.alert('Error', 'Coach Mode must be unlocked to change PIN');
      return;
    }
    setIsChangingPin(true);
    setIsSettingPin(false);
    setShowPinModal(true);
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

  const handleChangePin = async () => {
    // Defensive check: only allow change PIN if PIN is set and unlocked
    if (!hasCoachPin) {
      Alert.alert('Error', 'Coach PIN must be set first');
      setShowPinModal(false);
      return;
    }
    if (!coachModeUnlocked) {
      Alert.alert('Error', 'Coach Mode must be unlocked to change PIN');
      setShowPinModal(false);
      return;
    }
    // Validate current PIN
    if (!isValidCoachPin(currentPin)) {
      Alert.alert('Error', 'Current PIN must be 4-8 digits (numeric only)');
      return;
    }
    // Validate new PIN
    if (!isValidCoachPin(pin)) {
      Alert.alert('Error', 'New PIN must be 4-8 digits (numeric only)');
      return;
    }
    // Validate PINs match
    if (pin !== confirmPin) {
      Alert.alert('Error', 'New PINs do not match');
      return;
    }
    // Validate new PIN is different from current
    if (currentPin === pin) {
      Alert.alert('Error', 'New PIN must be different from current PIN');
      return;
    }
    try {
      // changeCoachPin() uses verifyCoachPin() and hashCoachPin() internally
      // Keeps current session unlocked after successful change
      const success = await changeCoachPin(currentPin, pin);
      if (success) {
        setShowPinModal(false);
        setPin('');
        setConfirmPin('');
        setCurrentPin('');
        setIsChangingPin(false);
        Alert.alert('Success', 'Coach PIN changed successfully');
      } else {
        Alert.alert('Error', 'Incorrect current PIN. Please try again.');
        setCurrentPin('');
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to change Coach PIN');
      setCurrentPin('');
    }
  };

  const handleCancel = () => {
    setShowPinModal(false);
    setPin('');
    setConfirmPin('');
    setCurrentPin('');
    setIsChangingPin(false);
  };

  return (
    <>
      <View style={{
        marginTop: 20,
        marginBottom: 15,
        padding: 15,
        backgroundColor: coachModeUnlocked ? '#e8f5e9' : '#fff3e0',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: coachModeUnlocked ? '#4CAF50' : '#ff9800',
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: 14,
              fontWeight: 'bold',
              color: coachModeUnlocked ? '#2e7d32' : '#e65100',
              marginBottom: 4,
            }}>
              {coachModeUnlocked ? '🔓 Coach Mode ON' : '🔒 View Only'}
            </Text>
            <Text style={{
              fontSize: 12,
              color: '#666',
            }}>
              {coachModeUnlocked 
                ? 'Record, edit, and delete scenarios enabled'
                : 'Coach Mode required to record or modify scenarios'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            {loadingCoachPin ? (
              <ActivityIndicator size="small" color="#666" />
            ) : coachModeUnlocked ? (
              <>
                {hasCoachPin && (
                  <TouchableOpacity
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      backgroundColor: '#ff9800',
                      borderRadius: 6,
                    }}
                    onPress={handleChangePinPress}
                  >
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                      Change PIN
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    backgroundColor: '#f44336',
                    borderRadius: 6,
                  }}
                  onPress={handleLockPress}
                >
                  <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                    Lock
                  </Text>
                </TouchableOpacity>
              </>
            ) : hasCoachPin ? (
              <TouchableOpacity
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  backgroundColor: '#4CAF50',
                  borderRadius: 6,
                }}
                onPress={handleUnlockPress}
              >
                <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                  Unlock Coach Mode
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  backgroundColor: '#4CAF50',
                  borderRadius: 6,
                }}
                onPress={handleUnlockPress}
              >
                <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                  Set Coach PIN
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

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
              {isChangingPin 
                ? 'Change Coach PIN'
                : isSettingPin || !hasCoachPin
                  ? 'Set Coach PIN'
                  : 'Enter Coach PIN'}
            </Text>
            
            <Text style={{
              fontSize: 14,
              color: '#666',
              marginBottom: 15,
            }}>
              {isChangingPin
                ? 'Enter your current PIN, then set a new PIN (4-8 digits, numeric only):'
                : isSettingPin 
                  ? 'Create a PIN to protect Coach Mode features (4-8 digits, numeric only). This PIN will be required to unlock Coach Mode in the future.'
                  : 'Enter your Coach PIN to unlock Coach Mode (4-8 digits, numeric only):'}
            </Text>

            {isChangingPin && (
              <TextInput
                style={{
                  backgroundColor: '#f5f5f5',
                  borderWidth: 1,
                  borderColor: '#ddd',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  marginBottom: 15,
                }}
                value={currentPin}
                onChangeText={(text) => {
                  // Only allow numeric input
                  const numericText = text.replace(/[^0-9]/g, '');
                  setCurrentPin(numericText);
                }}
                placeholder="Current PIN"
                secureTextEntry={true}
                autoFocus={true}
                keyboardType="numeric"
                maxLength={8}
              />
            )}

            <TextInput
              style={{
                backgroundColor: '#f5f5f5',
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                marginBottom: (isSettingPin || isChangingPin) ? 15 : 20,
              }}
              value={pin}
              onChangeText={(text) => {
                // Only allow numeric input
                const numericText = text.replace(/[^0-9]/g, '');
                setPin(numericText);
              }}
              placeholder={isChangingPin ? 'New PIN (4-8 digits)' : isSettingPin ? 'Enter PIN (4-8 digits)' : 'Enter PIN'}
              secureTextEntry={true}
              autoFocus={!isChangingPin}
              keyboardType="numeric"
              maxLength={8}
            />

            {(isSettingPin || isChangingPin) && (
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
                onSubmitEditing={isChangingPin ? handleChangePin : handleSetPin}
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
                onPress={isChangingPin ? handleChangePin : (isSettingPin || !hasCoachPin ? handleSetPin : handleEnterPin)}
              >
                <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                  {isChangingPin ? 'Change PIN' : (isSettingPin || !hasCoachPin ? 'Set PIN' : 'Unlock')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

