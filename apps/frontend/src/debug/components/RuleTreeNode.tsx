import { View } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { Text } from '@/src/components/ui/Text';
import { colors } from '@/src/theme/tokens';
import type { RuleEvaluationDto } from '@/src/types/audit';
import type { DevToolsDensity } from '@/src/debug/store/devtools.store';
import { densityPadding } from '@/src/debug/store/devtools.store';

interface RuleTreeNodeProps {
  rule: RuleEvaluationDto;
  decision?: string | null;
  isLast?: boolean;
  density?: DevToolsDensity;
}

export const RuleTreeNode = ({
  rule,
  decision,
  isLast = false,
  density = 'comfortable',
}: RuleTreeNodeProps) => {
  const padding = densityPadding(density);

  return (
    <View
      style={{
        paddingLeft: padding,
        borderLeftWidth: 2,
        borderLeftColor: rule.passed ? colors.success : colors.severity.error,
        marginBottom: density === 'compact' ? 6 : 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {rule.passed ? (
          <Check size={14} color={colors.success} />
        ) : (
          <X size={14} color={colors.severity.error} />
        )}
        <Text variant="label" style={{ color: colors.text.primary, fontSize: density === 'compact' ? 11 : 12 }}>
          {rule.rule}
        </Text>
      </View>
      <Text variant="label" style={{ color: colors.text.tertiary, marginTop: 2, fontSize: 10 }}>
        {rule.condition}
      </Text>
      <View style={{ marginTop: 4, gap: 2 }}>
        <Text variant="label" style={{ color: colors.text.secondary, fontSize: 10 }}>
          Expected: {rule.expected}
        </Text>
        <Text
          variant="label"
          style={{
            color: rule.passed ? colors.text.secondary : colors.danger,
            fontSize: 10,
          }}
        >
          Actual: {rule.actual}
        </Text>
      </View>
      {isLast && decision ? (
        <Text
          variant="label"
          style={{
            color: colors.brand.DEFAULT,
            marginTop: 6,
            fontWeight: '700',
            fontSize: density === 'compact' ? 11 : 12,
          }}
        >
          Decision: {decision}
        </Text>
      ) : null}
    </View>
  );
};
