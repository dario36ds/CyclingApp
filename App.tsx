import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Camera, Map} from '@maplibre/maplibre-react-native';

function App() {
  return (
    <View style={styles.container}>
      <Map
        style={styles.map}
        mapStyle="https://tiles.openfreemap.org/styles/liberty"
        attribution
        logo
      >
        <Camera
          initialViewState={{
            center: [12.5674, 41.8719],
            zoom: 5.5,
          }}
        />
      </Map>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EAF0EC',
  },
  map: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
});

export default App;