import { Pressable } from 'react-native';
import { Text } from '@/src/components/ui/Text';
import { Row } from '@/src/components/ui/Stack';
import { colors, radius } from '@/src/theme/tokens';

interface FilterChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

export const FilterChip = ({ label, active, onPress }: FilterChipProps) => (
  <Pressable
    onPress={onPress}
    style={{
      borderRadius: radius.chip,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: active ? colors.brand.DEFAULT : colors.border.DEFAULT,
      backgroundColor: active ? colors.brand.muted : colors.bg.elevated,
    }}
  >
    <Text
      variant="label"
      style={{ color: active ? colors.brand.DEFAULT : colors.text.secondary }}
    >
      {label}
    </Text>
  </Pressable>
);

interface BreadcrumbSegment {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  segments: BreadcrumbSegment[];
  onNavigate: (href: string) => void;
}

export const Breadcrumb = ({ segments, onNavigate }: BreadcrumbProps) => (
  <Row gap={4} wrap style={{ marginBottom: 12, flexWrap: 'wrap' }}>
    {segments.map((segment, index) => (
      <Row key={`${segment.label}-${index}`} gap={4}>
        {segment.href ? (
          <Pressable onPress={() => onNavigate(segment.href!)}>
            <Text variant="label" style={{ color: colors.brand.DEFAULT }}>
              {segment.label}
            </Text>
          </Pressable>
        ) : (
          <Text variant="label" style={{ color: colors.text.secondary }}>
            {segment.label}
          </Text>
        )}
        {index < segments.length - 1 ? (
          <Text variant="label" style={{ color: colors.text.tertiary }}>
            /
          </Text>
        ) : null}
      </Row>
    ))}
  </Row>
);
