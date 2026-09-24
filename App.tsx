import React, { useState } from 'react';
import { Text, View, NativeSyntheticEvent, Pressable } from 'react-native';

import {
  Camera,
  Map,
  ViewAnnotation,
  GeoJSONSource,
  Layer,
} from '@maplibre/maplibre-react-native';

import { styles } from './src/styles/mapStyle';
import { calculateRoute } from './src/services/openRouteService';

type Coordinate = [number, number];

type Waypoint = {
  id: number;
  coordinate: Coordinate;
};

type MapPressEvent = NativeSyntheticEvent<{
  lngLat: [number, number];
}>;

function App() {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [nextWaypointId, setNextWaypointId] = useState(0);
  const [selectedWaypointId, setSelectedWaypointId] = useState<number | null>(
    null,
  );
  const [route, setRoute] = useState<any>(null);

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
    setWaypoints(current => current.filter(({ id }) => id !== idToRemove));
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

  return (
    <View style={styles.container}>
      <Map
        style={styles.map}
        mapStyle="https://tiles.openfreemap.org/styles/liberty"
        onPress={handleMapPress}
      >
        <Camera
          initialViewState={{
            center: [12.5674, 41.8719],
            zoom: 5.5,
          }}
        />

        {route && (
          <GeoJSONSource id="routeSource" data={route}>
            <Layer
              id="routeLine"
              type="line"
              paint={{
                'line-color': '#16A34A',
                'line-width': 5,
              }}
              layout={{
                'line-cap': 'round',
                'line-join': 'round',
              }}
            />
          </GeoJSONSource>
        )}

        {waypoints.map(({ id, coordinate }, index) => (
          <ViewAnnotation
            key={id}
            id={`waypoint-${id}`}
            lngLat={coordinate}
            anchor="center"
            draggable
            onPress={event => {
              event.stopPropagation();
              setSelectedWaypointId(id);
            }}
            onDragStart={() => setSelectedWaypointId(id)}
            onDragEnd={event =>
              moveWaypoint(id, event.nativeEvent.lngLat)
            }
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

      {waypoints.length > 0 && (
        <Pressable style={styles.clearButton} onPress={clearWaypoints}>
          <Text style={styles.clearButtonText}>Cancella waypoint</Text>
        </Pressable>
      )}

      {selectedWaypointId !== null && (
        <Pressable
          style={styles.deleteWaypointButton}
          onPress={() => removeWaypoint(selectedWaypointId)}
        >
          <Text style={styles.deleteWaypointButtonText}>
            Elimina waypoint selezionato
          </Text>
        </Pressable>
      )}

      {waypoints.length >= 2 && (
        <Pressable style={styles.routeButton} onPress={handleCalculateRoute}>
          <Text style={styles.routeButtonText}>Calcola percorso</Text>
        </Pressable>
      )}
    </View>
  );
}

export default App;
