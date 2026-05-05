import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { AvatarSetupScreen } from '@/screens/AvatarSetupScreen';
import { LoginScreen } from '@/screens/LoginScreen';
import { RegisterScreen } from '@/screens/RegisterScreen';
import { UserSurveyScreen } from '@/screens/UserSurveyScreen';
import { SplashOnboardingScreen } from '@/screens/SplashOnboardingScreen';
import type { AuthStackParamList } from '@/navigation/types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#fafaf5' },
      }}>
      <Stack.Screen name="Splash" component={SplashOnboardingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="UserSurvey" component={UserSurveyScreen} />
      <Stack.Screen name="AvatarSetup" component={AvatarSetupScreen} />
    </Stack.Navigator>
  );
}
