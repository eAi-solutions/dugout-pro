import React from "react";
import { View, Dimensions, Image, StyleSheet } from "react-native";

export default function BaseballFieldPNG() {
  const width = Dimensions.get("window").width;
  const height = width; // Keep it square

  return (
    <View style={styles.container}>
      {/* Simple field background using React Native components */}
      <View style={[styles.field, { width, height }]}>
        {/* Outfield grass */}
        <View style={[styles.outfield, { width, height }]} />
        
        {/* Infield dirt */}
        <View style={[styles.infield, { 
          width: width * 0.6, 
          height: height * 0.6,
          left: width * 0.2,
          top: height * 0.2
        }]} />
        
        {/* Infield grass diamond */}
        <View style={[styles.infieldGrass, { 
          width: width * 0.4, 
          height: height * 0.4,
          left: width * 0.3,
          top: height * 0.3
        }]} />
        
        {/* Bases */}
        <View style={[styles.base, { 
          left: width * 0.75, 
          top: height * 0.78 
        }]} />
        <View style={[styles.base, { 
          left: width * 0.5 - 8, 
          top: height * 0.68 
        }]} />
        <View style={[styles.base, { 
          left: width * 0.25, 
          top: height * 0.78 
        }]} />
        
        {/* Home plate */}
        <View style={[styles.homePlate, { 
          left: width * 0.5 - 8, 
          top: height * 0.88 
        }]} />
        
        {/* Pitcher's mound */}
        <View style={[styles.mound, { 
          left: width * 0.5 - 15, 
          top: height * 0.75 
        }]} />
        
        {/* Foul lines */}
        <View style={[styles.foulLine, { 
          left: width * 0.5, 
          top: height * 0.88,
          width: width * 0.4,
          height: 3,
          transform: [{ rotate: '-45deg' }]
        }]} />
        <View style={[styles.foulLine, { 
          left: width * 0.1, 
          top: height * 0.88,
          width: width * 0.4,
          height: 3,
          transform: [{ rotate: '45deg' }]
        }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: {
    position: 'relative',
    backgroundColor: '#4d662e',
    borderRadius: 200,
  },
  outfield: {
    position: 'absolute',
    backgroundColor: '#4d662e',
    borderRadius: 200,
  },
  infield: {
    position: 'absolute',
    backgroundColor: '#c7a070',
    borderRadius: 20,
  },
  infieldGrass: {
    position: 'absolute',
    backgroundColor: '#5c7733',
    borderRadius: 15,
  },
  base: {
    position: 'absolute',
    width: 16,
    height: 16,
    backgroundColor: '#fff',
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
  },
  homePlate: {
    position: 'absolute',
    width: 16,
    height: 12,
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  mound: {
    position: 'absolute',
    width: 30,
    height: 15,
    backgroundColor: '#c7a070',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#b39366',
  },
  foulLine: {
    position: 'absolute',
    backgroundColor: '#fff',
  },
});
