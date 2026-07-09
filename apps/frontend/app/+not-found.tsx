import { Link, Stack } from 'expo-router';
import { Screen } from '@/src/components/ui/Screen';
import { Text } from '@/src/components/ui/Text';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Ups!' }} />
      <Screen className="items-center justify-center">
        <Text variant="display">Ten ekran nie istnieje.</Text>
        <Link href="/" className="mt-4 py-4">
          <Text variant="body" className="text-brand">
            Wróć na stronę główną
          </Text>
        </Link>
      </Screen>
    </>
  );
}
