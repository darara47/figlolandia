import { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { type Href, router } from 'expo-router';
import { Screen } from '@/src/components/ui/Screen';
import { Text } from '@/src/components/ui/Text';
import { Card } from '@/src/components/ui/Card';
import { Row } from '@/src/components/ui/Stack';
import { DevToolsHeader } from '@/src/debug/components/DevToolsHeader';
import { FilterChip } from '@/src/debug/components/FilterChip';
import { HealthBadge } from '@/src/debug/components/HealthBadge';
import { CopyButton } from '@/src/debug/components/CopyButton';
import { PanelSkeleton, EmptyState, ErrorBanner } from '@/src/debug/components/PanelStates';
import { useGameList } from '@/src/debug/hooks/useAuditQueries';
import { formatGameStatus, formatTimestamp } from '@/src/debug/utils/format';
import { colors } from '@/src/theme/tokens';
import type { AuditGameSummaryDto, GameListFilters, GameStatus } from '@/src/types/audit';

const STATUS_OPTIONS: { label: string; value?: GameStatus }[] = [
  { label: 'Wszystkie' },
  { label: 'Utworzona', value: 'CREATED' },
  { label: 'W trakcie', value: 'IN_PROGRESS' },
  { label: 'Zakończona', value: 'FINISHED' },
];

const GameListItem = ({ item }: { item: AuditGameSummaryDto }) => {
  const validationOk = item.validation.failed === 0;
  const suspicious = item.investigation.suspicious;

  return (
    <Pressable onPress={() => router.push(`/debug/game/${item.game.gameId}` as Href)}>
      <Card style={{ marginBottom: 8 }}>
        <Row justify="space-between" align="center">
          <Row gap={6} align="center">
            <Text variant="body" style={{ color: colors.text.primary, fontWeight: '700' }}>
              {item.game.gamePin}
            </Text>
            <CopyButton value={item.game.gameId} />
          </Row>
          <Text variant="label" style={{ color: colors.text.tertiary }}>
            {formatGameStatus(item.game.status)}
          </Text>
        </Row>
        <Text variant="label" style={{ color: colors.text.secondary, marginTop: 4 }}>
          {item.rounds.length} rund · {item.game.players.length} graczy
        </Text>
        <Text variant="label" style={{ color: colors.text.tertiary, marginTop: 2, fontSize: 10 }}>
          {formatTimestamp(item.game.createdAt)}
        </Text>
        <View style={{ marginTop: 8 }}>
          <HealthBadge validationOk={validationOk} suspicious={suspicious} />
        </View>
      </Card>
    </Pressable>
  );
};

export default function DebugGameListScreen() {
  const [filters, setFilters] = useState<GameListFilters>({});

  const { data, isLoading, isError, error } = useGameList(filters);

  const toggleFilter = (key: keyof GameListFilters) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const setStatus = (status?: GameStatus) => {
    setFilters((prev) => ({ ...prev, status }));
  };

  return (
    <Screen>
      <DevToolsHeader title="Game Audit DevTools" />
      <Row gap={8} wrap style={{ marginBottom: 12 }}>
        {STATUS_OPTIONS.map((opt) => (
          <FilterChip
            key={opt.label}
            label={opt.label}
            active={filters.status === opt.value || (!filters.status && !opt.value)}
            onPress={() => setStatus(opt.value)}
          />
        ))}
      </Row>
      <Row gap={8} wrap style={{ marginBottom: 16 }}>
        <FilterChip
          label="Suspicious only"
          active={Boolean(filters.suspiciousOnly)}
          onPress={() => toggleFilter('suspiciousOnly')}
        />
        <FilterChip
          label="Validation failed"
          active={Boolean(filters.validationFailed)}
          onPress={() => toggleFilter('validationFailed')}
        />
      </Row>

      {isError ? (
        <ErrorBanner message={error instanceof Error ? error.message : 'Błąd pobierania listy gier'} />
      ) : null}

      {isLoading ? (
        <PanelSkeleton lines={6} />
      ) : data && data.length > 0 ? (
        <FlatList
          data={data}
          keyExtractor={(item) => item.game.gameId}
          renderItem={({ item }) => <GameListItem item={item} />}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
        />
      ) : (
        <EmptyState message="Brak gier w audycie" />
      )}
    </Screen>
  );
}
