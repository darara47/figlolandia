import { Pressable, View } from 'react-native';
import { Text } from '@/src/components/ui/Text';
import { Row } from '@/src/components/ui/Stack';
import { useDevToolsStore } from '@/src/debug/store/devtools.store';
import { colors } from '@/src/theme/tokens';

interface DevToolsHeaderProps {
  title: string;
  children?: React.ReactNode;
}

export const DevToolsHeader = ({ title, children }: DevToolsHeaderProps) => {
  const density = useDevToolsStore((s) => s.density);
  const setDensity = useDevToolsStore((s) => s.setDensity);
  const toastMessage = useDevToolsStore((s) => s.toastMessage);

  return (
    <View style={{ marginBottom: 16 }}>
      <Row justify="space-between" align="center" style={{ marginBottom: 8 }}>
        <Text variant="section" style={{ color: colors.text.primary }}>
          {title}
        </Text>
        <Row gap={8} align="center">
          <Pressable
            onPress={() => setDensity('compact')}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 8,
              backgroundColor: density === 'compact' ? colors.brand.muted : colors.bg.elevated,
              borderWidth: 1,
              borderColor: density === 'compact' ? colors.brand.DEFAULT : colors.border.DEFAULT,
            }}
          >
            <Text variant="label" style={{ color: colors.text.secondary, fontSize: 11 }}>
              Compact
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setDensity('comfortable')}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 8,
              backgroundColor: density === 'comfortable' ? colors.brand.muted : colors.bg.elevated,
              borderWidth: 1,
              borderColor: density === 'comfortable' ? colors.brand.DEFAULT : colors.border.DEFAULT,
            }}
          >
            <Text variant="label" style={{ color: colors.text.secondary, fontSize: 11 }}>
              Comfortable
            </Text>
          </Pressable>
        </Row>
      </Row>
      {children}
      {toastMessage ? (
        <View
          style={{
            position: 'absolute',
            bottom: -40,
            right: 0,
            backgroundColor: colors.bg.elevated,
            borderColor: colors.border.DEFAULT,
            borderWidth: 1,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 6,
            zIndex: 100,
          }}
        >
          <Text variant="label" style={{ color: colors.success }}>
            {toastMessage}
          </Text>
        </View>
      ) : null}
    </View>
  );
};
