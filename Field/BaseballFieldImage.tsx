import React from "react";
import { View, Image, StyleSheet } from "react-native";

interface BaseballFieldImageProps {
  width?: number;
  height?: number;
}

export default function BaseballFieldImage({ width, height }: BaseballFieldImageProps) {
  const imageWidth = width || 400;
  const imageHeight = height || imageWidth; // Keep it square

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/baseball-field.png')}
        style={[styles.fieldImage, { width: imageWidth, height: imageHeight }]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldImage: {
    // Image will fill the container
  },
});