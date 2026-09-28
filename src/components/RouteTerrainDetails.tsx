import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import type {
  RouteBreakdownItem,
  RouteTerrainDetails as RouteTerrainDetailsData,
} from '../utils/routeStats';
import {useMapPreferences} from '../context/MapPreferencesContext';
import {useTheme} from '../context/ThemeContext';
import {formatDistance} from '../utils/routeStats';

type RouteTerrainDetailsProps = {
  details: RouteTerrainDetailsData;
};

function formatPercentage(percentage: number) {
  return `${percentage.toLocaleString('it-IT', {
    maximumFractionDigits: 1,
  })}%`;
}

function BreakdownRow({item}: {item: RouteBreakdownItem}) {
  const {measurementSystem} = useMapPreferences();
  const {isDarkMode} = useTheme();

  return (
    <View style={styles.breakdownRow}>
      <View style={styles.breakdownHeader}>
        <Text
          style={[styles.breakdownLabel, isDarkMode && styles.breakdownLabelDark]}
        >
          {item.label}
        </Text>
        <Text
          style={[styles.breakdownValue, isDarkMode && styles.breakdownValueDark]}
        >
          {formatPercentage(item.percentage)} ·{' '}
          {formatDistance(item.distanceMeters, measurementSystem)}
        </Text>
      </View>
      <View style={[styles.progressTrack, isDarkMode && styles.progressTrackDark]}>
        <View
          style={[styles.progressFill, {width: `${item.percentage}%`}]}
        />
      </View>
    </View>
  );
}

export function RouteTerrainDetails({details}: RouteTerrainDetailsProps) {
  const {isDarkMode} = useTheme();

  return (
    <View style={styles.container}>
      <View>
        <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
          Tipo di terreno
        </Text>
        <Text
          style={[
            styles.sectionDescription,
            isDarkMode && styles.sectionDescriptionDark,
          ]}
        >
          Distribuzione rilevata da OpenStreetMap lungo il percorso e
          semplificata in tre categorie.
        </Text>
      </View>

      {details.surfaces.length > 0 ? (
        details.surfaces.map(item => (
          <BreakdownRow key={item.value} item={item} />
        ))
      ) : (
        <Text style={[styles.emptyText, isDarkMode && styles.sectionDescriptionDark]}>
          Dati sulla superficie non disponibili.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  sectionTitle: {
    color: '#18181B',
    fontSize: 16,
    fontWeight: '800',
  },
  sectionTitleDark: {color: '#F8FAFC'},
  sectionDescription: {
    marginTop: 4,
    color: '#71717A',
    fontSize: 13,
    lineHeight: 18,
  },
  sectionDescriptionDark: {color: '#CBD5E1'},
  breakdownRow: {
    gap: 6,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  breakdownLabel: {
    flex: 1,
    color: '#3F3F46',
    fontSize: 14,
    fontWeight: '600',
  },
  breakdownLabelDark: {color: '#F8FAFC'},
  breakdownValue: {
    color: '#52525B',
    fontSize: 13,
    fontWeight: '600',
  },
  breakdownValueDark: {color: '#CBD5E1'},
  progressTrack: {
    height: 7,
    overflow: 'hidden',
    borderRadius: 4,
    backgroundColor: '#E4E4E7',
  },
  progressTrackDark: {backgroundColor: '#475569'},
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#059669',
  },
  emptyText: {
    color: '#71717A',
    fontSize: 14,
    fontStyle: 'italic',
  },
});
