// Password prompt component for protecting scenario recording
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, Platform } from 'react-native';

interface PasswordPromptProps {
  visible: boolean;
  onConfirm: (password: string) => void;
  onCancel: () => void;
  title?: string;
  message?: string;
}

export default function PasswordPrompt({
  visible,
  onConfirm,
  onCancel,
  title = 'Enter Password',
  message = 'Please enter the password to continue:',
}: PasswordPromptProps) {
  const [password, setPassword] = useState('');

  const handleConfirm = () => {
    onConfirm(password);
    setPassword(''); // Clear password after use
  };

  const handleCancel = () => {
    setPassword('');
    onCancel();
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade">
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
            {title}
          </Text>
          
          <Text style={{
            fontSize: 14,
            color: '#666',
            marginBottom: 15,
          }}>
            {message}
          </Text>

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
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
            secureTextEntry={true}
            autoFocus={true}
            onSubmitEditing={handleConfirm}
          />

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
              onPress={handleConfirm}
            >
              <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                Confirm
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

