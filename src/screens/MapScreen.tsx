import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Alert,
  Modal,
  NativeSyntheticEvent,
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
import {useReducedMotion} from 'react-native-reanimated';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import {ElevationProfile} from '../components/ElevationProfile';
import {RouteTerrainDetails} from '../components/RouteTerrainDetails';
import {WaypointControls} from '../components/WaypointControls';
import {Button, ButtonText} from '../components/ui/button';
import {useHapticFeedback} from '../context/HapticFeedbackContext';
import {useMapPreferences} from '../context/MapPreferencesContext';
import {useTheme} from '../context/ThemeContext';
import {useRouteDraft} from '../hooks/useRouteDraft';
import {useWaypointSheet} from '../hooks/useWaypointSheet';
import type {RootTabParamList} from '../navigation/types';
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

type MapPressEvent = NativeSyntheticEvent<{
  lngLat: Coordinate;
}>;

type MapScreenProps = BottomTabScreenProps<RootTabParamList, 'Map'>;

const STREET_MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const ITALY_CENTER: Coordinate = [12.5674, 41.8719];
const LOCATION_TIMEOUT_MS = 12_000;

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
  const pendingCameraFit = useRef<Coordinate[] | null>(null);
  const isMapReady = useRef(false);
  const viewportHeight = useRef(0);
  const savingRoute = useRef(false);
  const reduceMotion = useReducedMotion();
  const sheet = useWaypointSheet(reduceMotion);
  const {getVisibleHeight} = sheet;
  const insets = useSafeAreaInsets();
  const {
    isSatelliteViewEnabled,
    setSatelliteViewEnabled,
    measurementSystem,
  } = useMapPreferences();
  const {triggerHaptic} = useHapticFeedback();
  const {isDarkMode} = useTheme();
  const {
    waypoints,
    selectedId,
    draggingId,
    relocatingId,
    calculatedRoute,
    isCalculating,
    handleMapTap,
    handleMarkerTap,
    beginRelocation,
    cancelRelocation,
    selectWaypoint,
    startMovingWaypoint,
    moveWaypoint,
    removeSelectedWaypoint,
    reorderSelectedWaypoint,
    clearWaypoints,
    loadSavedRoute,
    calculateCurrentRoute,
    getRouteSnapshot,
  } = useRouteDraft();
  const [isSavingRoute, setIsSavingRoute] = useState(false);
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
  const [isElevationModalVisible, setIsElevationModalVisible] = useState(false);
  const [isTerrainModalVisible, setIsTerrainModalVisible] = useState(false);
  const [is3DEnabled, setIs3DEnabled] = useState(false);
  const [isCenteringOnLocation, setIsCenteringOnLocation] = useState(false);
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const [routeName, setRouteName] = useState('');
  const routeGeometry = calculatedRoute?.geoJson;
  const isRelocating = relocatingId !== null;
  const isEditingWaypoint = draggingId !== null || isRelocating;
  const relocationIndex = isRelocating
    ? waypoints.findIndex(point => point.id === relocatingId) + 1
    : 0;
  const relocationHint = `Tocca la nuova posizione del punto ${relocationIndex}.`;
  const route = isEditingWaypoint ? null : routeGeometry;
  const routeStats = useMemo(() => getRouteStats(route), [route]);
  const ascentMeters = routeStats?.ascentMeters ?? null;
  const formattedAscent =
    ascentMeters === null
      ? null
      : formatElevation(ascentMeters, measurementSystem);
  const elevationProfile = useMemo(() => getElevationProfile(route), [route]);
  const terrainDetails = getRouteTerrainDetails(route);
  const topControlsStyle = [
    styles.topControls,
    {top: insets.top + 10},
  ];
  const quickControlsStyle = [
    styles.quickControls,
    {top: insets.top + 172},
  ];

  const getCameraPadding = useCallback(() => {
    const height = viewportHeight.current;
    return {
      top: Math.min(insets.top + 152, height * 0.36),
      right: 40,
      bottom: Math.min(getVisibleHeight() + 28, height * 0.55),
      left: 32,
    };
  }, [getVisibleHeight, insets.top]);

  const fitSavedWaypoints = useCallback(() => {
    const camera = cameraRef.current;
    const coordinates = pendingCameraFit.current;
    if (!camera || !isMapReady.current || !coordinates?.length) {
      return;
    }

    pendingCameraFit.current = null;
    const longitudes = coordinates.map(([longitude]) => longitude);
    const latitudes = coordinates.map(([, latitude]) => latitude);
    const west = Math.min(...longitudes);
    const east = Math.max(...longitudes);
    const south = Math.min(...latitudes);
    const north = Math.max(...latitudes);
    const horizontalMargin = Math.max((east - west) * 0.08, 0.005);
    const verticalMargin = Math.max((north - south) * 0.08, 0.005);
    const bounds: LngLatBounds = [
      west - horizontalMargin,
      Math.max(-85, south - verticalMargin),
      east + horizontalMargin,
      Math.min(85, north + verticalMargin),
    ];

    camera.fitBounds(bounds, {
      padding: getCameraPadding(),
      duration: reduceMotion ? 0 : 550,
    });
  }, [getCameraPadding, reduceMotion]);

  useEffect(() => {
    const savedRoute = navigationRoute.params?.savedRoute;
    if (!savedRoute) {
      return;
    }

    loadSavedRoute(savedRoute);
    pendingCameraFit.current = savedRoute.waypoints;
    fitSavedWaypoints();
    navigation.setParams({savedRoute: undefined});
  }, [fitSavedWaypoints, loadSavedRoute, navigation, navigationRoute.params?.savedRoute]);

  const handleMapPress = (event: MapPressEvent) => {
    pendingCameraFit.current = null;
    handleMapTap(event.nativeEvent.lngLat);
  };

  useEffect(() => {
    if (isRelocating) {
      AccessibilityInfo.announceForAccessibility(relocationHint);
    }
  }, [isRelocating, relocationHint]);

  const relocateSelectedWaypoint = () => {
    if (beginRelocation()) {
      sheet.collapse();
    }
  };

  const focusWaypoint = (id: number) => {
    const coordinate = selectWaypoint(id);
    if (coordinate && isMapReady.current) {
      cameraRef.current?.easeTo({
        center: coordinate,
        padding: getCameraPadding(),
        duration: reduceMotion ? 0 : 300,
      });
    }
  };

  const confirmClearWaypoints = () => {
    triggerHaptic('selection');
    Alert.alert(
      'Cancellare tutti i waypoint?',
      'Questa azione rimuoverà tutti i waypoint e il percorso calcolato.',
      [
        {text: 'Annulla', style: 'cancel', onPress: () => triggerHaptic('selection')},
        {
          text: 'Cancella',
          style: 'destructive',
          onPress: () => {
            triggerHaptic('impactMedium');
            clearWaypoints();
          },
        },
      ],
    );
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
      triggerHaptic('selection');
      setIsSaveModalVisible(false);
    }
  };

  const handleSaveRoute = async () => {
    const trimmedRouteName = routeName.trim();

    const snapshot = getRouteSnapshot();
    if (!snapshot || savingRoute.current || !trimmedRouteName) {
      return;
    }

    savingRoute.current = true;
    triggerHaptic('selection');
    setIsSavingRoute(true);

    try {
      await saveRoute({
        name: trimmedRouteName,
        waypoints: snapshot.waypoints,
        geoJson: snapshot.calculatedRoute.geoJson,
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
      savingRoute.current = false;
      setIsSavingRoute(false);
    }
  };

  const handleSatelliteViewChange = (enabled: boolean) => {
    setSatelliteViewEnabled(enabled);
    triggerHaptic(enabled ? 'toggleOn' : 'toggleOff');
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
    cameraRef.current?.setStop({
      pitch: enabled ? 55 : 0,
      duration: reduceMotion ? 0 : 400,
      easing: 'ease',
    });
  };

  return (
    <View
      style={styles.container}
      onLayout={event => {
        viewportHeight.current = event.nativeEvent.layout.height;
      }}
    >
      <Map
        style={styles.map}
        mapStyle={
          isSatelliteViewEnabled ? HYBRID_MAP_STYLE : STREET_MAP_STYLE
        }
        onPress={handleMapPress}
        onDidFinishLoadingStyle={() => {
          isMapReady.current = true;
          fitSavedWaypoints();
        }}
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

        {!!routeGeometry && (
          <GeoJSONSource
            id="routeSource"
            data={routeGeometry as React.ComponentProps<typeof GeoJSONSource>['data']}
          >
            <Layer
              id="routeOutline"
              type="line"
              paint={{
                'line-color': isSatelliteViewEnabled ? '#FFFFFF' : '#166534',
                'line-width': 8,
                'line-opacity': draggingId === null ? 0.9 : 0,
              }}
              layout={{'line-cap': 'round', 'line-join': 'round'}}
            />
            <Layer
              id="routeLine"
              type="line"
              paint={{
                'line-color': isSatelliteViewEnabled ? '#FDE047' : '#16A34A',
                'line-width': 5,
                'line-opacity': draggingId === null ? 1 : 0,
              }}
              layout={{'line-cap': 'round', 'line-join': 'round'}}
            />
          </GeoJSONSource>
        )}

        {waypoints.map(({id, coordinate}, index) => {
          const isArrival = waypoints.length > 1 && index === waypoints.length - 1;
          const label = index === 0 ? 'Partenza' : isArrival ? 'Arrivo' : null;
          const labelStyle = [styles.markerLabel, isArrival && styles.arrivalMarkerLabel];

          return (
            <ViewAnnotation
              key={id}
              id={`waypoint-${id}`}
              lngLat={coordinate}
              anchor="center"
              draggable={!isRelocating}
              onPress={event => {
                event.stopPropagation();
                if (handleMarkerTap(id)) {
                  sheet.expand();
                }
              }}
              onDragStart={() => startMovingWaypoint(id)}
              onDragEnd={event => moveWaypoint(id, event.nativeEvent.lngLat)}
            >
              <View style={styles.markerContainer}>
                {/* A matching spacer keeps the circle centered on the coordinate. */}
                {label && (
                  <Text
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                    style={[labelStyle, styles.markerLabelSpacer]}
                  >
                    {label}
                  </Text>
                )}
                <View
                  style={[
                    styles.marker,
                    isArrival && styles.arrivalMarker,
                    selectedId === id && styles.selectedMarker,
                    relocatingId === id && styles.relocatingMarker,
                  ]}
                >
                  <Text style={styles.markerText}>{index + 1}</Text>
                </View>
                {label && <Text style={labelStyle}>{label}</Text>}
              </View>
            </ViewAnnotation>
          );
        })}
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

        {isRelocating ? (
          <View
            style={[
              styles.routeStatsCard,
              styles.relocationCard,
              isDarkMode && styles.mapHeaderCardDark,
            ]}
          >
            <Text style={[styles.relocationHint, isDarkMode && styles.primaryTextDark]}>
              {relocationHint}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Annulla lo spostamento del waypoint"
              style={[styles.sheetSaveButton, styles.relocateButton]}
              onPress={cancelRelocation}
            >
              <Text style={styles.sheetSaveText}>Annulla</Text>
            </Pressable>
          </View>
        ) : (
          <View
            accessible
            accessibilityLabel={
              routeStats
                ? `Distanza ${formatDistance(
                    routeStats.distanceMeters,
                    measurementSystem,
                  )}, dislivello positivo ${formattedAscent ?? 'non disponibile'}`
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
                {formattedAscent ??
                  (measurementSystem === 'imperial' ? '— ft' : '— m')}
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
        )}
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
          {transform: [{translateY: sheet.translateY}]},
        ]}
        onLayout={sheet.onLayout}
      >
        <View {...sheet.panHandlers}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={sheet.isCollapsed ? 'Apri pannello waypoint' : 'Riduci pannello waypoint'}
            accessibilityState={{expanded: !sheet.isCollapsed}}
            onPress={sheet.toggle}
            style={styles.sheetDragArea}
          >
            <View style={[styles.sheetHandle, isDarkMode && styles.sheetHandleDark]} />
            <Text style={[styles.sheetHeading, isDarkMode && styles.primaryTextDark]}>
              {waypoints.length > 0 ? `${waypoints.length} waypoint` : 'Waypoint'}
            </Text>
            <MaterialCommunityIcons
              name={sheet.isCollapsed ? 'chevron-up' : 'chevron-down'}
              color={isDarkMode ? '#CBD5E1' : '#475569'}
              size={18}
            />
          </Pressable>
        </View>

        <View
          style={styles.sheetContent}
          pointerEvents={sheet.isCollapsed ? 'none' : 'auto'}
          accessibilityElementsHidden={sheet.isCollapsed}
          importantForAccessibility={sheet.isCollapsed ? 'no-hide-descendants' : 'auto'}
        >
          <WaypointControls
            waypoints={waypoints}
            selectedId={selectedId}
            isEditing={isEditingWaypoint}
            isDarkMode={isDarkMode}
            reduceMotion={reduceMotion}
            selectWaypoint={focusWaypoint}
            beginRelocation={relocateSelectedWaypoint}
            reorderSelectedWaypoint={reorderSelectedWaypoint}
            removeSelectedWaypoint={removeSelectedWaypoint}
          />
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
            accessibilityState={{busy: isCalculating}}
            disabled={waypoints.length < 2 || isCalculating || isEditingWaypoint}
            style={[
              styles.calculateButton,
              (waypoints.length < 2 || isCalculating || isEditingWaypoint) &&
                styles.calculateButtonDisabled,
            ]}
            onPress={calculateCurrentRoute}
          >
            <MaterialCommunityIcons name="map" color="#FFFFFF" size={17} />
            <Text style={styles.calculateButtonText}>
              {isCalculating ? 'Calcolo in corso…' : 'Calcola percorso'}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={waypoints.length === 0 || isEditingWaypoint}
            style={[
              styles.clearButton,
              (waypoints.length === 0 || isEditingWaypoint) && styles.controlDisabled,
            ]}
            onPress={confirmClearWaypoints}
          >
            <Text style={styles.clearButtonText}>
              Cancella tutti i waypoint
            </Text>
          </Pressable>
        </View>
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
