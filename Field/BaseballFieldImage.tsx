import React from "react";
import { View, Image, StyleSheet } from "react-native";

interface BaseballFieldImageProps {
  width?: number;
  height?: number;
}

export default function BaseballFieldImage({ width, height }: BaseballFieldImageProps) {
  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/baseball-field.png')}
        style={styles.fieldImage}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldImage: {
    width: '100%',
    height: '100%',
  },
});