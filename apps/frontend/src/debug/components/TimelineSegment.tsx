import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react-native';
import { Card } from '@/src/components/ui/Card';
import { Text } from '@/src/components/ui/Text';
import { Row } from '@/src/components/ui/Stack';
import { DiffLine } from '@/src/debug/components/DiffLine';
import { colors } from '@/src/theme/tokens';
import type { ReplaySegment } from '@/src/types/audit';
import type { DevToolsDensity } from '@/src/debug/store/devtools.store';
import { densityPadding } from '@/src/debug/store/devtools.store';

interface TimelineSegmentProps {
  segment: ReplaySegment;
  index: number;
  selected?: boolean;
  density?: DevToolsDensity;
  onPress?: () => void;
}

export const TimelineSegment = ({
  segment,
  index,
  selected = false,
  density = 'comfortable',
  onPress,
}: TimelineSegmentProps) => {
  const [expanded, setExpanded] = useState(false);
  const padding = densityPadding(density);
  const verifyOk = segment.verification.goldLedgerMatchesDiff;
  const hasMismatch = !verifyOk;

  return (
    <View style={{ marginBottom: density === 'compact' ? 6 : 10 }}>
      <Pressable onPress={onPress}>
        <Card
          highlighted={selected}
          style={{
            padding,
            borderColor: hasMismatch ? colors.verify.mismatch : selected ? colors.brand.DEFAULT : colors.border.DEFAULT,
            borderWidth: hasMismatch ? 2 : 1,
          }}
        >
          <Row justify="space-between" align="center">
            <Text variant="label" style={{ color: colors.text.primary }}>
              Segment {index + 1}
            </Text>
            <Row gap={6} align="center">
              {hasMismatch ? <AlertTriangle size={14} color={colors.verify.mismatch} /> : null}
              <View
                style={{
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                  backgroundColor: verifyOk ? 'rgba(52,211,153,0.2)' : 'rgba(255,77,109,0.2)',
                }}
              >
                <Text
                  variant="label"
                  style={{
                    color: verifyOk ? colors.verify.ok : colors.verify.mismatch,
                    fontSize: 10,
                  }}
                >
                  {verifyOk ? 'OK' : 'MISMATCH'}
                </Text>
              </View>
            </Row>
          </Row>
          <Text variant="label" style={{ color: colors.text.secondary, marginTop: 4, fontSize: 11 }}>
            {segment.from.label} → {segment.to.label}
          </Text>
          <Text variant="label" style={{ color: colors.text.tertiary, marginTop: 2, fontSize: 10 }}>
            {segment.events.length} eventów
          </Text>
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              setExpanded((v) => !v);
            }}
            style={{ marginTop: 6 }}
          >
            <Row gap={4} align="center">
              {expanded ? (
                <ChevronDown size={12} color={colors.text.tertiary} />
              ) : (
                <ChevronRight size={12} color={colors.text.tertiary} />
              )}
              <Text variant="label" style={{ color: colors.text.tertiary, fontSize: 10 }}>
                Diff summary ({segment.diff.summary.length})
              </Text>
            </Row>
          </Pressable>
          {expanded ? (
            <View style={{ marginTop: 6, gap: 2 }}>
              {segment.diff.summary.map((line, i) => (
                <DiffLine key={i} line={line} compact={density === 'compact'} />
              ))}
            </View>
          ) : null}
        </Card>
      </Pressable>
      {hasMismatch && expanded ? (
        <View
          style={{
            marginTop: 4,
            marginLeft: 8,
            padding: 8,
            borderLeftWidth: 2,
            borderLeftColor: colors.verify.mismatch,
          }}
        >
          {segment.verification.issues.map((issue, i) => (
            <Text key={i} variant="label" style={{ color: colors.danger, fontSize: 11 }}>
              • {issue}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
};
