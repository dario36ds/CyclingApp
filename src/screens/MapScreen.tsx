import React, {useEffect, useRef, useState} from 'react';
import {
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
  Map,
  ViewAnnotation,
} from '@maplibre/maplibre-react-native';
import type {
  CameraRef,
  LngLatBounds,
  StyleSpecification,
} from '@maplibre/maplibre-react-native';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Fontisto from 'react-native-vector-icons/Fontisto';

import {ElevationProfile} from '../components/ElevationProfile';
import {RouteTerrainDetails} from '../components/RouteTerrainDetails';
import {Button, ButtonText} from '../components/ui/button';
import {useHapticFeedback} from '../context/HapticFeedbackContext';
import {useMapPreferences} from '../context/MapPreferencesContext';
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
const TUSCANY_CENTER: Coordinate = [11.25, 43.77];

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

export function MapScreen({navigation, route: navigationRoute}: MapScreenProps) {
  const cameraRef = useRef<CameraRef>(null);
  const insets = useSafeAreaInsets();
  const {isSatelliteViewEnabled, setSatelliteViewEnabled} =
    useMapPreferences();
  const {triggerHaptic} = useHapticFeedback();
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
    triggerHaptic('impactMedium');
    setWaypoints([]);
    setSelectedWaypointId(null);
    setRoute(null);
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
      return TUSCANY_CENTER;
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

  const centerMap = () => {
    triggerHaptic('selection');

    if (waypoints.length < 2) {
      cameraRef.current?.flyTo({
        center: getMapFocusCoordinate(),
        zoom: waypoints.length === 1 ? 12 : 8.4,
        duration: 600,
      });
      return;
    }

    const longitudes = waypoints.map(({coordinate}) => coordinate[0]);
    const latitudes = waypoints.map(({coordinate}) => coordinate[1]);

    cameraRef.current?.fitBounds(
      [
        Math.min(...longitudes),
        Math.min(...latitudes),
        Math.max(...longitudes),
        Math.max(...latitudes),
      ],
      {
        padding: {top: 180, right: 54, bottom: 280, left: 54},
        duration: 650,
      },
    );
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
            center: TUSCANY_CENTER,
            zoom: 8.4,
          }}
        />

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
        <View style={styles.mapHeaderCard}>
          <View style={styles.mapHeaderIdentity}>
            <View style={styles.onlineIndicator} />
            <View>
              <Text style={styles.mapHeaderTitle}>Pianifica Percorso</Text>
              <Text style={styles.mapHeaderSubtitle}>Toscana Centrale</Text>
            </View>
          </View>

          <View style={styles.mapTypeToggle}>
            <Text style={styles.mapTypeLabel}>Satellite</Text>
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
                )}, dislivello positivo ${formatElevation(
                  routeStats.ascentMeters,
                )}`
              : 'Statistiche del percorso non ancora disponibili'
          }
          style={styles.routeStatsCard}
        >
          <View style={styles.routeStat}>
            <View style={styles.routeStatHeading}>
              <Fontisto name="map" color="#94A3B8" size={12} />
              <Text style={styles.routeStatLabel}>DISTANZA</Text>
            </View>
            <Text style={styles.routeStatValue}>
              {routeStats
                ? formatDistance(routeStats.distanceMeters)
                : '— km'}
            </Text>
          </View>
          <View style={styles.routeStatsDivider} />
          <View style={styles.routeStat}>
            <View style={styles.routeStatHeading}>
              <Fontisto name="line-chart" color="#059669" size={12} />
              <Text style={styles.routeStatLabel}>DISLIVELLO</Text>
            </View>
            <Text style={styles.routeStatValue}>
              {routeStats
                ? formatElevation(routeStats.ascentMeters)
                : '— m'}
            </Text>
          </View>
          <View style={styles.routeStatsDivider} />
          <View style={styles.routeStat}>
            <View style={styles.routeStatHeading}>
              <Fontisto name="clock" color="#94A3B8" size={12} />
              <Text style={styles.routeStatLabel}>TEMPO</Text>
            </View>
            <Text style={styles.routeStatValue}>
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
          style={({pressed}) => [
            styles.quickControlButton,
            pressed && styles.controlPressed,
          ]}
          onPress={centerMap}
        >
          <Fontisto name="crosshairs" color="#475569" size={18} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Visuale tridimensionale"
          style={({pressed}) => [
            styles.quickControlButton,
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

      <View style={styles.actionSheet}>
          <View style={styles.sheetHandle} />

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
                <Fontisto name="angle-left" color="#334155" size={14} />
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
                <Fontisto name="trash" color="#E11D48" size={14} />
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
                <Fontisto name="angle-right" color="#334155" size={14} />
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
                <Fontisto name="line-chart" color="#64748B" size={14} />
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
                <Fontisto name="curve" color="#64748B" size={14} />
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
                <Fontisto name="save" color="#0284C7" size={14} />
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
              <Fontisto name="map" color="#FFFFFF" size={17} />
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
      </View>

      <Modal
        animationType="slide"
        transparent
        visible={isTerrainModalVisible}
        onRequestClose={closeTerrainDetails}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, styles.terrainModalCard]}>
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
          <View style={[styles.modalCard, styles.elevationModalCard]}>
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
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nome del percorso</Text>
            <TextInput
              style={styles.routeNameInput}
              value={routeName}
              onChangeText={setRouteName}
              placeholder="Es. Giro del lago"
              placeholderTextColor="#71717A"
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
