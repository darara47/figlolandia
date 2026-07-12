import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/src/components/ui/Text';
import { colors } from '@/src/theme/tokens';
import type { AuditValidationDto } from '@/src/types/audit';
import type { DevToolsDensity } from '@/src/debug/store/devtools.store';
import { densityPadding } from '@/src/debug/store/devtools.store';

interface ValidationCheckRowProps {
  check: AuditValidationDto;
  density?: DevToolsDensity;
}

export const ValidationCheckRow = ({ check, density = 'comfortable' }: ValidationCheckRowProps) => {
  const [expanded, setExpanded] = useState(false);
  const padding = densityPadding(density);
  const isOk = check.status === 'OK';

  return (
    <View
      style={{
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
        paddingVertical: padding / 2,
      }}
    >
      <Pressable onPress={() => setExpanded((v) => !v)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="body" style={{ color: colors.text.primary, flex: 1, fontSize: density === 'compact' ? 12 : 14 }}>
            {check.checkName}
          </Text>
          <Text
            variant="label"
            style={{
              color: isOk ? colors.success : check.status === 'WARN' ? colors.warning : colors.danger,
              fontWeight: '700',
            }}
          >
            {check.status}
          </Text>
        </View>
        <Text variant="label" style={{ color: colors.text.tertiary, marginTop: 2 }}>
          Runda {check.round}
        </Text>
      </Pressable>
      {expanded ? (
        <View
          style={{
            marginTop: 8,
            backgroundColor: colors.bg.base,
            borderRadius: 8,
            padding: 8,
          }}
        >
          <Text
            variant="label"
            style={{
              color: colors.text.secondary,
              fontFamily: 'monospace',
              fontSize: 11,
            }}
          >
            {JSON.stringify(check.details, null, 2)}
          </Text>
        </View>
      ) : null}
    </View>
  );
};
