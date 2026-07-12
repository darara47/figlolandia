import { View } from 'react-native';
import { Text } from '@/src/components/ui/Text';
import { colors } from '@/src/theme/tokens';
import type { AuditGoldEntryDto } from '@/src/types/audit';
import type { DevToolsDensity } from '@/src/debug/store/devtools.store';
import { densityPadding } from '@/src/debug/store/devtools.store';

interface GoldLedgerRowProps {
  entry: AuditGoldEntryDto;
  density?: DevToolsDensity;
}

export const GoldLedgerRow = ({ entry, density = 'comfortable' }: GoldLedgerRowProps) => {
  const padding = densityPadding(density);
  const deltaSign = entry.delta > 0 ? '+' : '';

  return (
    <View
      style={{
        paddingVertical: padding / 2,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="label" style={{ color: colors.text.primary, fontSize: density === 'compact' ? 11 : 13 }}>
          {entry.playerName}
        </Text>
        <Text
          variant="label"
          style={{
            color: entry.delta >= 0 ? colors.success : colors.danger,
            fontWeight: '700',
            fontSize: density === 'compact' ? 11 : 13,
          }}
        >
          {entry.before} → {entry.after} ({deltaSign}{entry.delta})
        </Text>
      </View>
      <Text variant="label" style={{ color: colors.text.tertiary, fontSize: 10, marginTop: 2 }}>
        {entry.reason} · {entry.phase}
      </Text>
    </View>
  );
};
