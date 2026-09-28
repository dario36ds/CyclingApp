import React from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import {useHapticFeedback} from '../context/HapticFeedbackContext';
import {useMapPreferences} from '../context/MapPreferencesContext';
import {useTheme} from '../context/ThemeContext';

type SettingIconProps = {
  backgroundColor: string;
  borderColor: string;
  color: string;
  name: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
};

function SettingIcon({
  backgroundColor,
  borderColor,
  color,
  name,
}: SettingIconProps) {
  return (
    <View style={[styles.iconBox, {backgroundColor, borderColor}]}>
      <MaterialCommunityIcons name={name} color={color} size={19} />
    </View>
  );
}

function SectionTitle({children}: {children: React.ReactNode}) {
  const {isDarkMode} = useTheme();

  return (
    <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
      {children}
    </Text>
  );
}

export function SettingsScreen() {
  const {
    isSatelliteViewEnabled,
    setSatelliteViewEnabled,
    measurementSystem,
    setMeasurementSystem,
  } = useMapPreferences();
  const {
    isHapticFeedbackEnabled,
    setHapticFeedbackEnabled,
    triggerHaptic,
  } = useHapticFeedback();
  const {isDarkMode, setIsDarkMode} = useTheme();
  const handleSatelliteViewChange = (enabled: boolean) => {
    triggerHaptic(enabled ? 'toggleOn' : 'toggleOff');
    setSatelliteViewEnabled(enabled);
  };

  const handleDarkModeChange = (enabled: boolean) => {
    triggerHaptic(enabled ? 'toggleOn' : 'toggleOff');
    setIsDarkMode(enabled);
  };

  const selectMeasurementSystem = (system: 'metric' | 'imperial') => {
    setMeasurementSystem(system);
    triggerHaptic('selection');
  };

  const openMapLibreWebsite = () => {
    triggerHaptic('selection');
    Linking.openURL('https://maplibre.org/').catch(error =>
      console.error('Impossibile aprire il sito di MapLibre:', error),
    );
  };

  const openOrsWebsite = () => {
    triggerHaptic('selection');
    Linking.openURL('https://openrouteservice.org/').catch(error =>
      console.error('Impossibile aprire il sito di openrouteservice:', error),
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, isDarkMode && styles.containerDark]}
      edges={['top']}
    >
      <View style={[styles.header, isDarkMode && styles.headerDark]}>
        <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>
          Impostazioni
        </Text>
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons name="tune-variant" color="#64748B" size={17} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <SectionTitle>MAPPA &amp; VISUALIZZAZIONE</SectionTitle>
          <View style={[styles.card, isDarkMode && styles.cardDark]}>
            <View style={styles.settingRowTop}>
              <SettingIcon
                name="map"
                color="#059669"
                backgroundColor="#ECFDF5"
                borderColor="#D1FAE5"
              />
              <View style={styles.settingText}>
                <Text
                  style={[styles.settingTitle, isDarkMode && styles.settingTitleDark]}
                >
                  Vista satellitare ibrida
                </Text>
                <Text style={[styles.description, isDarkMode && styles.descriptionDark]}>
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

            <View style={[styles.divider, isDarkMode && styles.dividerDark]} />

            <View style={styles.settingRowTop}>
              <SettingIcon
                name="theme-light-dark"
                color="#7C3AED"
                backgroundColor="#F5F3FF"
                borderColor="#EDE9FE"
              />
              <View style={styles.settingText}>
                <Text
                  style={[styles.settingTitle, isDarkMode && styles.settingTitleDark]}
                >
                  Tema scuro
                </Text>
                <Text style={[styles.description, isDarkMode && styles.descriptionDark]}>
                  Usa colori scuri nell’interfaccia dell’app.
                </Text>
              </View>
              <Switch
                accessibilityLabel="Tema scuro"
                value={isDarkMode}
                trackColor={{false: '#CBD5E1', true: '#10B981'}}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#CBD5E1"
                onValueChange={handleDarkModeChange}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <SectionTitle>INTERAZIONI &amp; DISPOSITIVO</SectionTitle>
          <View style={[styles.card, isDarkMode && styles.cardDark]}>
            <View style={styles.settingRowTop}>
              <SettingIcon
                name="cellphone"
                color="#059669"
                backgroundColor="#ECFDF5"
                borderColor="#D1FAE5"
              />
              <View style={styles.settingText}>
                <Text
                  style={[styles.settingTitle, isDarkMode && styles.settingTitleDark]}
                >
                  Feedback aptico
                </Text>
                <Text style={[styles.description, isDarkMode && styles.descriptionDark]}>
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

            <View style={[styles.divider, isDarkMode && styles.dividerDark]} />

            <View style={styles.settingRowCenter}>
              <SettingIcon
                name="arrow-left-right"
                color="#D97706"
                backgroundColor="#FFFBEB"
                borderColor="#FEF3C7"
              />
              <Text
                style={[
                  styles.settingTitle,
                  styles.measurementTitle,
                  isDarkMode && styles.settingTitleDark,
                ]}
              >
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
          <View style={[styles.card, isDarkMode && styles.cardDark]}>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Apri il sito di MapLibre"
              style={styles.settingRowCenter}
              onPress={openMapLibreWebsite}
            >
              <SettingIcon
                name="web"
                color="#9333EA"
                backgroundColor="#FAF5FF"
                borderColor="#F3E8FF"
              />
              <View style={styles.settingText}>
                <Text
                  style={[styles.settingTitle, isDarkMode && styles.settingTitleDark]}
                >
                  Fornitori Dati Cartografici
                </Text>
                <Text
                  style={[
                    styles.infoDescription,
                    isDarkMode && styles.descriptionDark,
                  ]}
                >
                  MapLibre GL • OpenStreetMap
                </Text>
              </View>
              <MaterialCommunityIcons
                name="export-variant"
                color="#94A3B8"
                size={17}
              />
            </Pressable>

            <View style={[styles.divider, isDarkMode && styles.dividerDark]} />

            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Apri il sito di openrouteservice"
              style={styles.settingRowCenter}
              onPress={openOrsWebsite}
            >
              <SettingIcon
                name="routes"
                color="#2563EB"
                backgroundColor="#EFF6FF"
                borderColor="#DBEAFE"
              />
              <View style={styles.settingText}>
                <Text
                  style={[styles.settingTitle, isDarkMode && styles.settingTitleDark]}
                >
                  Calcolo percorsi
                </Text>
                <Text
                  style={[
                    styles.infoDescription,
                    isDarkMode && styles.descriptionDark,
                  ]}
                >
                  OpenRouteService (ORS)
                </Text>
              </View>
              <MaterialCommunityIcons
                name="export-variant"
                color="#94A3B8"
                size={17}
              />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F8FAFC'},
  containerDark: {backgroundColor: '#0F172A'},
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
  headerDark: {borderBottomColor: '#334155', backgroundColor: '#1E293B'},
  headerTitleDark: {color: '#F8FAFC'},
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
  sectionTitleDark: {color: '#94A3B8'},
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
  cardDark: {borderColor: '#334155', backgroundColor: '#1E293B'},
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
  settingTitleDark: {color: '#F8FAFC'},
  description: {
    marginTop: 3,
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
  },
  descriptionDark: {color: '#CBD5E1'},
  infoDescription: {marginTop: 3, color: '#64748B', fontSize: 12},
  divider: {height: 1, backgroundColor: '#F1F5F9'},
  dividerDark: {backgroundColor: '#334155'},
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
});
