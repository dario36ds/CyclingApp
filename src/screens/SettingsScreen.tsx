import React from 'react';
import {StyleSheet, Switch, Text, View} from 'react-native';

import {useHapticFeedback} from '../context/HapticFeedbackContext';
import {useMapPreferences} from '../context/MapPreferencesContext';

export function SettingsScreen() {
  const {isSatelliteViewEnabled, setSatelliteViewEnabled} =
    useMapPreferences();
  const {
    isHapticFeedbackEnabled,
    setHapticFeedbackEnabled,
    triggerHaptic,
  } = useHapticFeedback();

  const handleSatelliteViewChange = (enabled: boolean) => {
    triggerHaptic(enabled ? 'toggleOn' : 'toggleOff');
    setSatelliteViewEnabled(enabled);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Mappa</Text>
      <View style={styles.settingCard}>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>Vista satellitare ibrida</Text>
          <Text style={styles.description}>
            Mostra immagini satellitari con nomi di città, strade e confini.
          </Text>
        </View>
        <Switch
          accessibilityLabel="Vista satellitare ibrida"
          value={isSatelliteViewEnabled}
          trackColor={{false: '#D4D4D8', true: '#059669'}}
          thumbColor="#FFFFFF"
          ios_backgroundColor="#D4D4D8"
          onValueChange={handleSatelliteViewChange}
        />
      </View>

      <Text style={[styles.sectionTitle, styles.spacedSectionTitle]}>
        Interazioni
      </Text>
      <View style={styles.settingCard}>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>Feedback aptico</Text>
          <Text style={styles.description}>
            Riproduce una risposta tattile durante le azioni principali.
          </Text>
        </View>
        <Switch
          accessibilityLabel="Feedback aptico"
          value={isHapticFeedbackEnabled}
          trackColor={{false: '#D4D4D8', true: '#059669'}}
          thumbColor="#FFFFFF"
          ios_backgroundColor="#D4D4D8"
          onValueChange={setHapticFeedbackEnabled}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#F7F8F7',
  },
  sectionTitle: {
    color: '#18181B',
    fontSize: 18,
    fontWeight: '700',
  },
  spacedSectionTitle: {
    marginTop: 24,
  },
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    color: '#18181B',
    fontSize: 16,
    fontWeight: '700',
  },
  description: {
    marginTop: 5,
    color: '#71717A',
    fontSize: 14,
    lineHeight: 20,
  },
});
