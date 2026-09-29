import Config from 'react-native-config';

type Coordinate = [number, number];

const DIRECTIONS_URL =
  'https://api.openrouteservice.org/v2/directions/cycling-road/geojson';

export class RouteCalculationError extends Error {}

export async function calculateRoute(coordinates: Coordinate[]) {
  if (!Config.ORS_API_KEY) {
    throw new RouteCalculationError(
      'Il servizio per il calcolo dei percorsi non è configurato.',
    );
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
      extra_info: ['surface'],
    }),
  });

  const responseText = await response.text();

  if (!response.ok) {
    let errorCode: number | undefined;

    try {
      const responseData = JSON.parse(responseText) as {
        error?: {code?: number};
      };
      errorCode = responseData.error?.code;
    } catch {
      // Il servizio può restituire una risposta non JSON.
    }

    if (errorCode === 2010) {
      throw new RouteCalculationError(
        'Uno dei punti selezionati è troppo lontano da una strada percorribile in bici. Spostalo su una strada e riprova.',
      );
    }

    throw new RouteCalculationError(
      'Non è stato possibile calcolare il percorso. Controlla i punti selezionati e riprova.',
    );
  }

  return JSON.parse(responseText);
}
