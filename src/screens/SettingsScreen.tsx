import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

export function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Impostazioni</Text>
      <Text style={styles.description}>
        Le opzioni dell'app verranno aggiunte qui nei prossimi step.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#F7F8F7',
  },
  title: {
    color: '#18181B',
    fontSize: 24,
    fontWeight: '700',
  },
  description: {
    marginTop: 8,
    color: '#71717A',
    fontSize: 16,
    lineHeight: 24,
  },
});
