import React from 'react';
import {StyleSheet, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

type TabBarIconProps = {
  color: string;
  focused: boolean;
  name: 'map' | 'saved' | 'settings';
  size: number;
};

const ICON_NAMES = {
  map: 'compass-outline',
  saved: 'bookmark-check-outline',
  settings: 'cog-outline',
} as const;

export function TabBarIcon({color, focused, name, size}: TabBarIconProps) {
  return (
    <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
      <MaterialCommunityIcons
        name={ICON_NAMES[name]}
        color={color}
        size={Math.min(size, 20)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 32,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  iconContainerActive: {backgroundColor: '#ECFDF5'},
});
