import { useMemo, useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/src/components/ui/Text';
import { Row } from '@/src/components/ui/Stack';
import { FilterChip } from '@/src/debug/components/FilterChip';
import { TimelineSegment } from '@/src/debug/components/TimelineSegment';
import { EventRow } from '@/src/debug/components/EventRow';
import { RuleTreeNode } from '@/src/debug/components/RuleTreeNode';
import { GoldLedgerRow } from '@/src/debug/components/GoldLedgerRow';
import { CorrelationChain } from '@/src/debug/components/CorrelationChain';
import { FindingCard } from '@/src/debug/components/FindingCard';
import { CopyButton } from '@/src/debug/components/CopyButton';
import { StepReplayStub } from '@/src/debug/components/StepReplayStub';
import { PanelSkeleton, EmptyState } from '@/src/debug/components/PanelStates';
import { useEventContext } from '@/src/debug/hooks/useAuditQueries';
import { useDevToolsStore } from '@/src/debug/store/devtools.store';
import { formatTimestamp } from '@/src/debug/utils/format';
import { colors } from '@/src/theme/tokens';
import type {
  AuditEventDto,
  AuditRoundAnalysisDto,
  InvestigationSeverity,
  ReplaySegment,
} from '@/src/types/audit';

type RoundTab = 'events' | 'rules' | 'correlations' | 'investigation';
type MobilePanel = 'timeline' | 'events' | 'detail';

const SEVERITY_FILTERS: { label: string; value?: InvestigationSeverity }[] = [
  { label: 'Wszystkie' },
  { label: 'INFO', value: 'INFO' },
  { label: 'WARNING', value: 'WARNING' },
  { label: 'ERROR', value: 'ERROR' },
  { label: 'CRITICAL', value: 'CRITICAL' },
];

interface EventDetailPanelProps {
  gameId: string;
  eventId: number | null;
}

const EventDetailPanel = ({ gameId, eventId }: EventDetailPanelProps) => {
  const density = useDevToolsStore((s) => s.density);
  const { data, isLoading, isError } = useEventContext(gameId, eventId);

  if (!eventId) {
    return <EmptyState message="Wybierz event, aby zobaczyć szczegóły" />;
  }

  if (isLoading) return <PanelSkeleton lines={5} density={density} />;
  if (isError || !data) return <EmptyState message="Nie udało się załadować kontekstu eventu" />;

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Row gap={6} align="center" style={{ marginBottom: 8 }}>
        <Text variant="label" style={{ color: colors.text.primary }}>
          Event #{data.event.id}
        </Text>
        <CopyButton value={String(data.event.id)} />
      </Row>
      <Text variant="label" style={{ color: colors.text.secondary }}>
        {data.event.type} · {data.event.phase}
      </Text>
      <Text variant="body" style={{ color: colors.text.primary, marginTop: 4 }}>
        {data.event.message}
      </Text>
      <Text variant="label" style={{ color: colors.text.tertiary, marginTop: 4, fontSize: 10 }}>
        {formatTimestamp(data.event.createdAt)}
      </Text>

      {data.rules.length > 0 ? (
        <View style={{ marginTop: 16 }}>
          <Text variant="section" style={{ color: colors.text.primary, fontSize: 14, marginBottom: 8 }}>
            Rules
          </Text>
          {data.rules.map((rule, i) => (
            <RuleTreeNode
              key={rule.id}
              rule={rule}
              isLast={i === data.rules.length - 1}
              density={density}
            />
          ))}
        </View>
      ) : (
        <EmptyState message="Brak reguł dla tego eventu" />
      )}

      {data.goldLedger.length > 0 ? (
        <View style={{ marginTop: 16 }}>
          <Text variant="section" style={{ color: colors.text.primary, fontSize: 14, marginBottom: 8 }}>
            Gold Ledger
          </Text>
          {data.goldLedger.map((entry) => (
            <GoldLedgerRow key={entry.id} entry={entry} density={density} />
          ))}
        </View>
      ) : null}

      {data.correlationChain ? (
        <View style={{ marginTop: 16 }}>
          <Text variant="section" style={{ color: colors.text.primary, fontSize: 14, marginBottom: 8 }}>
            Correlation
          </Text>
          <CorrelationChain chain={data.correlationChain} density={density} />
        </View>
      ) : null}
    </ScrollView>
  );
};

interface RoundAnalysisPanelsProps {
  gameId: string;
  round: number;
  data: AuditRoundAnalysisDto;
  players: { id: string; name: string }[];
  onEventSelect?: (eventId: number | null) => void;
}

export const RoundAnalysisPanels = ({
  gameId,
  round,
  data,
  players,
  onEventSelect,
}: RoundAnalysisPanelsProps) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const density = useDevToolsStore((s) => s.density);

  const [activeTab, setActiveTab] = useState<RoundTab>('events');
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState<number | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('timeline');
  const [severityFilter, setSeverityFilter] = useState<InvestigationSeverity | undefined>();

  const playerMap = useMemo(
    () => new Map(players.map((p) => [p.id, p.name])),
    [players],
  );

  const segments: ReplaySegment[] = data.replay?.segments ?? [];

  const segmentEventIds = useMemo(() => {
    if (selectedSegmentIndex == null || !segments[selectedSegmentIndex]) return null;
    return new Set(segments[selectedSegmentIndex].events.map((e) => e.id));
  }, [selectedSegmentIndex, segments]);

  const eventsWithRules = useMemo(() => {
    const ruleEventIds = new Set(data.rules.entries.map((e) => e.event.id));
    return ruleEventIds;
  }, [data.rules.entries]);

  const filteredEvents: AuditEventDto[] = useMemo(() => {
    let events = data.detail.events;

    if (activeTab === 'rules') {
      const ruleEntries = data.rules.entries;
      events = ruleEntries.map((e) => e.event);
    }

    if (segmentEventIds && (activeTab === 'events' || activeTab === 'rules')) {
      events = events.filter((e) => segmentEventIds.has(e.id));
    }

    return events;
  }, [data, activeTab, segmentEventIds]);

  const filteredFindings = useMemo(() => {
    if (!severityFilter) return data.investigation.findings;
    return data.investigation.findings.filter((f) => f.severity === severityFilter);
  }, [data.investigation.findings, severityFilter]);

  const handleSegmentPress = (index: number) => {
    setSelectedSegmentIndex(index);
    if (!isDesktop) {
      setMobilePanel('events');
    }
  };

  const handleEventPress = (eventId: number) => {
    setSelectedEventId(eventId);
    onEventSelect?.(eventId);
    if (!isDesktop) {
      setMobilePanel('detail');
    }
  };

  const renderTimelinePanel = () => (
    <View style={{ flex: isDesktop ? 1 : undefined }}>
      <Row justify="space-between" align="center" style={{ marginBottom: 8 }}>
        <Text variant="section" style={{ color: colors.text.primary, fontSize: 14 }}>
          Timeline
        </Text>
        <View>
          <StepReplayStub />
        </View>
      </Row>
      {!data.replay ? (
        <EmptyState message="Replay niedostępny dla tej gry" />
      ) : segments.length === 0 ? (
        <EmptyState message="Brak segmentów w tej rundzie" />
      ) : (
        segments.map((segment, index) => (
          <TimelineSegment
            key={`${segment.from.snapshotId}-${segment.to.snapshotId}`}
            segment={segment}
            index={index}
            selected={selectedSegmentIndex === index}
            density={density}
            onPress={() => handleSegmentPress(index)}
          />
        ))
      )}
    </View>
  );

  const renderEventStream = () => (
    <View style={{ flex: isDesktop ? 1 : undefined }}>
      <Row gap={6} wrap style={{ marginBottom: 8 }}>
        {(['events', 'rules', 'correlations', 'investigation'] as RoundTab[]).map((tab) => (
          <FilterChip
            key={tab}
            label={
              tab === 'events'
                ? 'Events'
                : tab === 'rules'
                  ? 'Rule Inspector'
                  : tab === 'correlations'
                    ? 'Correlation'
                    : 'Investigation'
            }
            active={activeTab === tab}
            onPress={() => setActiveTab(tab)}
          />
        ))}
      </Row>

      {activeTab === 'events' || activeTab === 'rules' ? (
        filteredEvents.length === 0 ? (
          <EmptyState
            message={
              activeTab === 'rules'
                ? 'Brak eventów z regułami w tym segmencie'
                : segmentEventIds
                  ? 'Brak eventów w segmencie'
                  : 'Brak eventów w rundzie'
            }
          />
        ) : (
          filteredEvents.map((event) => {
            const ruleEntry = data.rules.entries.find((e) => e.event.id === event.id);
            const isFailed = ruleEntry && !ruleEntry.allPassed;

            return (
              <View
                key={event.id}
                style={isFailed && activeTab === 'rules' ? { borderLeftWidth: 2, borderLeftColor: colors.severity.error } : undefined}
              >
                <EventRow
                  event={event}
                  playerName={event.playerId ? playerMap.get(event.playerId) : null}
                  selected={selectedEventId === event.id}
                  highlighted={segmentEventIds?.has(event.id) ?? false}
                  hasRules={eventsWithRules.has(event.id)}
                  density={density}
                  onPress={() => handleEventPress(event.id)}
                />
                {activeTab === 'rules' && ruleEntry ? (
                  <View style={{ paddingLeft: 12, marginBottom: 8 }}>
                    {ruleEntry.rules.map((rule, i) => (
                      <RuleTreeNode
                        key={rule.id}
                        rule={rule}
                        decision={i === ruleEntry.rules.length - 1 ? ruleEntry.decision : null}
                        isLast={i === ruleEntry.rules.length - 1}
                        density={density}
                      />
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })
        )
      ) : null}

      {activeTab === 'correlations' ? (
        data.correlations.length === 0 ? (
          <EmptyState message="Brak correlations w rundzie" />
        ) : (
          data.correlations.map((chain) => (
            <CorrelationChain
              key={chain.correlationId}
              chain={chain}
              density={density}
              onEventPress={handleEventPress}
            />
          ))
        )
      ) : null}

      {activeTab === 'investigation' ? (
        <>
          <Row gap={6} wrap style={{ marginBottom: 8 }}>
            {SEVERITY_FILTERS.map((f) => (
              <FilterChip
                key={f.label}
                label={f.label}
                active={severityFilter === f.value || (!severityFilter && !f.value)}
                onPress={() => setSeverityFilter(f.value)}
              />
            ))}
          </Row>
          {filteredFindings.length === 0 ? (
            <EmptyState message="Brak findings w rundzie" />
          ) : (
            filteredFindings.map((f) => <FindingCard key={f.id} finding={f} density={density} />)
          )}
        </>
      ) : null}
    </View>
  );

  const renderDetailPanel = () => (
    <View style={{ flex: isDesktop ? 1 : undefined }}>
      <Text variant="section" style={{ color: colors.text.primary, fontSize: 14, marginBottom: 8 }}>
        Detail
      </Text>
      <EventDetailPanel gameId={gameId} eventId={selectedEventId} />
    </View>
  );

  if (!isDesktop) {
    return (
      <View style={{ flex: 1 }}>
        {mobilePanel !== 'timeline' ? (
          <Pressable
            onPress={() => {
              if (mobilePanel === 'detail') setMobilePanel('events');
              else setMobilePanel('timeline');
            }}
            style={{ marginBottom: 8 }}
          >
            <Text variant="label" style={{ color: colors.brand.DEFAULT }}>
              ← Wstecz
            </Text>
          </Pressable>
        ) : null}

        {mobilePanel === 'timeline' ? renderTimelinePanel() : null}
        {mobilePanel === 'events' ? renderEventStream() : null}
        {mobilePanel === 'detail' ? renderDetailPanel() : null}
      </View>
    );
  }

  return (
    <Row align="flex-start" gap={12} style={{ flex: 1 }}>
      <View style={{ flex: 1, maxWidth: '33%' }}>{renderTimelinePanel()}</View>
      <View style={{ flex: 1, maxWidth: '34%' }}>{renderEventStream()}</View>
      <View style={{ flex: 1, maxWidth: '33%' }}>{renderDetailPanel()}</View>
    </Row>
  );
};
