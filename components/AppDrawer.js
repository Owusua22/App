import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';
import AboutScreen from '../screens/AboutScreen';
import ShopsScreen from '../screens/ShopsScreen';
import ContactUsScreen from '../screens/ContactUsScreen'; // Ensure correct import
import HomeScreen from '../screens/HomeScreen'; // Ensure HomeScreen is imported

const Drawer = createDrawerNavigator();
const Stack = createStackNavigator();

function AppStack() {
  return (
    <Stack.Navigator initialRouteName="Home">
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Shops" component={ShopsScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
      <Stack.Screen name="Contact Us" component={ContactUsScreen} />
    </Stack.Navigator>
  );
}

export default function AppDrawer() {
  return (
    <Drawer.Navigator
      screenOptions={{
        drawerType: 'slide',
        headerShown: false,
      }}
    >
      {/* HomeScreen is part of the Drawer Navigator */}
      <Drawer.Screen name="Home" component={AppStack} />
    </Drawer.Navigator>
  );
}
