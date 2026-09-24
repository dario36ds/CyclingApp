import React, {useState} from 'react';
import {
  Text,
  View,
  NativeSyntheticEvent,
} from 'react-native';

import {
  Camera,
  Map,
  ViewAnnotation,
} from '@maplibre/maplibre-react-native';

import {styles} from './src/styles/mapStyle.ts';

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
              <Text style={styles.markerText}>
                {index + 1}
              </Text>
            </View>
          </ViewAnnotation>
        ))}
      </Map>
    </View>
  );
}

export default App;