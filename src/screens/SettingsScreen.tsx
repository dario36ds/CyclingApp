import React, {useState} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Fontisto from 'react-native-vector-icons/Fontisto';

import {useHapticFeedback} from '../context/HapticFeedbackContext';
import {useMapPreferences} from '../context/MapPreferencesContext';

type SettingIconProps = {
  backgroundColor: string;
  borderColor: string;
  color: string;
  name: React.ComponentProps<typeof Fontisto>['name'];
};

function SettingIcon({
  backgroundColor,
  borderColor,
  color,
  name,
}: SettingIconProps) {
  return (
    <View style={[styles.iconBox, {backgroundColor, borderColor}]}>
      <Fontisto name={name} color={color} size={19} />
    </View>
  );
}

function SectionTitle({children}: {children: React.ReactNode}) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function SettingsScreen() {
  const {isSatelliteViewEnabled, setSatelliteViewEnabled} =
    useMapPreferences();
  const {
    isHapticFeedbackEnabled,
    setHapticFeedbackEnabled,
    triggerHaptic,
  } = useHapticFeedback();
  const [measurementSystem, setMeasurementSystem] = useState<
    'metric' | 'imperial'
  >('metric');

  const handleSatelliteViewChange = (enabled: boolean) => {
    triggerHaptic(enabled ? 'toggleOn' : 'toggleOff');
    setSatelliteViewEnabled(enabled);
  };

  const selectMeasurementSystem = (system: 'metric' | 'imperial') => {
    setMeasurementSystem(system);
    triggerHaptic('selection');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Impostazioni</Text>
        <View style={styles.headerIcon}>
          <Fontisto name="equalizer" color="#64748B" size={17} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <SectionTitle>MAPPA &amp; VISUALIZZAZIONE</SectionTitle>
          <View style={styles.card}>
            <View style={styles.settingRowTop}>
              <SettingIcon
                name="map"
                color="#059669"
                backgroundColor="#ECFDF5"
                borderColor="#D1FAE5"
              />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>
                  Vista satellitare ibrida
                </Text>
                <Text style={styles.description}>
                  Mostra immagini satellitari dettagliate sovrapposte a nomi
                  di città, strade e confini.
                </Text>
              </View>
              <Switch
                accessibilityLabel="Vista satellitare ibrida"
                value={isSatelliteViewEnabled}
                trackColor={{false: '#CBD5E1', true: '#10B981'}}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#CBD5E1"
                onValueChange={handleSatelliteViewChange}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <SectionTitle>INTERAZIONI &amp; DISPOSITIVO</SectionTitle>
          <View style={styles.card}>
            <View style={styles.settingRowTop}>
              <SettingIcon
                name="mobile"
                color="#059669"
                backgroundColor="#ECFDF5"
                borderColor="#D1FAE5"
              />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Feedback aptico</Text>
                <Text style={styles.description}>
                  Riproduce una risposta tattile calibrata durante le azioni
                  principali e i cambi di stato.
                </Text>
              </View>
              <Switch
                accessibilityLabel="Feedback aptico"
                value={isHapticFeedbackEnabled}
                trackColor={{false: '#CBD5E1', true: '#10B981'}}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#CBD5E1"
                onValueChange={setHapticFeedbackEnabled}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRowCenter}>
              <SettingIcon
                name="arrow-h"
                color="#D97706"
                backgroundColor="#FFFBEB"
                borderColor="#FEF3C7"
              />
              <Text style={[styles.settingTitle, styles.measurementTitle]}>
                Unità di misura
              </Text>
              <View style={styles.segmentedControl}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{
                    selected: measurementSystem === 'metric',
                  }}
                  style={[
                    styles.segmentButton,
                    measurementSystem === 'metric' &&
                      styles.segmentButtonActive,
                  ]}
                  onPress={() => selectMeasurementSystem('metric')}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      measurementSystem === 'metric' &&
                        styles.segmentTextActive,
                    ]}
                  >
                    Metrico
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{
                    selected: measurementSystem === 'imperial',
                  }}
                  style={[
                    styles.segmentButton,
                    measurementSystem === 'imperial' &&
                      styles.segmentButtonActive,
                  ]}
                  onPress={() => selectMeasurementSystem('imperial')}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      measurementSystem === 'imperial' &&
                        styles.segmentTextActive,
                    ]}
                  >
                    Imperiale
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <SectionTitle>INFO &amp; SUPPORTO</SectionTitle>
          <View style={styles.card}>
            <View style={styles.settingRowCenter}>
              <SettingIcon
                name="world-o"
                color="#9333EA"
                backgroundColor="#FAF5FF"
                borderColor="#F3E8FF"
              />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>
                  Fornitori Dati Cartografici
                </Text>
                <Text style={styles.infoDescription}>
                  MapLibre GL • OpenStreetMap
                </Text>
              </View>
              <Fontisto name="export" color="#94A3B8" size={17} />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRowCenter}>
              <SettingIcon
                name="shield"
                color="#475569"
                backgroundColor="#F1F5F9"
                borderColor="#E2E8F0"
              />
              <Text style={[styles.settingTitle, styles.versionTitle]}>
                Versione applicazione
              </Text>
              <Text style={styles.versionBadge}>v2.4.0 (26.5)</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F8FAFC'},
  header: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    color: '#0F172A',
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  headerIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  scrollView: {flex: 1},
  content: {
    gap: 24,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 32,
  },
  section: {gap: 9},
  sectionTitle: {
    paddingHorizontal: 8,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  card: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  settingRowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 13,
    padding: 16,
  },
  settingRowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 16,
  },
  iconBox: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 13,
  },
  settingText: {flex: 1},
  settingTitle: {color: '#0F172A', fontSize: 15, fontWeight: '700'},
  description: {
    marginTop: 3,
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
  },
  infoDescription: {marginTop: 3, color: '#64748B', fontSize: 12},
  divider: {height: 1, backgroundColor: '#F1F5F9'},
  measurementTitle: {flex: 1},
  segmentedControl: {
    flexDirection: 'row',
    padding: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  segmentButton: {paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8},
  segmentButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentText: {color: '#64748B', fontSize: 12, fontWeight: '600'},
  segmentTextActive: {color: '#0F172A'},
  versionTitle: {flex: 1},
  versionBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: '#F1F5F9',
  },
});
