import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

type TabBarIconProps = {
  color: string;
  name: 'map' | 'saved' | 'settings';
  size: number;
};

export function TabBarIcon({color, name, size}: TabBarIconProps) {
  if (name === 'map') {
    return <MaterialCommunityIcons name="map" color={color} size={size} />;
  }
  if (name === 'saved') {
    return (
      <MaterialCommunityIcons
        name="content-save-outline"
        color={color}
        size={size}
      />
    );
  }
  if (name === 'settings') {
    return <MaterialCommunityIcons name="cog-outline" color={color} size={size} />;
  }

  // Placeholder temporanei: sostituire con le icone definitive.
  return (
    <View style={[styles.placeholder, {borderColor: color}]}>
      <Text style={[styles.placeholderText, {color}]}>
        {name === 'saved' ? 'S' : 'I'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 6,
  },
  placeholderText: {
    fontSize: 11,
    fontWeight: '800',
  },
});
