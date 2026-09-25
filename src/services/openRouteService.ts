import Config from 'react-native-config';

type Coordinate = [number, number];

const DIRECTIONS_URL =
  'https://api.openrouteservice.org/v2/directions/cycling-road/geojson';

export async function calculateRoute(coordinates: Coordinate[]) {
  if (!Config.ORS_API_KEY) {
    throw new Error('ORS_API_KEY non configurata');
  }

  const response = await fetch(DIRECTIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: Config.ORS_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/geo+json',
    },
    body: JSON.stringify({
      coordinates,
      elevation: true,
    }),
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `Errore OpenRouteService ${response.status}: ${responseText}`,
    );
  }

  return JSON.parse(responseText);
}
