import React, {useCallback, useEffect, useRef} from 'react';
import {Pressable, ScrollView, Text, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import {styles} from '../styles/mapStyle';

const CHIP_STEP = 52;

type Props = {
  waypoints: {id: number}[];
  selectedId: number | null;
  isEditing: boolean;
  isDarkMode: boolean;
  reduceMotion: boolean;
  selectWaypoint: (id: number) => void;
  beginRelocation: () => void;
  reorderSelectedWaypoint: (offset: -1 | 1) => void;
  removeSelectedWaypoint: () => void;
};

export function WaypointControls({
  waypoints,
  selectedId,
  isEditing,
  isDarkMode,
  reduceMotion,
  selectWaypoint,
  beginRelocation,
  reorderSelectedWaypoint,
  removeSelectedWaypoint,
}: Props) {
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const scrollOffset = useRef(0);
  const viewportWidth = useRef(0);
  const selectedIndex = waypoints.findIndex(point => point.id === selectedId);
  const hasSelection = selectedIndex >= 0 && !isEditing;
  const canMoveBefore = hasSelection && selectedIndex > 0;
  const canMoveAfter = hasSelection && selectedIndex < waypoints.length - 1;

  const revealSelection = useCallback(() => {
    if (selectedIndex < 0 || viewportWidth.current <= 0) {
      return;
    }

    const start = selectedIndex * CHIP_STEP;
    const end = start + CHIP_STEP - 8;
    const offset = scrollOffset.current;
    if (start < offset || end > offset + viewportWidth.current) {
      const x = start < offset ? start : end - viewportWidth.current;
      scroll.current?.scrollTo({x, animated: !reduceMotion});
    }
  }, [reduceMotion, selectedIndex]);

  useEffect(revealSelection, [revealSelection]);

  return (
    <>
      {waypoints.length > 0 ? (
        <View style={styles.waypointTools}>
          <ScrollView
            ref={scroll}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.waypointList}
            contentContainerStyle={styles.waypointStrip}
            onLayout={({nativeEvent}) => {
              viewportWidth.current = nativeEvent.layout.width;
              revealSelection();
            }}
            scrollEventThrottle={16}
            onScroll={({nativeEvent}) => {
              scrollOffset.current = nativeEvent.contentOffset.x;
            }}
          >
            {waypoints.map(({id}, index) => {
              const selected = id === selectedId;
              const label =
                index === 0
                  ? 'Partenza'
                  : index === waypoints.length - 1
                  ? 'Arrivo'
                  : 'Waypoint';
              return (
                <Pressable
                  key={id}
                  accessibilityRole="button"
                  accessibilityLabel={`${label}, punto ${index + 1}`}
                  accessibilityState={{selected, disabled: isEditing}}
                  disabled={isEditing}
                  style={({pressed}) => [
                    styles.waypointChip,
                    isDarkMode && styles.waypointChipDark,
                    selected && styles.waypointChipSelected,
                    pressed && styles.controlPressed,
                  ]}
                  onPress={() => selectWaypoint(id)}
                >
                  <Text
                    style={[
                      styles.waypointChipText,
                      isDarkMode && styles.primaryTextDark,
                      selected && styles.waypointChipTextSelected,
                    ]}
                  >
                    {index + 1}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sposta il waypoint selezionato sulla mappa"
            disabled={!hasSelection}
            style={({pressed}) => [
              styles.sheetSaveButton,
              styles.relocateButton,
              !hasSelection && styles.controlDisabled,
              pressed && styles.controlPressed,
            ]}
            onPress={beginRelocation}
          >
            <MaterialCommunityIcons
              name="crosshairs"
              color="#0369A1"
              size={15}
            />
            <Text style={styles.sheetSaveText}>Sposta</Text>
          </Pressable>
        </View>
      ) : (
        <Text
          style={[styles.waypointHint, isDarkMode && styles.secondaryTextDark]}
        >
          Tocca la mappa per aggiungere un waypoint.
        </Text>
      )}

      <View style={styles.sheetButtonRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sposta il waypoint prima"
          disabled={!canMoveBefore}
          style={[
            styles.sheetSecondaryButton,
            !canMoveBefore && styles.controlDisabled,
          ]}
          onPress={() => reorderSelectedWaypoint(-1)}
        >
          <MaterialCommunityIcons
            name="chevron-left"
            color="#334155"
            size={14}
          />
          <Text style={styles.sheetSecondaryText}>Prima</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Elimina il waypoint selezionato"
          disabled={!hasSelection}
          style={[
            styles.sheetDeleteButton,
            !hasSelection && styles.controlDisabled,
          ]}
          onPress={removeSelectedWaypoint}
        >
          <MaterialCommunityIcons
            name="delete-outline"
            color="#E11D48"
            size={14}
          />
          <Text style={styles.sheetDeleteText}>Elimina</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sposta il waypoint dopo"
          disabled={!canMoveAfter}
          style={[
            styles.sheetSecondaryButton,
            !canMoveAfter && styles.controlDisabled,
          ]}
          onPress={() => reorderSelectedWaypoint(1)}
        >
          <Text style={styles.sheetSecondaryText}>Dopo</Text>
          <MaterialCommunityIcons
            name="chevron-right"
            color="#334155"
            size={14}
          />
        </Pressable>
      </View>
    </>
  );
}
