import { View, Pressable, StyleSheet } from 'react-native';
import { SkipForward } from 'lucide-react-native';
import { Text } from '@/src/components/ui/Text';
import { Row } from '@/src/components/ui/Stack';
import { PlayerAvatar } from '@/src/components/design-system/PlayerAvatar';
import { PlayerDto } from '@/src/types/api';
import { colors, radius, spacing } from '@/src/theme/tokens';

interface SkipAnimationBarProps {
  players: PlayerDto[];
  skipVotes: string[];
  localSkipVoted: boolean;
  onSkip: () => void;
}

export const SkipAnimationBar = ({
  players,
  skipVotes,
  localSkipVoted,
  onSkip,
}: SkipAnimationBarProps) => {
  const votingPlayers = players.filter((p) => skipVotes.includes(p.id));

  return (
    <View style={styles.bar}>
      <Pressable
        onPress={onSkip}
        disabled={localSkipVoted}
        style={[styles.skipButton, localSkipVoted && styles.skipButtonDisabled]}
      >
        <Row gap={6} align="center">
          <SkipForward size={16} color={colors.text.secondary} />
          <Text variant="label" style={{ color: colors.text.secondary }}>
            {localSkipVoted ? 'Głos oddany' : 'Pomiń animację'}
          </Text>
        </Row>
      </Pressable>

      <View style={styles.voteInfo}>
        <Text variant="label" style={styles.voteCount}>
          {skipVotes.length}/{players.length} graczy chce pominąć
        </Text>
        <Row gap={6}>
          {votingPlayers.map((p) => (
            <PlayerAvatar key={p.id} playerId={p.id} name={p.name} size={28} />
          ))}
        </Row>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.chip,
    marginBottom: spacing.cardGap,
  },
  skipButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.bg.base,
  },
  skipButtonDisabled: {
    opacity: 0.6,
  },
  voteInfo: {
    alignItems: 'flex-end',
    flex: 1,
    marginLeft: 12,
  },
  voteCount: {
    color: colors.text.secondary,
    marginBottom: 4,
  },
});
