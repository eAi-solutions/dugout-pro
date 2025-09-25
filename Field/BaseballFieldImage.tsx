import React from "react";
import { View, Dimensions, Image, StyleSheet } from "react-native";

export default function BaseballFieldImage() {
  const width = Dimensions.get("window").width;
  const height = width; // Keep it square

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/baseball-field.png')}
        style={[styles.fieldImage, { width, height }]}
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