import {createAsyncStorage} from '@react-native-async-storage/async-storage';

import type {Coordinate, SavedRoute} from '../types/route';

const routeStorage = createAsyncStorage('cycling-app');
const SAVED_ROUTES_KEY = 'saved-routes';

type SaveRouteInput = {
  name: string;
  waypoints: Coordinate[];
  geoJson: unknown;
};

export async function saveRoute({
  name,
  waypoints,
  geoJson,
}: SaveRouteInput): Promise<SavedRoute> {
  const storedValue = await routeStorage.getItem(SAVED_ROUTES_KEY);
  const parsedValue: unknown = storedValue ? JSON.parse(storedValue) : [];
  const savedRoutes = Array.isArray(parsedValue)
    ? (parsedValue as SavedRoute[])
    : [];

  const savedRoute: SavedRoute = {
    id: `route-${Date.now()}`,
    name,
    createdAt: new Date().toISOString(),
    waypoints,
    geoJson,
  };

  await routeStorage.setItem(
    SAVED_ROUTES_KEY,
    JSON.stringify([...savedRoutes, savedRoute]),
  );

  return savedRoute;
}
