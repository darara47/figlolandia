/**
 * Konfiguracja aplikacji
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

const isDev =
  typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';

const backendIp =
  Constants.expoConfig?.extra?.backendIp ||
  process.env.EXPO_PUBLIC_BACKEND_IP ||
  (Platform.OS === 'web' ? 'localhost' : null);

const backendPort = process.env.EXPO_PUBLIC_BACKEND_PORT || '3008';

export const getBackendUrl = (): string => {
  if (process.env.EXPO_PUBLIC_BACKEND_URL) {
    return process.env.EXPO_PUBLIC_BACKEND_URL;
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  if (isDev && backendIp) {
    return `http://${backendIp}:${backendPort}`;
  }

  if (isDev && Platform.OS === 'web') {
    return `http://localhost:${backendPort}`;
  }

  if (backendIp) {
    return `http://${backendIp}:${backendPort}`;
  }

  if (isDev) {
    console.warn(
      '⚠️  BACKEND_IP nie jest ustawione!\n' +
      'Aby połączyć się z backendem z urządzenia mobilnego, ustaw EXPO_PUBLIC_BACKEND_IP:\n' +
      '  EXPO_PUBLIC_BACKEND_IP=192.168.1.XXX npx expo start\n' +
      'lub utwórz plik .env z:\n' +
      '  EXPO_PUBLIC_BACKEND_IP=192.168.1.XXX\n' +
      '\n' +
      'Aby znaleźć IP komputera:\n' +
      '  macOS/Linux: ifconfig | grep "inet " | grep -v 127.0.0.1\n' +
      '  Windows: ipconfig | findstr IPv4',
    );
  }

  return `http://localhost:${backendPort}`;
};

export const getWsUrl = (): string => getBackendUrl();
