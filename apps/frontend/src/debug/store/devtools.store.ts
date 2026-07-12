import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export type DevToolsDensity = 'compact' | 'comfortable';

const STORAGE_KEY = 'figlolandia-devtools';

interface DevToolsState {
  density: DevToolsDensity;
  toastMessage: string | null;
  setDensity: (density: DevToolsDensity) => void;
  showToast: (message: string) => void;
  clearToast: () => void;
}

const persistDensity = (density: DevToolsDensity) => {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ density })).catch(() => { });
};

export const useDevToolsStore = create<DevToolsState>((set) => ({
  density: 'comfortable',
  toastMessage: null,
  setDensity: (density) => {
    persistDensity(density);
    set({ density });
  },
  showToast: (message) => {
    set({ toastMessage: message });
    setTimeout(() => set({ toastMessage: null }), 2000);
  },
  clearToast: () => set({ toastMessage: null }),
}));

AsyncStorage.getItem(STORAGE_KEY)
  .then((raw) => {
    if (!raw) return;
    const parsed = JSON.parse(raw) as { density?: DevToolsDensity };
    if (parsed.density === 'compact' || parsed.density === 'comfortable') {
      useDevToolsStore.setState({ density: parsed.density });
    }
  })
  .catch(() => { });

export const densityPadding = (density: DevToolsDensity) =>
  density === 'compact' ? 8 : 16;
