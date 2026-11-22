import {smoothElevation} from './elevationSmoothing';
import type {ElevationPoint} from './elevationSmoothing';

export {smoothElevation};
export type {ElevationPoint};

const EARTH_RADIUS_METERS = 6_371_000;
const MIN_OUTLIER_HEIGHT_METERS = 5;
const MIN_ELEVATION_REVERSAL_METERS = 10;
const MAX_ROAD_GRADE = 1;

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}

function getCoordinateDistance(
  firstCoordinate: number[],
  secondCoordinate: number[],
) {
  const [firstLongitude, firstLatitude] = firstCoordinate;
  const [secondLongitude, secondLatitude] = secondCoordinate;

  if (
    !Number.isFinite(firstLongitude) ||
    !Number.isFinite(firstLatitude) ||
    !Number.isFinite(secondLongitude) ||
    !Number.isFinite(secondLatitude)
  ) {
    return 0;
  }

  const latitudeDelta = degreesToRadians(secondLatitude - firstLatitude);
  const longitudeDelta = degreesToRadians(secondLongitude - firstLongitude);
  const firstLatitudeRadians = degreesToRadians(firstLatitude);
  const secondLatitudeRadians = degreesToRadians(secondLatitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitudeRadians) *
      Math.cos(secondLatitudeRadians) *
      Math.sin(longitudeDelta / 2) ** 2;
  const clampedHaversine = Math.min(1, Math.max(0, haversine));

  return (
    2 *
    EARTH_RADIUS_METERS *
    Math.atan2(
      Math.sqrt(clampedHaversine),
      Math.sqrt(1 - clampedHaversine),
    )
  );
}

function getElevationAt(coordinates: number[][], index: number): number {
  const previous = coordinates[index - 1];
  const current = coordinates[index];
  const next = coordinates[index + 1];
  const elevation = current[2];

  if (
    !previous ||
    !next ||
    !Number.isFinite(previous[2]) ||
    !Number.isFinite(elevation) ||
    !Number.isFinite(next[2])
  ) {
    return elevation;
  }

  const previousDelta = elevation - previous[2];
  const nextDelta = elevation - next[2];
  const isIsolatedExtremum =
    (previousDelta >= MIN_OUTLIER_HEIGHT_METERS &&
      nextDelta >= MIN_OUTLIER_HEIGHT_METERS) ||
    (previousDelta <= -MIN_OUTLIER_HEIGHT_METERS &&
      nextDelta <= -MIN_OUTLIER_HEIGHT_METERS);

  if (!isIsolatedExtremum) {
    return elevation;
  }

  const previousDistance = getCoordinateDistance(previous, current);
  const nextDistance = getCoordinateDistance(current, next);
  if (
    Math.abs(previousDelta) <= previousDistance * MAX_ROAD_GRADE ||
    Math.abs(nextDelta) <= nextDistance * MAX_ROAD_GRADE
  ) {
    return elevation;
  }

  // Both slopes exceed 100% and reverse at a single sample.
  const distance = previousDistance + nextDistance;
  const fraction = distance > 0 ? previousDistance / distance : 0.5;
  return previous[2] + fraction * (next[2] - previous[2]);
}

export function getElevationSamples(coordinates: number[][]) {
  let cumulativeDistance = 0;
  const points: ElevationPoint[] = [];

  coordinates.forEach((coordinate, index) => {
    if (index > 0) {
      cumulativeDistance += getCoordinateDistance(
        coordinates[index - 1],
        coordinate,
      );
    }

    const elevation = getElevationAt(coordinates, index);
    if (Number.isFinite(elevation)) {
      points.push({
        distanceMeters: cumulativeDistance,
        elevationMeters: elevation,
      });
    }
  });

  return {points, cumulativeDistance};
}

export function getProfileAscent(coordinates: number[][]): number | null {
  if (
    coordinates.length < 2 ||
    coordinates.some(coordinate => !Number.isFinite(coordinate?.[2]))
  ) {
    return null;
  }

  const {points, cumulativeDistance} = getElevationSamples(coordinates);
  if (cumulativeDistance <= 0) {
    return null;
  }

  const profile = smoothElevation(points);
  const startElevation = profile[0].elevationMeters;
  const endElevation = profile[profile.length - 1].elevationMeters;
  let ascent = 0;
  let valley = startElevation;
  let peak = valley;
  let climbing = false;

  // Confirm a change of direction before counting the full climb.
  for (const {elevationMeters} of profile) {
    if (climbing) {
      peak = Math.max(peak, elevationMeters);
      if (peak - elevationMeters >= MIN_ELEVATION_REVERSAL_METERS) {
        ascent += peak - valley;
        valley = elevationMeters;
        climbing = false;
      }
    } else {
      valley = Math.min(valley, elevationMeters);
      if (elevationMeters - valley >= MIN_ELEVATION_REVERSAL_METERS) {
        peak = elevationMeters;
        climbing = true;
      }
    }
  }

  if (climbing) {
    ascent += peak - valley;
  }

  return Math.max(ascent, endElevation - startElevation);
}
