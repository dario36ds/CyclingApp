import React, {useEffect, useRef, useState} from 'react';
import {
  Alert,
  Modal,
  NativeSyntheticEvent,
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

import {ElevationProfile} from '../components/ElevationProfile';
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
  const [routeName, setRouteName] = useState('');
  const [route, setRoute] = useState<any>(null);
  const routeStats = getRouteStats(route);
  const elevationProfile = getElevationProfile(route);
  const selectedWaypointIndex = waypoints.findIndex(
    waypoint => waypoint.id === selectedWaypointId,
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
      const targetIndex = currentIndex + offset;

      if (
        currentIndex === -1 ||
        targetIndex < 0 ||
        targetIndex >= current.length
      ) {
        return current;
      }

      const reorderedWaypoints = [...current];
      const [selectedWaypoint] = reorderedWaypoints.splice(currentIndex, 1);
      reorderedWaypoints.splice(targetIndex, 0, selectedWaypoint);

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
            center: [12.5674, 41.8719],
            zoom: 5.5,
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
            <View
              style={[
                styles.marker,
                selectedWaypointId === id && styles.selectedMarker,
              ]}
            >
              <Text style={styles.markerText}>{index + 1}</Text>
            </View>
          </ViewAnnotation>
        ))}
      </Map>

      <View style={styles.mapTypeToggle}>
        <Text style={styles.mapTypeLabel}>Satellite ibrida</Text>
        <Switch
          accessibilityLabel="Vista satellitare ibrida"
          value={isSatelliteViewEnabled}
          trackColor={{false: '#D4D4D8', true: '#059669'}}
          thumbColor="#FFFFFF"
          ios_backgroundColor="#D4D4D8"
          onValueChange={handleSatelliteViewChange}
        />
      </View>

      {routeStats && (
        <View
          accessible
          accessibilityLabel={`Distanza ${formatDistance(
            routeStats.distanceMeters,
          )}, dislivello positivo ${formatElevation(
            routeStats.ascentMeters,
          )}${
            routeStats.durationSeconds === null
              ? ''
              : `, tempo stimato ${formatDuration(
                  routeStats.durationSeconds,
                )}`
          }`}
          style={styles.routeStatsCard}
        >
          <View style={styles.routeStat}>
            <Text style={styles.routeStatLabel}>DISTANZA</Text>
            <Text style={styles.routeStatValue}>
              {formatDistance(routeStats.distanceMeters)}
            </Text>
          </View>
          <View style={styles.routeStatsDivider} />
          <View style={styles.routeStat}>
            <Text style={styles.routeStatLabel}>DISLIVELLO +</Text>
            <Text style={styles.routeStatValue}>
              {formatElevation(routeStats.ascentMeters)}
            </Text>
          </View>
          <View style={styles.routeStatsDivider} />
          <View style={styles.routeStat}>
            <Text style={styles.routeStatLabel}>TEMPO</Text>
            <Text style={styles.routeStatValue}>
              {routeStats.durationSeconds === null
                ? '—'
                : formatDuration(routeStats.durationSeconds)}
            </Text>
          </View>
        </View>
      )}

      {waypoints.length > 0 && (
        <Button
          variant="outline"
          size="lg"
          className="absolute bottom-10 left-5 right-5 h-12 rounded-2xl border-zinc-200 bg-white shadow-lg data-[active=true]:bg-zinc-100"
          onPress={clearWaypoints}
        >
          <ButtonText className="text-base font-bold text-zinc-900">
            Cancella waypoint
          </ButtonText>
        </Button>
      )}

      {selectedWaypointId !== null && (
        <View
          style={[styles.waypointActions, {bottom: route ? 232 : 168}]}
        >
          <Button
            variant="outline"
            size="lg"
            accessibilityLabel="Sposta il waypoint prima"
            className="h-12 flex-1 rounded-2xl border-zinc-200 bg-white shadow-lg data-[active=true]:bg-zinc-100 data-[disabled=true]:opacity-50"
            isDisabled={selectedWaypointIndex <= 0}
            onPress={() => reorderSelectedWaypoint(-1)}
          >
            <ButtonText className="text-base font-bold text-zinc-900">
              Prima
            </ButtonText>
          </Button>
          <Button
            variant="destructive"
            size="lg"
            accessibilityLabel="Elimina il waypoint selezionato"
            className="h-12 flex-1 rounded-2xl bg-red-600 shadow-lg data-[active=true]:bg-red-700"
            onPress={() => removeWaypoint(selectedWaypointId)}
          >
            <ButtonText className="text-base font-bold text-white">
              Elimina
            </ButtonText>
          </Button>
          <Button
            variant="outline"
            size="lg"
            accessibilityLabel="Sposta il waypoint dopo"
            className="h-12 flex-1 rounded-2xl border-zinc-200 bg-white shadow-lg data-[active=true]:bg-zinc-100 data-[disabled=true]:opacity-50"
            isDisabled={
              selectedWaypointIndex === -1 ||
              selectedWaypointIndex === waypoints.length - 1
            }
            onPress={() => reorderSelectedWaypoint(1)}
          >
            <ButtonText className="text-base font-bold text-zinc-900">
              Dopo
            </ButtonText>
          </Button>
        </View>
      )}

      {route && (
        <View style={styles.routeActions}>
          <Button
            variant="outline"
            size="lg"
            accessibilityLabel="Apri il profilo altimetrico"
            className="h-12 flex-1 rounded-2xl border-zinc-200 bg-white shadow-lg data-[active=true]:bg-zinc-100 data-[disabled=true]:opacity-50"
            isDisabled={!elevationProfile}
            onPress={openElevationProfile}
          >
            <ButtonText className="text-base font-bold text-zinc-900">
              Altimetria
            </ButtonText>
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="h-12 flex-1 rounded-2xl bg-sky-700 shadow-lg data-[active=true]:bg-sky-800"
            isDisabled={isSavingRoute}
            onPress={openSaveRouteModal}
          >
            <ButtonText className="text-base font-bold text-white">
              {isSavingRoute ? 'Salvataggio...' : 'Salva percorso'}
            </ButtonText>
          </Button>
        </View>
      )}

      {waypoints.length >= 2 && (
        <Button
          size="lg"
          className="absolute bottom-[104px] left-5 right-5 h-12 rounded-2xl bg-emerald-600 shadow-lg data-[active=true]:bg-emerald-700"
          onPress={handleCalculateRoute}
        >
          <ButtonText className="text-base font-bold text-white">
            Calcola percorso
          </ButtonText>
        </Button>
      )}

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
