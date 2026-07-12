import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { type Href, router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/src/components/ui/Screen';
import { Text } from '@/src/components/ui/Text';
import { DevToolsHeader } from '@/src/debug/components/DevToolsHeader';
import { Breadcrumb } from '@/src/debug/components/FilterChip';
import { HealthBadge } from '@/src/debug/components/HealthBadge';
import { RoundAnalysisPanels } from '@/src/debug/components/RoundAnalysisPanels';
import { ValidationDetailModal } from '@/src/debug/components/ValidationDetailModal';
import { PanelSkeleton, ErrorBanner } from '@/src/debug/components/PanelStates';
import { useGameReport, useRoundAnalysis } from '@/src/debug/hooks/useAuditQueries';
import { colors } from '@/src/theme/tokens';

export default function RoundAnalysisScreen() {
  const { gameId, round: roundParam } = useLocalSearchParams<{
    gameId: string;
    round: string;
  }>();
  const round = Number(roundParam);
  const [validationOpen, setValidationOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  const report = useGameReport(gameId);
  const roundQuery = useRoundAnalysis(gameId, round);

  const players = report.data?.summary.game.players ?? [];

  const breadcrumbSegments = [
    { label: 'Gry', href: '/debug' },
    { label: `Gra ${gameId?.slice(0, 8)}…`, href: `/debug/game/${gameId}` },
    { label: `Runda ${round}`, href: `/debug/game/${gameId}/round/${round}` },
    ...(selectedEventId ? [{ label: `Event #${selectedEventId}` }] : []),
  ];

  return (
    <Screen style={{ paddingBottom: 0 }}>
      <Breadcrumb
        segments={breadcrumbSegments}
        onNavigate={(href) => router.push(href as Href)}
      />
      <DevToolsHeader title={`Round Analysis — R${round}`}>
        {roundQuery.data ? (
          <View style={{ marginTop: 8 }}>
            <HealthBadge
              validationOk={roundQuery.data.health.validationOk}
              replayOk={roundQuery.data.health.replayOk}
              suspicious={roundQuery.data.health.suspicious}
            />
            <Pressable onPress={() => setValidationOpen(true)} style={{ marginTop: 8 }}>
              <Text variant="label" style={{ color: colors.brand.DEFAULT, fontSize: 11 }}>
                Validation Detail →
              </Text>
            </Pressable>
          </View>
        ) : null}
      </DevToolsHeader>

      {roundQuery.isError ? (
        <ErrorBanner
          message={
            roundQuery.error instanceof Error
              ? roundQuery.error.message
              : 'Błąd pobierania analizy rundy'
          }
          onRetry={() => roundQuery.refetch()}
        />
      ) : null}

      {roundQuery.isLoading ? (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}><PanelSkeleton lines={6} /></View>
          <View style={{ flex: 1 }}><PanelSkeleton lines={6} /></View>
          <View style={{ flex: 1 }}><PanelSkeleton lines={6} /></View>
        </View>
      ) : roundQuery.data ? (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <RoundAnalysisPanels
            gameId={gameId}
            round={round}
            data={roundQuery.data}
            players={players}
            onEventSelect={setSelectedEventId}
          />
        </ScrollView>
      ) : null}

      <ValidationDetailModal
        visible={validationOpen}
        checks={roundQuery.data?.detail.validationResults ?? []}
        onClose={() => setValidationOpen(false)}
      />
    </Screen>
  );
}
