import React, {useState} from 'react';
import {NativeSyntheticEvent, Text, View} from 'react-native';
import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  ViewAnnotation,
} from '@maplibre/maplibre-react-native';

import {Button, ButtonText} from '../components/ui/button';
import {calculateRoute} from '../services/openRouteService';
import {styles} from '../styles/mapStyle';

type Coordinate = [number, number];

type Waypoint = {
  id: number;
  coordinate: Coordinate;
};

type MapPressEvent = NativeSyntheticEvent<{
  lngLat: Coordinate;
}>;

export function MapScreen() {
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
              paint={{'line-color': '#16A34A', 'line-width': 5}}
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
              setSelectedWaypointId(id);
            }}
            onDragStart={() => setSelectedWaypointId(id)}
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
          className="absolute bottom-[168px] left-5 right-5 h-12 rounded-2xl bg-red-600 shadow-lg data-[active=true]:bg-red-700"
          onPress={() => removeWaypoint(selectedWaypointId)}
        >
          <ButtonText className="text-base font-bold text-white">
            Elimina waypoint selezionato
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
    </View>
  );
}
