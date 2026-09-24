import React from 'react';
import {Text} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';

import {GluestackUIProvider} from '@/src/components/ui/gluestack-ui-provider';
import type {RootTabParamList} from './src/navigation/types';
import {MapScreen} from './src/screens/MapScreen';
import {SettingsScreen} from './src/screens/SettingsScreen';
import '@/global.css';

const Tab = createBottomTabNavigator<RootTabParamList>();

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
              tabBarIcon: ({color, size}) => (
                <Text style={{color, fontSize: size}}>⌖</Text>
              ),
            }}
          />
          <Tab.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              title: 'Impostazioni',
              tabBarIcon: ({color, size}) => (
                <Text style={{color, fontSize: size}}>⚙</Text>
              ),
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </GluestackUIProvider>
  );
}

export default App;
