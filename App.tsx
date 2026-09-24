import React from 'react';
import {Text} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';

import {GluestackUIProvider} from '@/src/components/ui/gluestack-ui-provider';
import type {RootTabParamList} from './src/navigation/types';
import {MapScreen} from './src/screens/MapScreen';
import {SavedRoutesScreen} from './src/screens/SavedRoutesScreen';
import {SettingsScreen} from './src/screens/SettingsScreen';
import '@/global.css';

const Tab = createBottomTabNavigator<RootTabParamList>();

type TabIconProps = {
  color: string;
  size: number;
};

function MapTabIcon({color, size}: TabIconProps) {
  return <Text style={{color, fontSize: size}}>⌖</Text>;
}

function SavedRoutesTabIcon({color, size}: TabIconProps) {
  return <Text style={{color, fontSize: size}}>≡</Text>;
}

function SettingsTabIcon({color, size}: TabIconProps) {
  return <Text style={{color, fontSize: size}}>⚙</Text>;
}

function App() {
  return (
    <GluestackUIProvider mode="light">
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShadowVisible: false,
            headerStyle: {backgroundColor: '#FFFFFF'},
            headerTitleStyle: {color: '#18181B', fontWeight: '700'},
            tabBarActiveTintColor: '#047857',
            tabBarInactiveTintColor: '#71717A',
            tabBarLabelStyle: {fontSize: 12, fontWeight: '600'},
            tabBarStyle: {
              backgroundColor: '#FFFFFF',
              borderTopColor: '#E4E4E7',
            },
          }}
        >
          <Tab.Screen
            name="Map"
            component={MapScreen}
            options={{
              title: 'Percorso',
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
              tabBarIcon: SettingsTabIcon,
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </GluestackUIProvider>
  );
}

export default App;
