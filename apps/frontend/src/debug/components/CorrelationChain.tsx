import { View } from 'react-native';
import { ArrowDown } from 'lucide-react-native';
import { Text } from '@/src/components/ui/Text';
import { Row } from '@/src/components/ui/Stack';
import { CopyButton } from '@/src/debug/components/CopyButton';
import { colors } from '@/src/theme/tokens';
import type { CorrelationChainDto } from '@/src/types/audit';
import type { DevToolsDensity } from '@/src/debug/store/devtools.store';
import { densityPadding } from '@/src/debug/store/devtools.store';

interface CorrelationChainProps {
  chain: CorrelationChainDto;
  density?: DevToolsDensity;
  onEventPress?: (eventId: number) => void;
}

export const CorrelationChain = ({
  chain,
  density = 'comfortable',
  onEventPress,
}: CorrelationChainProps) => {
  const padding = densityPadding(density);

  return (
    <View
      style={{
        padding,
        marginBottom: density === 'compact' ? 8 : 12,
        backgroundColor: colors.bg.elevated,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border.DEFAULT,
      }}
    >
      <Row gap={6} align="center" style={{ marginBottom: 8 }}>
        <Text variant="label" style={{ color: colors.category.education, fontSize: 11 }}>
          {chain.correlationId}
        </Text>
        <CopyButton value={chain.correlationId} size={12} />
      </Row>
      {chain.events.map((event, index) => (
        <View key={event.id}>
          <Text
            variant="label"
            style={{
              color: colors.text.primary,
              fontSize: density === 'compact' ? 11 : 12,
            }}
            onPress={() => onEventPress?.(event.id)}
          >
            {event.type}: {event.message}
          </Text>
          {event.parentEventUid ? (
            <Text variant="label" style={{ color: colors.text.tertiary, fontSize: 9, marginTop: 2 }}>
              parent: {event.parentEventUid}
            </Text>
          ) : null}
          {index < chain.events.length - 1 ? (
            <View style={{ alignItems: 'center', paddingVertical: 4 }}>
              <ArrowDown size={14} color={colors.text.tertiary} />
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
};
