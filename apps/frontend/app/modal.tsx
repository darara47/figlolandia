import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { Screen } from '@/src/components/ui/Screen';
import { Text } from '@/src/components/ui/Text';

export default function ModalScreen() {
  return (
    <Screen className="items-center justify-center">
      <Text variant="display">Modal</Text>
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </Screen>
  );
}
