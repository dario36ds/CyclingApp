import React, { useState } from 'react';
import { Text, View, NativeSyntheticEvent, Pressable } from 'react-native';

import { Camera, Map, ViewAnnotation } from '@maplibre/maplibre-react-native';

import { styles } from './src/styles/mapStyle';
import {calculateRoute} from './src/services/openRouteService';

type Coordinate = [number, number];

type MapPressEvent = NativeSyntheticEvent<{
  lngLat: [number, number];
}>;

function App() {
  const [waypoints, setWaypoints] = useState<Coordinate[]>([]);

  const handleMapPress = (event: MapPressEvent) => {
    const [lng, lat] = event.nativeEvent.lngLat;

    const newWaypoint: Coordinate = [lng, lat];

    setWaypoints(current => [...current, newWaypoint]);
  };

  const clearWaypoints = () => {
  setWaypoints([]);
  };

  const handleCalculateRoute = async () => {
  if (waypoints.length < 2) {
    return;
  }

  try {
    const route = await calculateRoute(waypoints);

    console.log('Percorso ORS:', route);
  } catch (error) {
    console.error('Errore durante il calcolo del percorso:', error);
  }
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

        {waypoints.map((coordinate, index) => (
          <ViewAnnotation
            key={`${coordinate[0]}-${coordinate[1]}-${index}`}
            lngLat={coordinate}
            anchor="center"
          >
            <View style={styles.marker}>
              <Text style={styles.markerText}>{index + 1}</Text>
            </View>
          </ViewAnnotation>
        ))}
      </Map>
      {waypoints.length > 0 && (
  <Pressable
    style={styles.clearButton}
    onPress={clearWaypoints}
  >
    <Text style={styles.clearButtonText}>
      Cancella waypoint
    </Text>
  </Pressable>
)}
{waypoints.length >= 2 && (
  <Pressable
    style={styles.routeButton}
    onPress={handleCalculateRoute}
  >
    <Text style={styles.routeButtonText}>
      Calcola percorso
    </Text>
  </Pressable>
)}
    </View>

  );
}

export default App;
