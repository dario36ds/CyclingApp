import React from 'react';
import type {PropsWithChildren} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';

import {GluestackUIProvider} from '@/src/components/ui/gluestack-ui-provider';
import {TabBarIcon} from './src/components/TabBarIcon';
import {HapticFeedbackProvider} from './src/context/HapticFeedbackContext';
import {MapPreferencesProvider} from './src/context/MapPreferencesContext';
import type {RootTabParamList} from './src/navigation/types';
import {MapScreen} from './src/screens/MapScreen';
import {SavedRoutesScreen} from './src/screens/SavedRoutesScreen';
import {SettingsScreen} from './src/screens/SettingsScreen';
import '@/global.css';

const Tab = createBottomTabNavigator<RootTabParamList>();

type NavigationIconProps = {
  color: string;
  focused: boolean;
  size: number;
};

function MapTabIcon(props: NavigationIconProps) {
  return <TabBarIcon {...props} name="map" />;
}

function SavedRoutesTabIcon(props: NavigationIconProps) {
  return <TabBarIcon {...props} name="saved" />;
}

function SettingsTabIcon(props: NavigationIconProps) {
  return <TabBarIcon {...props} name="settings" />;
}

function AppProviders({children}: PropsWithChildren) {
  return (
    <MapPreferencesProvider>
      <HapticFeedbackProvider>{children}</HapticFeedbackProvider>
    </MapPreferencesProvider>
  );
}

function App() {
  return (
    <GluestackUIProvider mode="light">
      <AppProviders>
        <NavigationContainer>
          <Tab.Navigator
            screenOptions={{
              headerShadowVisible: false,
              headerStyle: {backgroundColor: '#FFFFFF'},
              headerTitleStyle: {color: '#0F172A', fontWeight: '700'},
              tabBarActiveTintColor: '#059669',
              tabBarInactiveTintColor: '#94A3B8',
              tabBarHideOnKeyboard: true,
              tabBarItemStyle: {paddingTop: 5},
              tabBarLabelStyle: {
                marginTop: 2,
                fontSize: 11,
                fontWeight: '600',
              },
              tabBarStyle: {
                backgroundColor: '#FFFFFF',
                borderTopColor: '#E2E8F0',
                borderTopWidth: 1,
                height: 68,
                paddingBottom: 8,
                shadowColor: '#0F172A',
                shadowOffset: {width: 0, height: -4},
                shadowOpacity: 0.05,
                shadowRadius: 12,
                elevation: 10,
              },
            }}
          >
            <Tab.Screen
              name="Map"
              component={MapScreen}
              options={{
                title: 'Percorso',
                headerShown: false,
                tabBarLabel: 'Mappa',
                tabBarIcon: MapTabIcon,
              }}
            />
            <Tab.Screen
              name="SavedRoutes"
              component={SavedRoutesScreen}
              options={{
                title: 'Percorsi salvati',
                tabBarLabel: 'Salvati',
                tabBarIcon: SavedRoutesTabIcon,
              }}
            />
            <Tab.Screen
              name="Settings"
              component={SettingsScreen}
              options={{
                title: 'Impostazioni',
                headerShown: false,
                tabBarIcon: SettingsTabIcon,
              }}
            />
          </Tab.Navigator>
        </NavigationContainer>
      </AppProviders>
    </GluestackUIProvider>
  );
}

export default App;
