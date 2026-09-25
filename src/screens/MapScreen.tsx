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
import {trigger} from 'react-native-haptic-feedback';

import {Button, ButtonText} from '../components/ui/button';
import {useMapPreferences} from '../context/MapPreferencesContext';
import type {RootTabParamList} from '../navigation/types';
import {calculateRoute} from '../services/openRouteService';
import {saveRoute} from '../services/savedRoutesService';
import {styles} from '../styles/mapStyle';
import type {Coordinate} from '../types/route';
import {
  formatDistance,
  formatElevation,
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
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [nextWaypointId, setNextWaypointId] = useState(0);
  const [selectedWaypointId, setSelectedWaypointId] = useState<number | null>(
    null,
  );
  const [isSavingRoute, setIsSavingRoute] = useState(false);
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
  const [routeName, setRouteName] = useState('');
  const [route, setRoute] = useState<any>(null);
  const routeStats = getRouteStats(route);

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
    } catch (error) {
      console.error('Errore durante il calcolo del percorso:', error);
    }
  };

  const removeWaypoint = (idToRemove: number) => {
    setWaypoints(current => current.filter(({id}) => id !== idToRemove));
    setSelectedWaypointId(null);
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
    trigger('selection');
    setSelectedWaypointId(id);
  };

  const startMovingWaypoint = (id: number) => {
    trigger('impactMedium');
    setSelectedWaypointId(id);
  };

  const openSaveRouteModal = () => {
    setRouteName('');
    setIsSaveModalVisible(true);
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
      Alert.alert(
        'Percorso salvato',
        `Il percorso “${trimmedRouteName}” è stato salvato sul dispositivo.`,
      );
    } catch (error: unknown) {
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
          onValueChange={setSatelliteViewEnabled}
        />
      </View>

      {routeStats && (
        <View
          accessible
          accessibilityLabel={`Distanza ${formatDistance(
            routeStats.distanceMeters,
          )}, dislivello positivo ${formatElevation(
            routeStats.ascentMeters,
          )}`}
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
        <Button
          variant="destructive"
          size="lg"
          className="absolute left-5 right-5 h-12 rounded-2xl bg-red-600 shadow-lg data-[active=true]:bg-red-700"
          style={{bottom: route ? 232 : 168}}
          onPress={() => removeWaypoint(selectedWaypointId)}
        >
          <ButtonText className="text-base font-bold text-white">
            Elimina waypoint selezionato
          </ButtonText>
        </Button>
      )}

      {route && (
        <Button
          variant="secondary"
          size="lg"
          className="absolute bottom-[168px] left-5 right-5 h-12 rounded-2xl bg-sky-700 shadow-lg data-[active=true]:bg-sky-800"
          isDisabled={isSavingRoute}
          onPress={openSaveRouteModal}
        >
          <ButtonText className="text-base font-bold text-white">
            {isSavingRoute ? 'Salvataggio...' : 'Salva percorso'}
          </ButtonText>
        </Button>
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
