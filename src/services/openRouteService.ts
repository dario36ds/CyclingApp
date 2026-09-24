import Config from 'react-native-config';

type Coordinate = [number, number];

export async function calculateRoute(coordinates: Coordinate[]) {
  if (!Config.ORS_API_KEY) {
    throw new Error('ORS_API_KEY non configurata');
  }

  const response = await fetch(
    'https://api.heigit.org/openrouteservice/v2/directions/cycling-road/geojson',
    {
      method: 'POST',
      headers: {
        Authorization: Config.ORS_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/geo+json',
      },
      body: JSON.stringify({
        coordinates,
      }),
    },
  );

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `Errore OpenRouteService ${response.status}: ${responseText}`,
    );
  }

  return JSON.parse(responseText);
}