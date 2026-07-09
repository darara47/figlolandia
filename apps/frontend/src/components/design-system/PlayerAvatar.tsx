import { View, StyleSheet } from 'react-native';
import { User } from 'lucide-react-native';
import { Text } from '@/src/components/ui/Text';
import { getPlayerAvatarColor, colors, fonts } from '@/src/theme/tokens';

interface PlayerAvatarProps {
  playerId: string;
  name: string;
  size?: number;
}

export const PlayerAvatar = ({ playerId, name, size = 36 }: PlayerAvatarProps) => {
  const trimmed = name.trim();
  const isNumericName = /^\d+$/.test(trimmed);
  const initial = trimmed.charAt(0).toUpperCase() || '?';
  const bgColor = getPlayerAvatarColor(playerId);
  const fontSize = Math.max(12, Math.round(size * 0.4));
  const iconSize = Math.round(size * 0.45);

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bgColor,
        },
      ]}
    >
      {isNumericName ? (
        <User color={colors.text.primary} size={iconSize} strokeWidth={2} />
      ) : (
        <Text
          style={{
            color: colors.text.primary,
            fontFamily: fonts.bodyBold,
            fontSize,
            lineHeight: fontSize,
            textAlign: 'center',
            includeFontPadding: false,
          }}
        >
          {initial}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
