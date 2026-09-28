import React, {createContext, useCallback, useContext, useEffect, useState} from 'react';
import type {PropsWithChildren} from 'react';
import {createAsyncStorage} from '@react-native-async-storage/async-storage';

const preferencesStorage = createAsyncStorage('cycling-app');
const DARK_MODE_KEY = 'dark-mode-enabled';

type ThemeContextValue = {
  isDarkMode: boolean;
  setIsDarkMode: (enabled: boolean) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({children}: PropsWithChildren) {
  const [isDarkMode, setIsDarkModeState] = useState(false);

  useEffect(() => {
    preferencesStorage
      .getItem(DARK_MODE_KEY)
      .then(storedValue => setIsDarkModeState(storedValue === 'true'))
      .catch(error =>
        console.error('Errore durante il caricamento del tema:', error),
      );
  }, []);

  const setIsDarkMode = useCallback((enabled: boolean) => {
    setIsDarkModeState(enabled);
    preferencesStorage.setItem(DARK_MODE_KEY, String(enabled)).catch(error =>
      console.error('Errore durante il salvataggio del tema:', error),
    );
  }, []);

  return (
    <ThemeContext.Provider value={{isDarkMode, setIsDarkMode}}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const theme = useContext(ThemeContext);

  if (!theme) {
    throw new Error('useTheme deve essere usato dentro ThemeProvider.');
  }

  return theme;
}
