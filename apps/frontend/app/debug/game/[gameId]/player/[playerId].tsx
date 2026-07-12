import { Pressable, ScrollView, View } from 'react-native';
import { type Href, router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/src/components/ui/Screen';
import { Text } from '@/src/components/ui/Text';
import { DevToolsHeader } from '@/src/debug/components/DevToolsHeader';
import { Breadcrumb } from '@/src/debug/components/FilterChip';
import { EventRow } from '@/src/debug/components/EventRow';
import { GoldLedgerRow } from '@/src/debug/components/GoldLedgerRow';
import { FindingCard } from '@/src/debug/components/FindingCard';
import { PanelSkeleton, EmptyState, ErrorBanner } from '@/src/debug/components/PanelStates';
import { useGameReport, usePlayerTimeline } from '@/src/debug/hooks/useAuditQueries';
import { useDevToolsStore } from '@/src/debug/store/devtools.store';
import { colors } from '@/src/theme/tokens';

export default function PlayerTimelineScreen() {
  const { gameId, playerId } = useLocalSearchParams<{ gameId: string; playerId: string }>();
  const density = useDevToolsStore((s) => s.density);

  const report = useGameReport(gameId);
  const { data, isLoading, isError, error, refetch } = usePlayerTimeline(gameId, playerId);

  const playerName =
    report.data?.summary.game.players.find((p) => p.id === playerId)?.name ?? playerId;

  return (
    <Screen>
      <Breadcrumb
        segments={[
          { label: 'Gry', href: '/debug' },
          { label: `Gra ${gameId?.slice(0, 8)}…`, href: `/debug/game/${gameId}` },
          { label: playerName ?? 'Gracz' },
        ]}
        onNavigate={(href) => router.push(href as Href)}
      />
      <DevToolsHeader title={`Player Timeline — ${playerName}`} />

      {isError ? (
        <ErrorBanner
          message={error instanceof Error ? error.message : 'Błąd pobierania timeline gracza'}
          onRetry={() => refetch()}
        />
      ) : null}

      {isLoading ? (
        <PanelSkeleton lines={8} density={density} />
      ) : data ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text variant="section" style={{ color: colors.text.primary, marginBottom: 8 }}>
            Eventy gracza ({data.history.events.length})
          </Text>
          {data.history.events.length === 0 ? (
            <EmptyState message="Brak eventów dla tego gracza" />
          ) : (
            data.history.events.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                playerName={playerName}
                density={density}
                onPress={() =>
                  router.push(`/debug/game/${gameId}/round/${event.round}` as Href)
                }
              />
            ))
          )}

          <Text variant="section" style={{ color: colors.text.primary, marginTop: 16, marginBottom: 8 }}>
            Gold Ledger
          </Text>
          {data.history.goldHistory.length === 0 ? (
            <EmptyState message="Brak wpisów gold ledger dla tego gracza" />
          ) : (
            <View style={{ marginBottom: 16 }}>
              {data.history.goldHistory.map((entry) => (
                <GoldLedgerRow key={entry.id} entry={entry} density={density} />
              ))}
            </View>
          )}

          <Text variant="section" style={{ color: colors.text.primary, marginBottom: 8 }}>
            Findings ({data.findings.length})
          </Text>
          {data.findings.length === 0 ? (
            <EmptyState message="Brak findings dotyczących tego gracza" />
          ) : (
            data.findings.map((f) => <FindingCard key={f.id} finding={f} density={density} />)
          )}
        </ScrollView>
      ) : null}
    </Screen>
  );
}
