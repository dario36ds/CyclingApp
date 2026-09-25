import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import type {PropsWithChildren} from 'react';
import {createAsyncStorage} from '@react-native-async-storage/async-storage';
import RNHapticFeedback from 'react-native-haptic-feedback';
import type {HapticFeedbackTypes} from 'react-native-haptic-feedback';

const preferencesStorage = createAsyncStorage('cycling-app');
const HAPTIC_FEEDBACK_KEY = 'haptic-feedback-enabled';

type HapticFeedbackContextValue = {
  isHapticFeedbackEnabled: boolean;
  setHapticFeedbackEnabled: (enabled: boolean) => void;
  triggerHaptic: (type: keyof typeof HapticFeedbackTypes) => void;
};

const HapticFeedbackContext =
  createContext<HapticFeedbackContextValue | null>(null);

export function HapticFeedbackProvider({children}: PropsWithChildren) {
  const [isHapticFeedbackEnabled, setIsHapticFeedbackEnabled] = useState(true);

  useEffect(() => {
    preferencesStorage
      .getItem(HAPTIC_FEEDBACK_KEY)
      .then(storedValue => {
        const enabled = storedValue !== 'false';

        setIsHapticFeedbackEnabled(enabled);
        RNHapticFeedback.setEnabled(enabled);
      })
      .catch(error =>
        console.error(
          'Errore durante il caricamento della preferenza aptica:',
          error,
        ),
      );
  }, []);

  const setHapticFeedbackEnabled = useCallback((enabled: boolean) => {
    if (enabled) {
      RNHapticFeedback.setEnabled(true);
      RNHapticFeedback.trigger('toggleOn');
    } else {
      RNHapticFeedback.trigger('toggleOff');
      RNHapticFeedback.setEnabled(false);
    }

    setIsHapticFeedbackEnabled(enabled);
    preferencesStorage.setItem(HAPTIC_FEEDBACK_KEY, String(enabled)).catch(
      error =>
        console.error(
          'Errore durante il salvataggio della preferenza aptica:',
          error,
        ),
    );
  }, []);

  const triggerHaptic = useCallback(
    (type: keyof typeof HapticFeedbackTypes) => {
      if (isHapticFeedbackEnabled) {
        RNHapticFeedback.trigger(type);
      }
    },
    [isHapticFeedbackEnabled],
  );

  return (
    <HapticFeedbackContext.Provider
      value={{
        isHapticFeedbackEnabled,
        setHapticFeedbackEnabled,
        triggerHaptic,
      }}
    >
      {children}
    </HapticFeedbackContext.Provider>
  );
}

export function useHapticFeedback() {
  const context = useContext(HapticFeedbackContext);

  if (!context) {
    throw new Error(
      'useHapticFeedback deve essere usato dentro HapticFeedbackProvider.',
    );
  }

  return context;
}
