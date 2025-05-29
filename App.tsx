import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {NavigationContainer} from '@react-navigation/native';
import HomeScreen from './screens/HomeScreen';
import CameraScreen from './screens/CameraScreen';
import ResultsScreen from './screens/ResultsScreen';
import {RootStackParamList} from "./types";

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
      <NavigationContainer>
          <Stack.Navigator initialRouteName="HomeScreen">
              <Stack.Screen name="HomeScreen" component={HomeScreen} options={{ title: 'Pill ID Home' }} />
              <Stack.Screen name="CameraScreen" component={CameraScreen} options={{ title: 'Capture Pill' }} />
              <Stack.Screen name="ResultsScreen" component={ResultsScreen} options={{ title: 'Pill Details' }} />
          </Stack.Navigator>
      </NavigationContainer>
  );
}