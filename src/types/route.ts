export type Coordinate = [longitude: number, latitude: number];

export type SavedRoute = {
  id: string;
  name: string;
  createdAt: string;
  waypoints: Coordinate[];
  geoJson: unknown;
};
