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
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  fieldImage: {
    width: '100%',
    height: '100%',
  },
});