import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';

export default function DebugLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="game/[gameId]/index" />
        <Stack.Screen name="game/[gameId]/round/[round]/index" />
        <Stack.Screen name="game/[gameId]/player/[playerId]" />
      </Stack>
    </QueryClientProvider>
  );
}
