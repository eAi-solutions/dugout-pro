// Coach Mode controls for main entry screen
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, Alert, Platform } from 'react-native';
import { useCoachMode } from '../lib/CoachModeContext';

export default function CoachModeControls() {
  const { coachModeUnlocked, hasCoachPin, unlockCoachMode, lockCoachMode, setCoachPin, changeCoachPin } = useCoachMode();
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [currentPin, setCurrentPin] = useState('');

  const handleUnlockPress = () => {
    setIsSettingPin(!hasCoachPin);
    setIsChangingPin(false);
    setShowPinModal(true);
  };

  const handleLockPress = () => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Lock Coach Mode?')) {
        lockCoachMode();
      }
    } else {
      Alert.alert(
        'Lock Coach Mode',
        'Are you sure you want to lock Coach Mode?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Lock',
            style: 'destructive',
            onPress: lockCoachMode,
          },
        ]
      );
    }
  };

  const handleChangePinPress = () => {
    setIsChangingPin(true);
    setIsSettingPin(false);
    setShowPinModal(true);
  };

  const handleSetPin = async () => {
    if (pin.length < 4 || pin.length > 8) {
      Alert.alert('Error', 'PIN must be between 4 and 8 digits');
      return;
    }
    if (pin !== confirmPin) {
      Alert.alert('Error', 'PINs do not match');
      return;
    }
    try {
      await setCoachPin(pin);
      setShowPinModal(false);
      setPin('');
      setConfirmPin('');
      Alert.alert('Success', 'Coach PIN set and Coach Mode unlocked');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to set Coach PIN');
    }
  };

  const handleEnterPin = async () => {
    if (pin.length < 4) {
      Alert.alert('Error', 'Please enter a valid PIN');
      return;
    }
    const success = await unlockCoachMode(pin);
    if (success) {
      setShowPinModal(false);
      setPin('');
      Alert.alert('Success', 'Coach Mode unlocked');
    } else {
      Alert.alert('Error', 'Incorrect PIN');
      setPin('');
    }
  };

  const handleChangePin = async () => {
    if (currentPin.length < 4 || pin.length < 4 || pin.length > 8) {
      Alert.alert('Error', 'Please enter valid PINs (4-8 digits)');
      return;
    }
    if (pin !== confirmPin) {
      Alert.alert('Error', 'New PINs do not match');
      return;
    }
    const success = await changeCoachPin(currentPin, pin);
    if (success) {
      setShowPinModal(false);
      setPin('');
      setConfirmPin('');
      setCurrentPin('');
      Alert.alert('Success', 'Coach PIN changed successfully');
    } else {
      Alert.alert('Error', 'Incorrect current PIN');
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
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {coachModeUnlocked ? (
              <>
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
                  Unlock Coach Mode
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
                : isSettingPin 
                  ? 'Set Coach PIN'
                  : 'Enter Coach PIN'}
            </Text>
            
            <Text style={{
              fontSize: 14,
              color: '#666',
              marginBottom: 15,
            }}>
              {isChangingPin
                ? 'Enter your current PIN, then set a new PIN (4-8 digits):'
                : isSettingPin 
                  ? 'Create a PIN to protect Coach Mode features (4-8 digits). This PIN will be required to unlock Coach Mode in the future.'
                  : 'Enter your Coach PIN to unlock Coach Mode:'}
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
                onChangeText={setCurrentPin}
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
              onChangeText={setPin}
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
                onChangeText={setConfirmPin}
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
                onPress={isChangingPin ? handleChangePin : (isSettingPin ? handleSetPin : handleEnterPin)}
              >
                <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                  {isChangingPin ? 'Change PIN' : (isSettingPin ? 'Set PIN' : 'Unlock')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

