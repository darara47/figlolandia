import { Pressable, View } from 'react-native';
import { Card } from '@/src/components/ui/Card';
import { Text } from '@/src/components/ui/Text';
import { Row } from '@/src/components/ui/Stack';
import { CopyButton } from '@/src/debug/components/CopyButton';
import { colors } from '@/src/theme/tokens';
import type { InvestigationFindingDto, InvestigationSeverity } from '@/src/types/audit';
import type { DevToolsDensity } from '@/src/debug/store/devtools.store';
import { densityPadding } from '@/src/debug/store/devtools.store';

const severityColor: Record<InvestigationSeverity, string> = {
  INFO: colors.severity.info,
  WARNING: colors.severity.warning,
  ERROR: colors.severity.error,
  CRITICAL: colors.severity.critical,
};

interface FindingCardProps {
  finding: InvestigationFindingDto;
  density?: DevToolsDensity;
  onEvidencePress?: () => void;
}

export const FindingCard = ({
  finding,
  density = 'comfortable',
  onEvidencePress,
}: FindingCardProps) => {
  const padding = densityPadding(density);

  return (
    <Card
      style={{
        padding,
        marginBottom: density === 'compact' ? 6 : 10,
        borderLeftWidth: 3,
        borderLeftColor: severityColor[finding.severity],
      }}
    >
      <Row justify="space-between" align="center">
        <Text
          variant="label"
          style={{ color: severityColor[finding.severity], fontWeight: '700', fontSize: 11 }}
        >
          {finding.severity}
        </Text>
        <Text variant="label" style={{ color: colors.text.tertiary, fontSize: 10 }}>
          {Math.round(finding.confidence * 100)}%
        </Text>
      </Row>
      <Text variant="label" style={{ color: colors.text.tertiary, fontSize: 10, marginTop: 2 }}>
        {finding.issueType}
        {finding.round != null ? ` · Runda ${finding.round}` : ''}
      </Text>
      <Text
        variant="body"
        style={{
          color: colors.text.primary,
          marginTop: 4,
          fontSize: density === 'compact' ? 12 : 14,
        }}
      >
        {finding.summary}
      </Text>
      <Text
        variant="label"
        style={{
          color: colors.text.secondary,
          marginTop: 4,
          fontSize: density === 'compact' ? 11 : 12,
        }}
        numberOfLines={density === 'compact' ? 2 : undefined}
      >
        {finding.reason}
      </Text>
      {onEvidencePress ? (
        <Pressable onPress={onEvidencePress} style={{ marginTop: 6 }}>
          <Text variant="label" style={{ color: colors.brand.DEFAULT, fontSize: 11 }}>
            Zobacz evidence →
          </Text>
        </Pressable>
      ) : null}
      {finding.playerId ? (
        <Row gap={4} align="center" style={{ marginTop: 4 }}>
          <Text variant="label" style={{ color: colors.text.tertiary, fontSize: 10 }}>
            {finding.playerName ?? finding.playerId}
          </Text>
          <CopyButton value={finding.playerId} size={10} />
        </Row>
      ) : null}
    </Card>
  );
};
