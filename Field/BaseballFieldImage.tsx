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
    <Image
      source={require('../assets/baseball-field.png')}
      style={[styles.fieldImage, { width: imageWidth, height: imageHeight }]}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  fieldImage: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});