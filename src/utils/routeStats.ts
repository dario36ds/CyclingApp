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
