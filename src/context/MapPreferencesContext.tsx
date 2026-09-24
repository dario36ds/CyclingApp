import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import type {PropsWithChildren} from 'react';
import {createAsyncStorage} from '@react-native-async-storage/async-storage';

const preferencesStorage = createAsyncStorage('cycling-app');
const SATELLITE_VIEW_KEY = 'satellite-view-enabled';

type MapPreferences = {
  isSatelliteViewEnabled: boolean;
  setSatelliteViewEnabled: (enabled: boolean) => void;
};

const MapPreferencesContext = createContext<MapPreferences | null>(null);

export function MapPreferencesProvider({children}: PropsWithChildren) {
  const [isSatelliteViewEnabled, setIsSatelliteViewEnabled] = useState(false);

  useEffect(() => {
    preferencesStorage
      .getItem(SATELLITE_VIEW_KEY)
      .then(storedValue => setIsSatelliteViewEnabled(storedValue === 'true'))
      .catch(error =>
        console.error(
          'Errore durante il caricamento delle preferenze mappa:',
          error,
        ),
      );
  }, []);

  const setSatelliteViewEnabled = useCallback((enabled: boolean) => {
    setIsSatelliteViewEnabled(enabled);
    preferencesStorage
      .setItem(SATELLITE_VIEW_KEY, String(enabled))
      .catch(error =>
        console.error(
          'Errore durante il salvataggio delle preferenze mappa:',
          error,
        ),
      );
  }, []);

  return (
    <MapPreferencesContext.Provider
      value={{isSatelliteViewEnabled, setSatelliteViewEnabled}}
    >
      {children}
    </MapPreferencesContext.Provider>
  );
}

export function useMapPreferences() {
  const preferences = useContext(MapPreferencesContext);

  if (!preferences) {
    throw new Error(
      'useMapPreferences deve essere usato dentro MapPreferencesProvider.',
    );
  }

  return preferences;
}
