/**
 * Konfiguracja aplikacji
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Adres backendu - w produkcji powinien być w zmiennych środowiskowych
// Dla urządzeń mobilnych użyj IP komputera zamiast localhost
// np. 'http://192.168.1.100:3008'
const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';

// Pobierz IP backendu z zmiennych środowiskowych lub użyj domyślnego
// Ustaw EXPO_PUBLIC_BACKEND_IP w pliku .env lub podczas uruchamiania:
// EXPO_PUBLIC_BACKEND_IP=192.168.1.100 npx expo start
const backendIp =
  Constants.expoConfig?.extra?.backendIp ||
  process.env.EXPO_PUBLIC_BACKEND_IP ||
  (Platform.OS === 'web' ? 'localhost' : null); // Na web użyj localhost, na mobile wymagaj IP

const backendPort = process.env.EXPO_PUBLIC_BACKEND_PORT || '3008';

// Funkcja do budowania URL backendu
const getBackendUrl = () => {
  if (!isDev) {
    return 'https://your-production-backend.com';
  }

  // Jeśli jest ustawione IP, użyj go
  if (backendIp) {
    return `http://${backendIp}:${backendPort}`;
  }

  // Dla web użyj localhost
  if (Platform.OS === 'web') {
    return `http://localhost:${backendPort}`;
  }

  // Dla urządzeń mobilnych wymagaj IP
  console.warn(
    '⚠️  BACKEND_IP nie jest ustawione!\n' +
    'Aby połączyć się z backendem z urządzenia mobilnego, ustaw EXPO_PUBLIC_BACKEND_IP:\n' +
    '  EXPO_PUBLIC_BACKEND_IP=192.168.1.XXX npx expo start\n' +
    'lub utwórz plik .env z:\n' +
    '  EXPO_PUBLIC_BACKEND_IP=192.168.1.XXX\n' +
    '\n' +
    'Aby znaleźć IP komputera:\n' +
    '  macOS/Linux: ifconfig | grep "inet " | grep -v 127.0.0.1\n' +
    '  Windows: ipconfig | findstr IPv4'
  );

  // Fallback - użyj localhost (może nie działać na urządzeniach mobilnych)
  return `http://localhost:${backendPort}`;
};

export const BACKEND_URL = getBackendUrl();
export const WS_URL = getBackendUrl();

