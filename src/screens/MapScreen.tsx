import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Animated,
  Alert,
  Modal,
  NativeSyntheticEvent,
  PanResponder,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Camera,
  GeoJSONSource,
  Layer,
  LocationManager,
  Map,
  UserLocation,
  ViewAnnotation,
} from '@maplibre/maplibre-react-native';
import type {
  CameraRef,
  GeolocationPosition,
  LngLatBounds,
  StyleSpecification,
} from '@maplibre/maplibre-react-native';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import {ElevationProfile} from '../components/ElevationProfile';
import {RouteTerrainDetails} from '../components/RouteTerrainDetails';
import {Button, ButtonText} from '../components/ui/button';
import {useHapticFeedback} from '../context/HapticFeedbackContext';
import {useMapPreferences} from '../context/MapPreferencesContext';
import {useTheme} from '../context/ThemeContext';
import type {RootTabParamList} from '../navigation/types';
import {calculateRoute} from '../services/openRouteService';
import {saveRoute} from '../services/savedRoutesService';
import {styles} from '../styles/mapStyle';
import type {Coordinate} from '../types/route';
import {
  formatDistance,
  formatDuration,
  formatElevation,
  getElevationProfile,
  getRouteTerrainDetails,
  getRouteStats,
} from '../utils/routeStats';

type Waypoint = {
  id: number;
  coordinate: Coordinate;
};

type MapPressEvent = NativeSyntheticEvent<{
  lngLat: Coordinate;
}>;

type MapScreenProps = BottomTabScreenProps<RootTabParamList, 'Map'>;

const STREET_MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const ITALY_CENTER: Coordinate = [12.5674, 41.8719];
const LOCATION_TIMEOUT_MS = 12_000;
const COLLAPSED_SHEET_HEIGHT = 44;

const HYBRID_MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    satellite: {
      type: 'raster',
      tiles: [
        'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution:
        'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    },
    hybridReference: {
      type: 'raster',
      tiles: [
        'https://who.maptiles.arcgis.com/arcgis/rest/services/World_Hybrid_Overlay/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: 'Reference overlay © Esri',
    },
  },
  layers: [
    {
      id: 'satellite',
      type: 'raster',
      source: 'satellite',
    },
    {
      id: 'hybridReference',
      type: 'raster',
      source: 'hybridReference',
    },
  ],
};

function getCurrentDevicePosition() {
  return new Promise<GeolocationPosition | undefined>(resolve => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const onLocationUpdate = (position: GeolocationPosition) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      LocationManager.removeListener(onLocationUpdate);
      resolve(position);
    };

    timeoutId = setTimeout(() => {
      LocationManager.removeListener(onLocationUpdate);
      resolve(undefined);
    }, LOCATION_TIMEOUT_MS);

    LocationManager.addListener(onLocationUpdate);
  });
}

export function MapScreen({navigation, route: navigationRoute}: MapScreenProps) {
  const cameraRef = useRef<CameraRef>(null);
  const actionSheetTranslateY = useRef(new Animated.Value(0)).current;
  const actionSheetHeight = useRef(0);
  const actionSheetOffsetY = useRef(0);
  const isActionSheetCollapsed = useRef(false);
  const insets = useSafeAreaInsets();
  const {
    isSatelliteViewEnabled,
    setSatelliteViewEnabled,
    measurementSystem,
  } = useMapPreferences();
  const {triggerHaptic} = useHapticFeedback();
  const {isDarkMode} = useTheme();
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [nextWaypointId, setNextWaypointId] = useState(0);
  const [selectedWaypointId, setSelectedWaypointId] = useState<number | null>(
    null,
  );
  const [isSavingRoute, setIsSavingRoute] = useState(false);
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
  const [isElevationModalVisible, setIsElevationModalVisible] = useState(false);
  const [isTerrainModalVisible, setIsTerrainModalVisible] = useState(false);
  const [is3DEnabled, setIs3DEnabled] = useState(false);
  const [isCenteringOnLocation, setIsCenteringOnLocation] = useState(false);
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const [routeName, setRouteName] = useState('');
  const [route, setRoute] = useState<any>(null);
  const routeStats = getRouteStats(route);
  const elevationProfile = getElevationProfile(route);
  const terrainDetails = getRouteTerrainDetails(route);
  const selectedWaypointIndex = waypoints.findIndex(
    waypoint => waypoint.id === selectedWaypointId,
  );
  const topControlsStyle = [
    styles.topControls,
    {top: insets.top + 10},
  ];
  const quickControlsStyle = [
    styles.quickControls,
    {top: insets.top + 172},
  ];

  const snapActionSheet = useCallback(
    (collapsed: boolean) => {
      const nextOffset = collapsed
        ? Math.max(0, actionSheetHeight.current - COLLAPSED_SHEET_HEIGHT)
        : 0;

      Animated.spring(actionSheetTranslateY, {
        toValue: nextOffset,
        useNativeDriver: true,
        damping: 20,
        stiffness: 220,
        mass: 0.7,
      }).start(({finished}) => {
        if (finished) {
          actionSheetOffsetY.current = nextOffset;
          isActionSheetCollapsed.current = collapsed;
        }
      });
    },
    [actionSheetTranslateY],
  );

  const handleActionSheetLayout = useCallback(
    ({nativeEvent}: {nativeEvent: {layout: {height: number}}}) => {
      actionSheetHeight.current = nativeEvent.layout.height;

      if (isActionSheetCollapsed.current) {
        const collapsedOffset = Math.max(
          0,
          actionSheetHeight.current - COLLAPSED_SHEET_HEIGHT,
        );
        actionSheetOffsetY.current = collapsedOffset;
        actionSheetTranslateY.setValue(collapsedOffset);
      }
    },
    [actionSheetTranslateY],
  );

  const actionSheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > 3 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderGrant: () => {
          actionSheetTranslateY.stopAnimation(value => {
            actionSheetOffsetY.current = value;
          });
        },
        onPanResponderMove: (_, gestureState) => {
          const maxOffset = Math.max(
            0,
            actionSheetHeight.current - COLLAPSED_SHEET_HEIGHT,
          );
          const nextOffset = Math.min(
            maxOffset,
            Math.max(0, actionSheetOffsetY.current + gestureState.dy),
          );

          actionSheetTranslateY.setValue(nextOffset);
        },
        onPanResponderRelease: (_, gestureState) => {
          const maxOffset = Math.max(
            0,
            actionSheetHeight.current - COLLAPSED_SHEET_HEIGHT,
          );
          const currentOffset = Math.min(
            maxOffset,
            Math.max(0, actionSheetOffsetY.current + gestureState.dy),
          );
          const shouldCollapse =
            gestureState.vy > 0.3 || currentOffset > maxOffset / 2;

          snapActionSheet(shouldCollapse);
        },
        onPanResponderTerminate: () => {
          snapActionSheet(isActionSheetCollapsed.current);
        },
      }),
    [actionSheetTranslateY, snapActionSheet],
  );

  useEffect(() => {
    const savedRoute = navigationRoute.params?.savedRoute;

    if (!savedRoute) {
      return;
    }

    setWaypoints(
      savedRoute.waypoints.map((coordinate, id) => ({id, coordinate})),
    );
    setNextWaypointId(savedRoute.waypoints.length);
    setSelectedWaypointId(null);
    setRoute(savedRoute.geoJson);

    if (savedRoute.waypoints.length > 0) {
      const longitudes = savedRoute.waypoints.map(([longitude]) => longitude);
      const latitudes = savedRoute.waypoints.map(([, latitude]) => latitude);
      const longitudePadding = Math.max(
        (Math.max(...longitudes) - Math.min(...longitudes)) * 0.08,
        0.005,
      );
      const latitudePadding = Math.max(
        (Math.max(...latitudes) - Math.min(...latitudes)) * 0.08,
        0.005,
      );
      const bounds: LngLatBounds = [
        Math.min(...longitudes) - longitudePadding,
        Math.min(...latitudes) - latitudePadding,
        Math.max(...longitudes) + longitudePadding,
        Math.max(...latitudes) + latitudePadding,
      ];

      cameraRef.current?.fitBounds(bounds, {
        padding: {top: 48, right: 32, bottom: 224, left: 32},
        duration: 700,
      });
    }

    navigation.setParams({savedRoute: undefined});
  }, [navigation, navigationRoute.params?.savedRoute]);

  const handleMapPress = (event: MapPressEvent) => {
    triggerHaptic('impactLight');
    const [lng, lat] = event.nativeEvent.lngLat;
    const newWaypoint: Waypoint = {
      id: nextWaypointId,
      coordinate: [lng, lat],
    };

    setWaypoints(current => [...current, newWaypoint]);
    setNextWaypointId(current => current + 1);
    setSelectedWaypointId(null);
    setRoute(null);
  };

  const clearWaypoints = () => {
    Alert.alert(
      'Cancellare tutti i waypoint?',
      'Questa azione rimuoverà tutti i waypoint e il percorso calcolato.',
      [
        {text: 'Annulla', style: 'cancel'},
        {
          text: 'Cancella',
          style: 'destructive',
          onPress: () => {
            triggerHaptic('impactMedium');
            setWaypoints([]);
            setSelectedWaypointId(null);
            setRoute(null);
          },
        },
      ],
    );
  };

  const handleCalculateRoute = async () => {
    if (waypoints.length < 2) {
      return;
    }

    try {
      const routeData = await calculateRoute(
        waypoints.map(waypoint => waypoint.coordinate),
      );
      setRoute(routeData);
      triggerHaptic('notificationSuccess');
    } catch (error) {
      triggerHaptic('notificationError');
      console.error('Errore durante il calcolo del percorso:', error);
    }
  };

  const removeWaypoint = (idToRemove: number) => {
    triggerHaptic('notificationWarning');
    setWaypoints(current => current.filter(({id}) => id !== idToRemove));
    setSelectedWaypointId(null);
    setRoute(null);
  };

  const reorderSelectedWaypoint = (offset: -1 | 1) => {
    const targetIndex = selectedWaypointIndex + offset;

    if (
      selectedWaypointId === null ||
      selectedWaypointIndex === -1 ||
      targetIndex < 0 ||
      targetIndex >= waypoints.length
    ) {
      return;
    }

    setWaypoints(current => {
      const currentIndex = current.findIndex(
        waypoint => waypoint.id === selectedWaypointId,
      );
      const nextIndex = currentIndex + offset;

      if (
        currentIndex === -1 ||
        nextIndex < 0 ||
        nextIndex >= current.length
      ) {
        return current;
      }

      const reorderedWaypoints = [...current];
      const [selectedWaypoint] = reorderedWaypoints.splice(currentIndex, 1);
      reorderedWaypoints.splice(nextIndex, 0, selectedWaypoint);

      return reorderedWaypoints;
    });

    triggerHaptic('impactLight');
    setRoute(null);
  };

  const moveWaypoint = (idToMove: number, coordinate: Coordinate) => {
    setWaypoints(current =>
      current.map(waypoint =>
        waypoint.id === idToMove ? {...waypoint, coordinate} : waypoint,
      ),
    );
    setRoute(null);
  };

  const selectWaypoint = (id: number) => {
    triggerHaptic('selection');
    setSelectedWaypointId(id);
  };

  const startMovingWaypoint = (id: number) => {
    triggerHaptic('impactMedium');
    setSelectedWaypointId(id);
  };

  const openSaveRouteModal = () => {
    triggerHaptic('selection');
    setRouteName('');
    setIsSaveModalVisible(true);
  };

  const openElevationProfile = () => {
    if (!elevationProfile) {
      return;
    }

    triggerHaptic('selection');
    setIsElevationModalVisible(true);
  };

  const closeElevationProfile = () => {
    triggerHaptic('selection');
    setIsElevationModalVisible(false);
  };

  const openTerrainDetails = () => {
    if (!terrainDetails) {
      return;
    }

    triggerHaptic('selection');
    setIsTerrainModalVisible(true);
  };

  const closeTerrainDetails = () => {
    triggerHaptic('selection');
    setIsTerrainModalVisible(false);
  };

  const closeSaveRouteModal = () => {
    if (!isSavingRoute) {
      setIsSaveModalVisible(false);
    }
  };

  const handleSaveRoute = async () => {
    const trimmedRouteName = routeName.trim();

    if (!route || isSavingRoute || !trimmedRouteName) {
      return;
    }

    setIsSavingRoute(true);

    try {
      await saveRoute({
        name: trimmedRouteName,
        waypoints: waypoints.map(waypoint => waypoint.coordinate),
        geoJson: route,
      });
      setIsSaveModalVisible(false);
      triggerHaptic('notificationSuccess');
      Alert.alert(
        'Percorso salvato',
        `Il percorso “${trimmedRouteName}” è stato salvato sul dispositivo.`,
      );
    } catch (error: unknown) {
      triggerHaptic('notificationError');
      const errorMessage =
        error instanceof Error ? error.message : 'Errore sconosciuto.';

      Alert.alert(
        'Salvataggio non riuscito',
        `Non è stato possibile salvare il percorso.\n\nDettaglio: ${errorMessage}`,
      );
    } finally {
      setIsSavingRoute(false);
    }
  };

  const handleSatelliteViewChange = (enabled: boolean) => {
    triggerHaptic(enabled ? 'toggleOn' : 'toggleOff');
    setSatelliteViewEnabled(enabled);
  };

  const getMapFocusCoordinate = (): Coordinate => {
    if (waypoints.length === 0) {
      return ITALY_CENTER;
    }

    const [longitudeSum, latitudeSum] = waypoints.reduce(
      ([longitude, latitude], waypoint) => [
        longitude + waypoint.coordinate[0],
        latitude + waypoint.coordinate[1],
      ],
      [0, 0],
    );

    return [
      longitudeSum / waypoints.length,
      latitudeSum / waypoints.length,
    ];
  };

  const centerMap = async () => {
    triggerHaptic('selection');

    if (isCenteringOnLocation) {
      return;
    }

    setIsCenteringOnLocation(true);

    try {
      const hasPermission = await LocationManager.requestPermissions();

      if (!hasPermission) {
        Alert.alert(
          'Posizione non disponibile',
          'Consenti l’accesso alla posizione dalle impostazioni del dispositivo per centrare la mappa.',
        );
        return;
      }

      LocationManager.setMinDisplacement(5);
      const currentPosition = await getCurrentDevicePosition();

      if (!currentPosition) {
        Alert.alert(
          'Posizione non disponibile',
          'Non è stato possibile rilevare la tua posizione. Verifica che il GPS sia attivo e riprova.',
        );
        return;
      }

      setIsLocationEnabled(true);
      cameraRef.current?.flyTo({
        center: [
          currentPosition.coords.longitude,
          currentPosition.coords.latitude,
        ],
        zoom: 15,
        duration: 700,
      });
    } catch {
      Alert.alert(
        'Posizione non disponibile',
        'Non è stato possibile avviare il GPS. Verifica i permessi e riprova.',
      );
    } finally {
      setIsCenteringOnLocation(false);
    }
  };

  const toggle3DView = () => {
    const enabled = !is3DEnabled;

    triggerHaptic('selection');
    setIs3DEnabled(enabled);
    cameraRef.current?.easeTo({
      center: getMapFocusCoordinate(),
      pitch: enabled ? 55 : 0,
      duration: 500,
    });
  };

  return (
    <View style={styles.container}>
      <Map
        style={styles.map}
        mapStyle={
          isSatelliteViewEnabled ? HYBRID_MAP_STYLE : STREET_MAP_STYLE
        }
        onPress={handleMapPress}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{
            center: ITALY_CENTER,
            zoom: 4.5,
          }}
        />

        {isLocationEnabled && (
          <UserLocation animated accuracy heading minDisplacement={5} />
        )}

        {route && (
          <GeoJSONSource id="routeSource" data={route}>
            <Layer
              id="routeOutline"
              type="line"
              paint={{
                'line-color': isSatelliteViewEnabled ? '#FFFFFF' : '#166534',
                'line-width': 8,
                'line-opacity': 0.9,
              }}
              layout={{'line-cap': 'round', 'line-join': 'round'}}
            />
            <Layer
              id="routeLine"
              type="line"
              paint={{
                'line-color': isSatelliteViewEnabled ? '#FDE047' : '#16A34A',
                'line-width': 5,
              }}
              layout={{'line-cap': 'round', 'line-join': 'round'}}
            />
          </GeoJSONSource>
        )}

        {waypoints.map(({id, coordinate}, index) => (
          <ViewAnnotation
            key={id}
            id={`waypoint-${id}`}
            lngLat={coordinate}
            anchor="center"
            draggable
            onPress={event => {
              event.stopPropagation();
              selectWaypoint(id);
            }}
            onDragStart={() => startMovingWaypoint(id)}
            onDragEnd={event => moveWaypoint(id, event.nativeEvent.lngLat)}
          >
            <View style={styles.markerContainer}>
              <View
                style={[
                  styles.marker,
                  waypoints.length > 1 &&
                    index === waypoints.length - 1 &&
                    styles.arrivalMarker,
                  selectedWaypointId === id && styles.selectedMarker,
                ]}
              >
                <Text style={styles.markerText}>{index + 1}</Text>
              </View>
              {(index === 0 || index === waypoints.length - 1) && (
                <Text
                  style={[
                    styles.markerLabel,
                    index === waypoints.length - 1 &&
                      waypoints.length > 1 &&
                      styles.arrivalMarkerLabel,
                  ]}
                >
                  {index === 0 ? 'Partenza' : 'Arrivo'}
                </Text>
              )}
            </View>
          </ViewAnnotation>
        ))}
      </Map>

      <View style={topControlsStyle}>
        <View
          style={[styles.mapHeaderCard, isDarkMode && styles.mapHeaderCardDark]}
        >
          <View style={styles.mapHeaderIdentity}>
            <View style={styles.onlineIndicator} />
            <View>
              <Text
                style={[
                  styles.mapHeaderTitle,
                  isDarkMode && styles.primaryTextDark,
                ]}
              >
                Pianifica Percorso
              </Text>
            </View>
          </View>

          <View style={styles.mapTypeToggle}>
            <Text
              style={[
                styles.mapTypeLabel,
                isDarkMode && styles.secondaryTextDark,
              ]}
            >
              Satellite
            </Text>
            <Switch
              accessibilityLabel="Vista satellitare ibrida"
              value={isSatelliteViewEnabled}
              trackColor={{false: '#CBD5E1', true: '#059669'}}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#CBD5E1"
              onValueChange={handleSatelliteViewChange}
            />
          </View>
        </View>

        <View
          accessible
          accessibilityLabel={
            routeStats
              ? `Distanza ${formatDistance(
                  routeStats.distanceMeters,
                  measurementSystem,
                )}, dislivello positivo ${formatElevation(
                  routeStats.ascentMeters,
                  measurementSystem,
                )}`
              : 'Statistiche del percorso non ancora disponibili'
          }
          style={[styles.routeStatsCard, isDarkMode && styles.mapHeaderCardDark]}
        >
          <View style={styles.routeStat}>
            <View style={styles.routeStatHeading}>
              <MaterialCommunityIcons name="map" color="#94A3B8" size={12} />
              <Text style={styles.routeStatLabel}>DISTANZA</Text>
            </View>
            <Text
              style={[styles.routeStatValue, isDarkMode && styles.primaryTextDark]}
            >
              {routeStats
                ? formatDistance(routeStats.distanceMeters, measurementSystem)
                : measurementSystem === 'imperial'
                ? '— mi'
                : '— km'}
            </Text>
          </View>
          <View style={styles.routeStatsDivider} />
          <View style={styles.routeStat}>
            <View style={styles.routeStatHeading}>
              <MaterialCommunityIcons name="chart-line" color="#059669" size={12} />
              <Text style={styles.routeStatLabel}>DISLIVELLO</Text>
            </View>
            <Text
              style={[styles.routeStatValue, isDarkMode && styles.primaryTextDark]}
            >
              {routeStats
                ? formatElevation(routeStats.ascentMeters, measurementSystem)
                : measurementSystem === 'imperial'
                ? '— ft'
                : '— m'}
            </Text>
          </View>
          <View style={styles.routeStatsDivider} />
          <View style={styles.routeStat}>
            <View style={styles.routeStatHeading}>
              <MaterialCommunityIcons name="clock-outline" color="#94A3B8" size={12} />
              <Text style={styles.routeStatLabel}>TEMPO</Text>
            </View>
            <Text
              style={[styles.routeStatValue, isDarkMode && styles.primaryTextDark]}
            >
              {routeStats?.durationSeconds === null || !routeStats
                ? '—'
                : formatDuration(routeStats.durationSeconds)}
            </Text>
          </View>
        </View>
      </View>

      <View style={quickControlsStyle}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Centra la mappa"
          accessibilityState={{disabled: isCenteringOnLocation}}
          disabled={isCenteringOnLocation}
          style={({pressed}) => [
            styles.quickControlButton,
            isDarkMode && styles.quickControlButtonDark,
            pressed && styles.controlPressed,
            isCenteringOnLocation && styles.controlDisabled,
          ]}
          onPress={centerMap}
        >
          <MaterialCommunityIcons
            name="crosshairs-gps"
            color="#0F172A"
            size={20}
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Visuale tridimensionale"
          style={({pressed}) => [
            styles.quickControlButton,
            isDarkMode && styles.quickControlButtonDark,
            is3DEnabled && styles.quickControlButtonActive,
            pressed && styles.controlPressed,
          ]}
          onPress={toggle3DView}
        >
          <Text
            style={[
              styles.quickControlText,
              is3DEnabled && styles.quickControlTextActive,
            ]}
          >
            3D
          </Text>
        </Pressable>
      </View>

      <Animated.View
        style={[
          styles.actionSheet,
          isDarkMode && styles.actionSheetDark,
          {transform: [{translateY: actionSheetTranslateY}]},
        ]}
        onLayout={handleActionSheetLayout}
      >
          <View
            {...actionSheetPanResponder.panHandlers}
            accessibilityLabel="Trascina il pannello azioni per mostrare più mappa"
            accessibilityRole="adjustable"
            style={styles.sheetDragArea}
          >
            <View style={[styles.sheetHandle, isDarkMode && styles.sheetHandleDark]} />
          </View>

          <View style={styles.sheetButtonRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sposta il waypoint prima"
                disabled={
                  selectedWaypointId === null || selectedWaypointIndex <= 0
                }
                style={[
                  styles.sheetSecondaryButton,
                  (selectedWaypointId === null ||
                    selectedWaypointIndex <= 0) &&
                    styles.controlDisabled,
                ]}
                onPress={() => reorderSelectedWaypoint(-1)}
              >
                <MaterialCommunityIcons name="chevron-left" color="#334155" size={14} />
                <Text style={styles.sheetSecondaryText}>Prima</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Elimina il waypoint selezionato"
                disabled={selectedWaypointId === null}
                style={[
                  styles.sheetDeleteButton,
                  selectedWaypointId === null && styles.controlDisabled,
                ]}
                onPress={() => {
                  if (selectedWaypointId !== null) {
                    removeWaypoint(selectedWaypointId);
                  }
                }}
              >
                <MaterialCommunityIcons name="delete-outline" color="#E11D48" size={14} />
                <Text style={styles.sheetDeleteText}>Elimina</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sposta il waypoint dopo"
                disabled={
                  selectedWaypointId === null ||
                  selectedWaypointIndex === -1 ||
                  selectedWaypointIndex === waypoints.length - 1
                }
                style={[
                  styles.sheetSecondaryButton,
                  (selectedWaypointId === null ||
                    selectedWaypointIndex === -1 ||
                    selectedWaypointIndex === waypoints.length - 1) &&
                    styles.controlDisabled,
                ]}
                onPress={() => reorderSelectedWaypoint(1)}
              >
                <Text style={styles.sheetSecondaryText}>Dopo</Text>
                <MaterialCommunityIcons name="chevron-right" color="#334155" size={14} />
              </Pressable>
          </View>

          <View style={styles.sheetButtonRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Apri il profilo altimetrico"
                disabled={!route || !elevationProfile}
                style={[
                  styles.sheetOutlineButton,
                  (!route || !elevationProfile) && styles.controlDisabled,
                ]}
                onPress={openElevationProfile}
              >
                <MaterialCommunityIcons name="chart-line" color="#64748B" size={14} />
                <Text style={styles.sheetOutlineText}>Altimetria</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Apri i tipi di terreno del percorso"
                disabled={!route || !terrainDetails}
                style={[
                  styles.sheetOutlineButton,
                  (!route || !terrainDetails) && styles.controlDisabled,
                ]}
                onPress={openTerrainDetails}
              >
                <MaterialCommunityIcons
                  name="terrain"
                  color="#64748B"
                  size={14}
                />
                <Text style={styles.sheetOutlineText}>Terreno</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Salva il percorso"
                disabled={!route || isSavingRoute}
                style={[
                  styles.sheetSaveButton,
                  (!route || isSavingRoute) && styles.controlDisabled,
                ]}
                onPress={openSaveRouteModal}
              >
                <MaterialCommunityIcons
                  name="content-save-outline"
                  color="#0284C7"
                  size={14}
                />
                <Text style={styles.sheetSaveText}>
                  {isSavingRoute ? 'Salvo...' : 'Salva'}
                </Text>
              </Pressable>
          </View>

          <Pressable
              accessibilityRole="button"
              disabled={waypoints.length < 2}
              style={[
                styles.calculateButton,
                waypoints.length < 2 && styles.calculateButtonDisabled,
              ]}
              onPress={handleCalculateRoute}
            >
              <MaterialCommunityIcons name="map" color="#FFFFFF" size={17} />
              <Text style={styles.calculateButtonText}>Calcola percorso</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={waypoints.length === 0}
            style={[
              styles.clearButton,
              waypoints.length === 0 && styles.controlDisabled,
            ]}
            onPress={clearWaypoints}
          >
            <Text style={styles.clearButtonText}>
              Cancella tutti i waypoint
            </Text>
          </Pressable>
      </Animated.View>

      <Modal
        animationType="slide"
        transparent
        visible={isTerrainModalVisible}
        onRequestClose={closeTerrainDetails}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              styles.terrainModalCard,
              isDarkMode && styles.modalCardDark,
            ]}
          >
            <Text style={styles.modalTitle}>Tipo di terreno</Text>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.terrainModalContent}
            >
              {terrainDetails && (
                <RouteTerrainDetails details={terrainDetails} />
              )}
            </ScrollView>
            <Button variant="outline" onPress={closeTerrainDetails}>
              <ButtonText>Chiudi</ButtonText>
            </Button>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent
        visible={isElevationModalVisible}
        onRequestClose={closeElevationProfile}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              styles.elevationModalCard,
              isDarkMode && styles.modalCardDark,
            ]}
          >
            <Text style={styles.modalTitle}>Profilo altimetrico</Text>
            {elevationProfile && (
              <ElevationProfile profile={elevationProfile} />
            )}
            <Button variant="outline" onPress={closeElevationProfile}>
              <ButtonText>Chiudi</ButtonText>
            </Button>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={isSaveModalVisible}
        onRequestClose={closeSaveRouteModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, isDarkMode && styles.modalCardDark]}>
            <Text
              style={[styles.modalTitle, isDarkMode && styles.primaryTextDark]}
            >
              Nome del percorso
            </Text>
            <TextInput
              style={[
                styles.routeNameInput,
                isDarkMode && styles.routeNameInputDark,
              ]}
              value={routeName}
              onChangeText={setRouteName}
              placeholder="Es. Giro del lago"
              placeholderTextColor={isDarkMode ? '#94A3B8' : '#71717A'}
              autoFocus
              maxLength={80}
              returnKeyType="done"
              onSubmitEditing={handleSaveRoute}
            />

            <View style={styles.modalActions}>
              <Button
                variant="outline"
                style={styles.modalActionButton}
                isDisabled={isSavingRoute}
                onPress={closeSaveRouteModal}
              >
                <ButtonText>Annulla</ButtonText>
              </Button>
              <Button
                style={styles.modalActionButton}
                isDisabled={!routeName.trim() || isSavingRoute}
                onPress={handleSaveRoute}
              >
                <ButtonText>
                  {isSavingRoute ? 'Salvataggio...' : 'Salva'}
                </ButtonText>
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
