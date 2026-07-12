import { View } from 'react-native';
import { Text } from '@/src/components/ui/Text';
import { Row } from '@/src/components/ui/Stack';
import { colors } from '@/src/theme/tokens';

interface HealthIndicatorProps {
  label: string;
  ok: boolean;
  inverted?: boolean;
}

const HealthIndicator = ({ label, ok, inverted = false }: HealthIndicatorProps) => {
  const isGood = inverted ? !ok : ok;
  const color = isGood ? colors.success : colors.danger;

  return (
    <Row gap={6} align="center">
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: color,
        }}
      />
      <Text variant="label" style={{ color: colors.text.secondary, fontSize: 11 }}>
        {label}: {isGood ? 'OK' : 'FAIL'}
      </Text>
    </Row>
  );
};

interface HealthBadgeProps {
  validationOk: boolean;
  replayOk?: boolean;
  suspicious: boolean;
}

export const HealthBadge = ({ validationOk, replayOk, suspicious }: HealthBadgeProps) => (
  <Row gap={16} wrap>
    <HealthIndicator label="Validation" ok={validationOk} />
    {replayOk !== undefined ? <HealthIndicator label="Replay" ok={replayOk} /> : null}
    <HealthIndicator label="Suspicious" ok={suspicious} inverted />
  </Row>
);
