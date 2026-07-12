import { Text as RNText } from 'react-native';
import { colors } from '@/src/theme/tokens';

interface DiffLineProps {
  line: string;
  compact?: boolean;
}

const parseGoldChange = (line: string): { direction: 'up' | 'down' | 'neutral'; parts: string[] } => {
  const match = line.match(/(\d+)\s*→\s*(\d+)/);
  if (!match) return { direction: 'neutral', parts: [line] };

  const before = Number(match[1]);
  const after = Number(match[2]);
  const direction = after > before ? 'up' : after < before ? 'down' : 'neutral';
  const [beforePart, afterPart] = line.split('→');

  return { direction, parts: [beforePart, '→', afterPart] };
};

export const DiffLine = ({ line, compact = false }: DiffLineProps) => {
  const { direction, parts } = parseGoldChange(line);
  const numberColor =
    direction === 'up' ? colors.success : direction === 'down' ? colors.danger : colors.text.secondary;

  if (parts.length === 1) {
    return (
      <RNText
        style={{
          color: colors.text.secondary,
          fontSize: compact ? 11 : 13,
          fontFamily: 'PlusJakartaSans_500Medium',
        }}
      >
        {line}
      </RNText>
    );
  }

  return (
    <RNText
      style={{
        color: colors.text.secondary,
        fontSize: compact ? 11 : 13,
        fontFamily: 'PlusJakartaSans_500Medium',
      }}
    >
      {parts[0]}
      <RNText style={{ color: numberColor, fontWeight: '700' }}>{parts[1]}</RNText>
      <RNText style={{ color: numberColor, fontWeight: '700' }}>{parts[2]}</RNText>
    </RNText>
  );
};
