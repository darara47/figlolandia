import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { type Href, router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/src/components/ui/Screen';
import { Text } from '@/src/components/ui/Text';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { Row } from '@/src/components/ui/Stack';
import { DevToolsHeader } from '@/src/debug/components/DevToolsHeader';
import { Breadcrumb } from '@/src/debug/components/FilterChip';
import { HealthBadge } from '@/src/debug/components/HealthBadge';
import { RoundTab } from '@/src/debug/components/RoundTab';
import { FindingCard } from '@/src/debug/components/FindingCard';
import { CopyButton } from '@/src/debug/components/CopyButton';
import { ValidationDetailModal } from '@/src/debug/components/ValidationDetailModal';
import { PanelSkeleton, ErrorBanner } from '@/src/debug/components/PanelStates';
import { useGameReport } from '@/src/debug/hooks/useAuditQueries';
import { formatGameStatus, formatTimestamp } from '@/src/debug/utils/format';
import { colors } from '@/src/theme/tokens';
import type { AuditValidationDto } from '@/src/types/audit';

const NotFoundState = () => (
  <Screen centered>
    <Text variant="section" style={{ color: colors.text.primary, marginBottom: 8 }}>
      Gra nie znaleziona
    </Text>
    <Text variant="body" style={{ color: colors.text.secondary, marginBottom: 16, textAlign: 'center' }}>
      Nie znaleziono gry w audycie (404)
    </Text>
    <Button onPress={() => router.replace('/debug' as Href)}>Wróć do listy gier</Button>
  </Screen>
);

export default function GameOverviewScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [validationOpen, setValidationOpen] = useState(false);

  const { data, isLoading, isError, notFound, error, refetch } = useGameReport(gameId);

  if (notFound) return <NotFoundState />;

  const allValidationChecks: AuditValidationDto[] = data
    ? Object.values(data.summary.validation.byRound).flat()
    : [];

  const topFindings = data?.summary.investigation.findings.slice(0, 3) ?? [];
  const activeRound = selectedRound ?? data?.summary.rounds[0]?.roundNumber ?? 1;

  const roundHealthMap = new Map(
    data?.rounds.map((r) => [r.detail.round?.roundNumber ?? 0, r.health]) ?? [],
  );

  return (
    <Screen>
      <Breadcrumb
        segments={[
          { label: 'Gry', href: '/debug' },
          { label: `Gra ${gameId?.slice(0, 8)}…` },
        ]}
        onNavigate={(href) => router.push(href as Href)}
      />
      <DevToolsHeader title="Game Overview" />

      {isError ? (
        <ErrorBanner
          message={error instanceof Error ? error.message : 'Błąd pobierania raportu'}
          onRetry={() => refetch()}
        />
      ) : null}

      {isLoading ? (
        <PanelSkeleton lines={8} />
      ) : data ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <Card style={{ marginBottom: 12 }}>
            <Row gap={6} align="center">
              <Text variant="display" style={{ color: colors.text.primary, fontSize: 20 }}>
                PIN {data.summary.game.gamePin}
              </Text>
              <CopyButton value={data.summary.game.gameId} />
            </Row>
            <Text variant="label" style={{ color: colors.text.secondary, marginTop: 4 }}>
              Status: {formatGameStatus(data.summary.game.status)} · Seed {data.summary.game.seed}
            </Text>
            <Text variant="label" style={{ color: colors.text.tertiary, fontSize: 10, marginTop: 2 }}>
              Utworzona: {formatTimestamp(data.summary.game.createdAt)}
            </Text>
            <View style={{ marginTop: 12 }}>
              <HealthBadge
                validationOk={data.health.validationOk}
                replayOk={data.health.replayOk}
                suspicious={data.health.suspicious}
              />
            </View>
            <Pressable onPress={() => setValidationOpen(true)} style={{ marginTop: 12 }}>
              <Text variant="label" style={{ color: colors.brand.DEFAULT }}>
                Validation Detail ({data.summary.validation.total} checków, {data.summary.validation.failed} fail) →
              </Text>
            </Pressable>
          </Card>

          <Text variant="section" style={{ color: colors.text.primary, marginBottom: 8 }}>
            Rundy
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {data.summary.rounds.map((round) => {
              const health = roundHealthMap.get(round.roundNumber);
              return (
                <RoundTab
                  key={round.roundNumber}
                  round={round.roundNumber}
                  active={activeRound === round.roundNumber}
                  hasAlert={health ? !health.replayOk : false}
                  onPress={() => setSelectedRound(round.roundNumber)}
                />
              );
            })}
          </ScrollView>

          <Row gap={8} style={{ marginBottom: 16 }}>
            <Button
              size="sm"
              onPress={() => router.push(`/debug/game/${gameId}/round/${activeRound}` as Href)}
            >
              Round Analysis
            </Button>
          </Row>

          <Text variant="section" style={{ color: colors.text.primary, marginBottom: 8 }}>
            Event counts
          </Text>
          <Card style={{ marginBottom: 16 }}>
            {Object.entries(data.eventCounts).map(([type, count]) => (
              <Row key={type} justify="space-between" style={{ marginBottom: 4 }}>
                <Text variant="label" style={{ color: colors.text.secondary }}>
                  {type}
                </Text>
                <Text variant="label" style={{ color: colors.text.primary }}>
                  {count}
                </Text>
              </Row>
            ))}
          </Card>

          <Text variant="section" style={{ color: colors.text.primary, marginBottom: 8 }}>
            Investigation (top 3)
          </Text>
          {topFindings.length > 0 ? (
            topFindings.map((f) => <FindingCard key={f.id} finding={f} />)
          ) : (
            <Text variant="body" style={{ color: colors.text.secondary, marginBottom: 16 }}>
              Brak findings dla tej gry
            </Text>
          )}

          <Text variant="section" style={{ color: colors.text.primary, marginBottom: 8 }}>
            Gracze
          </Text>
          {data.summary.game.players.map((player) => (
            <Pressable
              key={player.id}
              onPress={() => router.push(`/debug/game/${gameId}/player/${player.id}` as Href)}
            >
              <Card style={{ marginBottom: 8 }}>
                <Text variant="body" style={{ color: colors.text.primary }}>
                  {player.name}
                </Text>
                <Text variant="label" style={{ color: colors.brand.DEFAULT, marginTop: 4, fontSize: 11 }}>
                  Player Timeline →
                </Text>
              </Card>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <ValidationDetailModal
        visible={validationOpen}
        checks={allValidationChecks}
        onClose={() => setValidationOpen(false)}
      />
    </Screen>
  );
}
