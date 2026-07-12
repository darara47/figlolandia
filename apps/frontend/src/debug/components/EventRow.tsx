import { Pressable, View } from 'react-native';
import { Link2, Shield } from 'lucide-react-native';
import { Card } from '@/src/components/ui/Card';
import { Text } from '@/src/components/ui/Text';
import { Row } from '@/src/components/ui/Stack';
import { formatTimestamp } from '@/src/debug/utils/format';
import { colors } from '@/src/theme/tokens';
import type { AuditEventDto } from '@/src/types/audit';
import type { DevToolsDensity } from '@/src/debug/store/devtools.store';
import { densityPadding } from '@/src/debug/store/devtools.store';

interface EventRowProps {
  event: AuditEventDto;
  playerName?: string | null;
  selected?: boolean;
  highlighted?: boolean;
  hasRules?: boolean;
  density?: DevToolsDensity;
  onPress?: () => void;
}

export const EventRow = ({
  event,
  playerName,
  selected = false,
  highlighted = false,
  hasRules = false,
  density = 'comfortable',
  onPress,
}: EventRowProps) => {
  const padding = densityPadding(density);

  return (
    <Pressable onPress={onPress}>
      <Card
        highlighted={selected || highlighted}
        style={{
          padding,
          marginBottom: density === 'compact' ? 4 : 8,
          borderColor: highlighted ? colors.brand.DEFAULT : selected ? colors.brand.DEFAULT : colors.border.DEFAULT,
          backgroundColor: highlighted ? colors.bg.hover : colors.bg.elevated,
        }}
      >
        <Row justify="space-between" align="center">
          <Text variant="label" style={{ color: colors.brand.DEFAULT, fontSize: density === 'compact' ? 11 : 12 }}>
            {event.type}
          </Text>
          <Row gap={6}>
            {event.correlationId ? <Link2 size={12} color={colors.category.education} /> : null}
            {hasRules ? <Shield size={12} color={colors.warning} /> : null}
          </Row>
        </Row>
        <Text
          variant="body"
          style={{
            color: colors.text.primary,
            fontSize: density === 'compact' ? 12 : 14,
            marginTop: 4,
          }}
          numberOfLines={density === 'compact' ? 1 : 2}
        >
          {event.message}
        </Text>
        <Row gap={8} style={{ marginTop: 4 }} wrap>
          <Text variant="label" style={{ color: colors.text.tertiary, fontSize: 10 }}>
            {event.phase}
          </Text>
          {playerName ? (
            <Text variant="label" style={{ color: colors.text.secondary, fontSize: 10 }}>
              {playerName}
            </Text>
          ) : null}
          <Text variant="label" style={{ color: colors.text.tertiary, fontSize: 10 }}>
            {formatTimestamp(event.createdAt)}
          </Text>
        </Row>
      </Card>
    </Pressable>
  );
};
