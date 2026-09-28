import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import type {PropsWithChildren} from 'react';
import {createAsyncStorage} from '@react-native-async-storage/async-storage';
import type {MeasurementSystem} from '../types/measurement';

const preferencesStorage = createAsyncStorage('cycling-app');
const SATELLITE_VIEW_KEY = 'satellite-view-enabled';
const MEASUREMENT_SYSTEM_KEY = 'measurement-system';

type MapPreferences = {
  isSatelliteViewEnabled: boolean;
  setSatelliteViewEnabled: (enabled: boolean) => void;
  measurementSystem: MeasurementSystem;
  setMeasurementSystem: (system: MeasurementSystem) => void;
};

const MapPreferencesContext = createContext<MapPreferences | null>(null);

export function MapPreferencesProvider({children}: PropsWithChildren) {
  const [isSatelliteViewEnabled, setIsSatelliteViewEnabled] = useState(false);
  const [measurementSystem, setMeasurementSystemState] =
    useState<MeasurementSystem>('metric');

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

  useEffect(() => {
    preferencesStorage
      .getItem(MEASUREMENT_SYSTEM_KEY)
      .then(storedValue => {
        if (storedValue === 'imperial' || storedValue === 'metric') {
          setMeasurementSystemState(storedValue);
        }
      })
      .catch(error =>
        console.error(
          'Errore durante il caricamento dell’unità di misura:',
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

  const setMeasurementSystem = useCallback((system: MeasurementSystem) => {
    setMeasurementSystemState(system);
    preferencesStorage.setItem(MEASUREMENT_SYSTEM_KEY, system).catch(error =>
      console.error(
        'Errore durante il salvataggio dell’unità di misura:',
        error,
      ),
    );
  }, []);

  return (
    <MapPreferencesContext.Provider
      value={{
        isSatelliteViewEnabled,
        setSatelliteViewEnabled,
        measurementSystem,
        setMeasurementSystem,
      }}
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
