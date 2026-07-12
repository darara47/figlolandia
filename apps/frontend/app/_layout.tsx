import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Baloo2_700Bold } from '@expo-google-fonts/baloo-2';
import {
  PlusJakartaSans_500Medium,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';
import '../global.css';
import '@/src/nativewind-setup';

import { colors } from '@/src/theme/tokens';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

SplashScreen.preventAutoHideAsync().catch(() => {
  // Na webie API splash screen może być niedostępne — ignoruj.
});

const figlolandiaTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg.base,
    card: colors.bg.elevated,
    border: colors.border.DEFAULT,
    primary: colors.brand.DEFAULT,
    text: colors.text.primary,
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Baloo2_700Bold,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_700Bold,
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) {
      console.error('Font loading error:', error);
    }
  }, [error]);

  useEffect(() => {
    if (Platform.OS === 'web' || loaded) {
      SplashScreen.hideAsync().catch(() => { });
    }
  }, [loaded]);

  // Na webie SSR renderuje UI zanim useFonts zwróci loaded=true.
  // return null psuje hydrację — zostaje martwy HTML z kursorem, bez handlerów.
  if (!loaded && Platform.OS !== 'web') {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  return (
    <ThemeProvider value={figlolandiaTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="lobby" options={{ headerShown: false }} />
        <Stack.Screen name="game/[gameId]" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
