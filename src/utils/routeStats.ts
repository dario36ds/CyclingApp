type RouteSummary = {
  distance?: number;
  ascent?: number;
};

type RouteSegment = {
  distance?: number;
  ascent?: number;
};

type RouteFeature = {
  geometry?: {
    coordinates?: number[][];
  };
  properties?: {
    summary?: RouteSummary;
    segments?: RouteSegment[];
  };
};

type RouteGeoJson = {
  features?: RouteFeature[];
};

export type RouteStats = {
  distanceMeters: number;
  ascentMeters: number;
};

export type ElevationPoint = {
  distanceMeters: number;
  elevationMeters: number;
};

export type ElevationProfileData = {
  points: ElevationPoint[];
  distanceMeters: number;
  minElevationMeters: number;
  maxElevationMeters: number;
};

const EARTH_RADIUS_METERS = 6_371_000;

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

function sumPositiveElevationGain(coordinates: number[][]) {
  return coordinates.reduce((gain, coordinate, index) => {
    if (index === 0 || coordinate.length < 3) {
      return gain;
    }

    const previousElevation = coordinates[index - 1][2];
    const currentElevation = coordinate[2];

    if (!Number.isFinite(previousElevation) || !Number.isFinite(currentElevation)) {
      return gain;
    }

    return gain + Math.max(0, currentElevation - previousElevation);
  }, 0);
}

export function getRouteStats(route: unknown): RouteStats | null {
  if (!route || typeof route !== 'object') {
    return null;
  }

  const feature = (route as RouteGeoJson).features?.[0];

  if (!feature) {
    return null;
  }

  const summary = feature.properties?.summary;
  const segments = feature.properties?.segments ?? [];
  const distanceMeters =
    summary?.distance ??
    segments.reduce((total, segment) => total + (segment.distance ?? 0), 0);
  const ascentMeters =
    summary?.ascent ??
    (segments.some(segment => typeof segment.ascent === 'number')
      ? segments.reduce(
          (total, segment) => total + (segment.ascent ?? 0),
          0,
        )
      : sumPositiveElevationGain(feature.geometry?.coordinates ?? []));

  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) {
    return null;
  }

  return {
    distanceMeters,
    ascentMeters: Number.isFinite(ascentMeters) ? Math.max(0, ascentMeters) : 0,
  };
}

export function getElevationProfile(
  route: unknown,
): ElevationProfileData | null {
  if (!route || typeof route !== 'object') {
    return null;
  }

  const feature = (route as RouteGeoJson).features?.[0];
  const coordinates = feature?.geometry?.coordinates ?? [];

  if (coordinates.length < 2) {
    return null;
  }

  let cumulativeDistance = 0;
  const points: ElevationPoint[] = [];

  coordinates.forEach((coordinate, index) => {
    if (index > 0) {
      cumulativeDistance += getCoordinateDistance(
        coordinates[index - 1],
        coordinate,
      );
    }

    const elevation = coordinate[2];

    if (Number.isFinite(elevation)) {
      points.push({
        distanceMeters: cumulativeDistance,
        elevationMeters: elevation,
      });
    }
  });

  if (points.length < 2 || cumulativeDistance <= 0) {
    return null;
  }

  const routeDistance = feature?.properties?.summary?.distance;
  const distanceScale =
    typeof routeDistance === 'number' &&
    Number.isFinite(routeDistance) &&
    routeDistance > 0
      ? routeDistance / cumulativeDistance
      : 1;
  const scaledPoints = points.map(point => ({
    ...point,
    distanceMeters: point.distanceMeters * distanceScale,
  }));
  const elevationBounds = scaledPoints.reduce(
    (bounds, point) => ({
      min: Math.min(bounds.min, point.elevationMeters),
      max: Math.max(bounds.max, point.elevationMeters),
    }),
    {min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY},
  );

  return {
    points: scaledPoints,
    distanceMeters: scaledPoints[scaledPoints.length - 1].distanceMeters,
    minElevationMeters: elevationBounds.min,
    maxElevationMeters: elevationBounds.max,
  };
}

export function formatDistance(distanceMeters: number) {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m`;
  }

  return `${(distanceMeters / 1000).toLocaleString('it-IT', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} km`;
}

export function formatElevation(ascentMeters: number) {
  return `${Math.round(ascentMeters).toLocaleString('it-IT')} m`;
}
