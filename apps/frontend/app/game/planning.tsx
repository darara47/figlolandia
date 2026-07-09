import { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, Alert, StyleSheet } from 'react-native';
import { useGameStore } from '@/src/store/game.store';
import { useSocketStore } from '@/src/store/socket.store';
import { useLobbyStore } from '@/src/store/lobby.store';
import { Button } from '@/src/components/ui/Button';
import { Row } from '@/src/components/ui/Stack';
import { Text } from '@/src/components/ui/Text';
import { HandCard } from '@/src/components/cards/HandCard';
import { PlayerCard } from '@/src/components/player/PlayerCard';
import { RoundTimer } from '@/src/components/design-system/RoundTimer';
import { ProfessionPanel } from '@/src/components/design-system/ProfessionPanel';
import { PlayerAvatar } from '@/src/components/design-system/PlayerAvatar';
import { PROFESSION_DATA, CATEGORY_COLORS } from '@figlolandia/game-core';
import { CardDto } from '@/src/types/api';
import { colors, radius, spacing } from '@/src/theme/tokens';

const TAX_CATEGORIES: { id: string; label: string }[] = [
  { id: 'education', label: 'Edukacja' },
  { id: 'health', label: 'Zdrowie' },
  { id: 'finance', label: 'Finanse' },
  { id: 'administration', label: 'Administracja' },
  { id: 'entertainment', label: 'Rozrywka' },
];

const PLANNING_TOTAL_MS = 600000;

export default function PlanningScreen() {
  const {
    gameId,
    phase,
    round,
    players,
    me,
    planningStatus,
    planningPhaseStartTime,
  } = useGameStore();
  const { playerId } = useLobbyStore();
  const { confirmBuild, confirmAbility } = useSocketStore();
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [handExpanded, setHandExpanded] = useState(false);
  const [selectedProfessionTargetId, setSelectedProfessionTargetId] = useState<string | null>(null);
  const [thiefTheftTarget, setThiefTheftTarget] = useState<'gold' | 'card'>('gold');
  const [selectedTaxCategory, setSelectedTaxCategory] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(PLANNING_TOTAL_MS);

  const myPlanningStatus = playerId ? planningStatus[playerId] : undefined;
  const serverBuildConfirmed = !!myPlanningStatus?.buildConfirmed;
  const serverAbilityConfirmed = !!myPlanningStatus?.abilityConfirmed;

  const [localBuildSubmitted, setLocalBuildSubmitted] = useState(false);
  const [localAbilitySubmitted, setLocalAbilitySubmitted] = useState(false);

  useEffect(() => {
    if (!serverBuildConfirmed) setLocalBuildSubmitted(false);
  }, [serverBuildConfirmed]);

  useEffect(() => {
    if (!serverAbilityConfirmed) setLocalAbilitySubmitted(false);
  }, [serverAbilityConfirmed]);

  useEffect(() => {
    setSelectedCards(new Set());
    setSelectedProfessionTargetId(null);
    setThiefTheftTarget('gold');
    setSelectedTaxCategory(null);
    setLocalBuildSubmitted(false);
    setLocalAbilitySubmitted(false);
  }, [round]);

  const professionData = me?.profession
    ? PROFESSION_DATA[me.profession as keyof typeof PROFESSION_DATA]
    : null;

  const canBuildInteract = phase === 'PLANNING' && !serverBuildConfirmed;
  const canAbilityInteract = phase === 'PLANNING' && !serverAbilityConfirmed;
  const maxBuildings = me?.profession === 'builder' ? 2 : 1;

  const professionRequiresPlayerTarget = (() => {
    const p = me?.profession;
    if (!p) return false;
    return p === 'saboteur' || p === 'vandal' || p === 'thief' || p === 'inspector' || p === 'spy';
  })();

  const professionRequiresCategory = me?.profession === 'politician';
  const professionRequiresChoice = professionRequiresPlayerTarget || professionRequiresCategory;

  const canConfirmProfessionAbility =
    canAbilityInteract &&
    !!playerId &&
    ((professionRequiresPlayerTarget && !!selectedProfessionTargetId) ||
      (professionRequiresCategory && !!selectedTaxCategory));

  useEffect(() => {
    if (phase !== 'PLANNING' || !planningPhaseStartTime) {
      setTimeRemaining(PLANNING_TOTAL_MS);
      return;
    }

    const updateTimer = () => {
      const elapsed = Date.now() - planningPhaseStartTime;
      setTimeRemaining(Math.max(0, PLANNING_TOTAL_MS - elapsed));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [phase, planningPhaseStartTime]);

  const handleCardSelect = (cardId: string) => {
    if (!canBuildInteract) return;
    const newSelected = new Set(selectedCards);
    if (newSelected.has(cardId)) {
      newSelected.delete(cardId);
    } else {
      if (newSelected.size >= maxBuildings) {
        Alert.alert(
          'Limit budynków',
          maxBuildings === 1
            ? 'Możesz wybudować tylko 1 budynek w tej rundzie.'
            : `Możesz wybudować maksymalnie ${maxBuildings} budynki w tej rundzie.`,
        );
        return;
      }
      const card = me?.cards.find((c: CardDto) => c.id === cardId);
      if (card && getCardCost(card) > remainingGold) {
        Alert.alert('Za mało złota', 'Nie masz wystarczająco złota, aby wybudować ten budynek.');
        return;
      }
      newSelected.add(cardId);
    }
    setSelectedCards(newSelected);
  };

  const handleConfirmBuild = () => {
    if (!gameId || !canBuildInteract || !playerId) return;
    if (selectedCards.size === 0) {
      Alert.alert('Błąd', 'Wybierz kartę do budowy');
      return;
    }

    const buildActions = Array.from(selectedCards)
      .map((cardId) => {
        const card = me?.cards.find((c: { id: string }) => c.id === cardId);
        if (!card) return null;
        return {
          type: 'build' as const,
          cardId,
          buildingType: card.buildingType,
          buildingValue: card.buildingValue,
        };
      })
      .filter(
        (a): a is { type: 'build'; cardId: string; buildingType: string; buildingValue: number } =>
          a !== null,
      );

    if (buildActions.length === 0) return;

    confirmBuild({ gameId, actions: buildActions, passBuild: false });
    setLocalBuildSubmitted(true);
  };

  const handleSkipBuild = () => {
    if (!gameId || !canBuildInteract || !playerId) return;
    confirmBuild({ gameId, actions: [], passBuild: true });
    setLocalBuildSubmitted(true);
    setSelectedCards(new Set());
  };

  const SKIP_TARGET = '__skip__';

  const handleConfirmProfessionAbility = () => {
    if (!gameId || !playerId || !canAbilityInteract || !professionRequiresChoice) return;
    if (professionRequiresPlayerTarget && !selectedProfessionTargetId) return;
    if (professionRequiresCategory && !selectedTaxCategory) return;

    const isSkip = selectedProfessionTargetId === SKIP_TARGET;

    confirmAbility({
      gameId,
      abilityAction: isSkip
        ? { type: 'use_profession', professionAbility: false }
        : {
          type: 'use_profession',
          professionAbility: true,
          target: professionRequiresPlayerTarget
            ? selectedProfessionTargetId ?? undefined
            : undefined,
          theftTarget: me?.profession === 'thief' ? thiefTheftTarget : undefined,
          taxedCategory: professionRequiresCategory
            ? selectedTaxCategory ?? undefined
            : undefined,
        },
    });
    setLocalAbilitySubmitted(true);
  };

  const sortedPlayers = [...players].sort(
    (a, b) =>
      (a.joinOrder ?? Number.MAX_SAFE_INTEGER) - (b.joinOrder ?? Number.MAX_SAFE_INTEGER),
  );
  const targetPlayers = playerId ? sortedPlayers.filter((p) => p.id !== playerId) : [];

  const getCardCost = (card: CardDto): number => {
    let cost = card.buildingValue;
    if (me?.profession === 'opportunity_hunter') {
      cost = Math.max(0, cost - 2);
    }
    return cost;
  };

  const availableGold = me?.gold ?? 0;
  const selectedCost = Array.from(selectedCards).reduce((sum, cardId) => {
    const card = me?.cards.find((c: CardDto) => c.id === cardId);
    return sum + (card ? getCardCost(card) : 0);
  }, 0);
  const remainingGold = availableGold - selectedCost;

  const isOffensiveProfession =
    me?.profession === 'saboteur' ||
    me?.profession === 'vandal' ||
    me?.profession === 'thief' ||
    me?.profession === 'spy';

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text variant="display">Runda {round} — Planowanie</Text>
          {phase === 'PLANNING' && (
            <RoundTimer remainingMs={timeRemaining} totalMs={PLANNING_TOTAL_MS} />
          )}
        </View>
      </View>

      <ScrollView style={styles.playersList} contentContainerStyle={styles.playersListContent}>
        <Text variant="section" style={styles.sectionHeading}>
          Gracze
        </Text>
        {sortedPlayers.map((player) => {
          const status = planningStatus[player.id];
          return (
            <View key={player.id} style={styles.playerCardWrap}>
              <PlayerCard
                player={player}
                isMe={player.id === playerId}
                buildConfirmed={!!status?.buildConfirmed}
                abilityConfirmed={!!status?.abilityConfirmed}
                showProfession={false}
              />
            </View>
          );
        })}
      </ScrollView>

      <View style={[styles.handPanel, handExpanded && styles.handPanelExpanded]}>
        <Pressable onPress={() => setHandExpanded(!handExpanded)} style={styles.handToggle}>
          <View style={styles.handToggleRow}>
            <Text variant="body" style={styles.handToggleTitle}>
              Moje karty ({me?.cards.length || 0})
            </Text>
            <Text variant="label">{handExpanded ? '▼' : '▲'}</Text>
          </View>
        </Pressable>

        {handExpanded && (
          <ScrollView
            style={styles.handScroll}
            contentContainerStyle={styles.handScrollContent}
            showsVerticalScrollIndicator
          >
            {me && (
              <View style={styles.resourceBar}>
                <View style={styles.resourceItem}>
                  <Text variant="label">Złoto:</Text>
                  <Text variant="stat" style={{ color: colors.gold.DEFAULT, marginLeft: 8 }}>
                    {availableGold}
                  </Text>
                </View>
                {professionData && (
                  <View style={styles.resourceItem}>
                    <Text variant="label">Zawód:</Text>
                    <Text variant="body" style={{ marginLeft: 8, fontFamily: 'PlusJakartaSans_700Bold' }}>
                      {professionData.name}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.columns}>
              <View style={styles.buildColumn}>
                <Text variant="section" style={styles.columnHeading}>
                  Budowa
                </Text>
                <View style={styles.cardsRow}>
                  {me?.cards.map((card: CardDto) => {
                    const isSelected = selectedCards.has(card.id);
                    const atLimit = !isSelected && selectedCards.size >= maxBuildings;
                    const cost = getCardCost(card);
                    const cannotAfford = !isSelected && cost > remainingGold;
                    const cardDisabled = !canBuildInteract || atLimit || cannotAfford;
                    return (
                      <View key={card.id} style={styles.cardWrap}>
                        <HandCard
                          card={card}
                          selected={isSelected}
                          disabled={cardDisabled}
                          size="hand"
                          onPress={() => handleCardSelect(card.id)}
                        />
                        <Text
                          variant="label"
                          style={[
                            styles.cardCost,
                            cannotAfford && { color: colors.danger },
                            isSelected && { color: colors.text.primary },
                          ]}
                        >
                          Koszt: {cost} złota
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {selectedCards.size > 0 && (
                  <Text variant="label" style={styles.buildCostInfo}>
                    Budowa zużyje {selectedCost}{' '}
                    {selectedCost === 1 ? 'złoto' : 'złota'} z {availableGold} dostępnego (pozostanie{' '}
                    {remainingGold}).
                  </Text>
                )}

                <Row gap={12} style={styles.actionsRow}>
                  <Button
                    variant="primary"
                    onPress={handleConfirmBuild}
                    disabled={!canBuildInteract || selectedCards.size === 0 || localBuildSubmitted}
                    style={styles.actionButton}
                  >
                    Buduj ({selectedCards.size}/{maxBuildings})
                  </Button>
                  <Button
                    variant="secondary"
                    onPress={handleSkipBuild}
                    disabled={!canBuildInteract || localBuildSubmitted}
                    style={styles.actionButton}
                  >
                    Pomiń budowę
                  </Button>
                </Row>

                {serverBuildConfirmed && (
                  <Text variant="label" style={{ color: colors.success }}>
                    ✓ Budowa potwierdzona
                  </Text>
                )}
              </View>

              <View style={styles.professionColumn}>
                {professionData && me?.profession && (
                  <ProfessionPanel profession={me.profession}>
                    <Text variant="body" style={styles.professionDescription}>
                      {getProfessionDescription(me.profession)}
                    </Text>

                    {professionRequiresChoice ? (
                      <>
                        {professionRequiresPlayerTarget && (
                          <>
                            <Text variant="label" style={styles.fieldLabel}>
                              Wybierz gracza (cel)
                            </Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                              <View style={styles.targetRow}>
                                {targetPlayers.map((p) => {
                                  const selected = selectedProfessionTargetId === p.id;
                                  return (
                                    <Pressable
                                      key={p.id}
                                      disabled={!canAbilityInteract}
                                      onPress={
                                        canAbilityInteract
                                          ? () => setSelectedProfessionTargetId(p.id)
                                          : undefined
                                      }
                                      style={[
                                        styles.targetChip,
                                        selected
                                          ? isOffensiveProfession
                                            ? styles.targetChipDanger
                                            : styles.targetChipBrand
                                          : styles.targetChipDefault,
                                        !canAbilityInteract && styles.targetChipDisabled,
                                      ]}
                                    >
                                      <PlayerAvatar playerId={p.id} name={p.name} size={32} />
                                      <Text variant="label" style={styles.targetChipLabel}>
                                        {p.name}
                                      </Text>
                                    </Pressable>
                                  );
                                })}
                                <Pressable
                                  disabled={!canAbilityInteract}
                                  onPress={
                                    canAbilityInteract
                                      ? () => setSelectedProfessionTargetId(SKIP_TARGET)
                                      : undefined
                                  }
                                  style={[
                                    styles.targetChip,
                                    styles.targetChipSkip,
                                    selectedProfessionTargetId === SKIP_TARGET && styles.targetChipBrand,
                                  ]}
                                >
                                  <Text variant="label">Pomiń</Text>
                                </Pressable>
                              </View>
                            </ScrollView>
                          </>
                        )}

                        {professionRequiresCategory && (
                          <>
                            <Text variant="label" style={styles.fieldLabel}>
                              Wybierz kategorię do opodatkowania
                            </Text>
                            <View style={styles.categoryRow}>
                              {TAX_CATEGORIES.map((cat) => {
                                const selected = selectedTaxCategory === cat.id;
                                const hasSelection = selectedTaxCategory !== null;
                                const dimmed = hasSelection && !selected;
                                const categoryColor =
                                  CATEGORY_COLORS[cat.id as keyof typeof CATEGORY_COLORS] ||
                                  '#57628A';
                                return (
                                  <Pressable
                                    key={cat.id}
                                    disabled={!canAbilityInteract}
                                    onPress={
                                      canAbilityInteract
                                        ? () => setSelectedTaxCategory(cat.id)
                                        : undefined
                                    }
                                    style={[
                                      styles.categoryChip,
                                      {
                                        backgroundColor: categoryColor,
                                        opacity: !canAbilityInteract ? 0.4 : dimmed ? 0.45 : 1,
                                        borderWidth: selected ? 3 : 0,
                                        borderColor: selected ? colors.brand.DEFAULT : 'transparent',
                                      },
                                    ]}
                                  >
                                    <Text variant="body" style={{ color: '#FFFFFF' }}>
                                      {cat.label}
                                    </Text>
                                  </Pressable>
                                );
                              })}
                            </View>
                          </>
                        )}

                        {me.profession === 'thief' && (
                          <View style={styles.thiefRow}>
                            <Text variant="label" style={styles.fieldLabel}>
                              Co ukraść?
                            </Text>
                            <View style={styles.choiceRow}>
                              {(['gold', 'card'] as const).map((t) => {
                                const selected = thiefTheftTarget === t;
                                return (
                                  <Pressable
                                    key={t}
                                    disabled={!canAbilityInteract}
                                    onPress={
                                      canAbilityInteract ? () => setThiefTheftTarget(t) : undefined
                                    }
                                    style={[
                                      styles.choiceChip,
                                      selected ? styles.choiceChipSelected : styles.choiceChipDefault,
                                    ]}
                                  >
                                    <Text variant="body">
                                      {t === 'gold' ? 'Złoto' : 'Kartę'}
                                    </Text>
                                  </Pressable>
                                );
                              })}
                            </View>
                          </View>
                        )}

                        <Button
                          variant="primary"
                          onPress={handleConfirmProfessionAbility}
                          disabled={!canConfirmProfessionAbility || localAbilitySubmitted}
                          style={styles.fullWidthButton}
                        >
                          Zatwierdź operację zdolności
                        </Button>
                      </>
                    ) : (
                      <Text variant="label">Zdolność: auto</Text>
                    )}

                    {professionRequiresChoice && serverAbilityConfirmed && (
                      <Text variant="label" style={{ color: colors.success, marginTop: 8 }}>
                        ✓ Zdolność potwierdzona
                      </Text>
                    )}
                  </ProfessionPanel>
                )}
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

function getProfessionDescription(profession: string): string {
  const descriptions: Record<string, string> = {
    lucky: 'Szczęściarz – +2 złotki na start rundy',
    opportunity_hunter: 'Łowca okazji – budowa budynku w rundzie kosztuje o 2 złotki mniej',
    investor: 'Inwestor – dobiera +1 kartę budynku',
    accountant: 'Księgowy – jeśli na koniec rundy masz mniej niż 2 złotki, otrzymujesz +2 złotki',
    builder: 'Budowlaniec – może wybudować +1 budynek',
    architect: 'Architekt – może zmienić kategorię budynku',
    urbanist:
      'Urbanista – budynek o najniższej wartości +1 (lub pierwszy wybudowany w rundzie, jeśli nie masz budynków)',
    vandal: 'Wandal – niszczy wartość budynku przeciwnika o 2',
    thief: 'Złodziej – kradnie 2 złotki lub losową kartę budynku z ręki przeciwnika',
    saboteur: 'Sabotażysta – blokuje zdolność przeciwnika',
    spy: 'Szpieg – podgląda rękę innego gracza',
    politician:
      'Polityk – nakłada podatek na wybraną kategorię: zyskuje +1 złotko za każdy budynek wybudowany w niej przez innych graczy w tej rundzie',
    diplomat:
      'Dyplomata – nie może być celem negatywnych działań w tej rundzie (sam nie atakuje)',
    inspector:
      'Inspektor – wskazuje gracza, którego budynki zostaną wybudowane dopiero w kolejnej rundzie',
  };
  return descriptions[profession] || 'Brak opisu';
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  header: {
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
    backgroundColor: colors.bg.elevated,
    paddingHorizontal: spacing.screen,
    paddingVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playersList: {
    flex: 1,
  },
  playersListContent: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.screen,
    paddingBottom: spacing.cardGap,
  },
  sectionHeading: {
    marginBottom: 12,
  },
  playerCardWrap: {
    marginBottom: spacing.cardGap,
  },
  handPanel: {
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
    backgroundColor: colors.bg.elevated,
    height: 128,
  },
  handPanelExpanded: {
    height: 700,
  },
  handToggle: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
    padding: 12,
  },
  handToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  handToggleTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  handScroll: {
    flex: 1,
    minHeight: 0,
  },
  handScrollContent: {
    padding: spacing.screen,
  },
  resourceBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: radius.chip,
    backgroundColor: colors.bg.base,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: spacing.cardGap,
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
    marginBottom: 4,
  },
  columns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.cardGap,
  },
  buildColumn: {
    flex: 2,
    minWidth: 0,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: 'rgba(11, 18, 32, 0.5)',
    padding: 12,
    marginRight: 6,
  },
  professionColumn: {
    flex: 1,
    minWidth: 240,
    marginLeft: 6,
  },
  columnHeading: {
    marginBottom: 12,
  },
  cardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginBottom: spacing.cardGap,
  },
  cardWrap: {
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 12,
  },
  cardCost: {
    marginTop: 4,
    fontSize: 12,
  },
  buildCostInfo: {
    marginBottom: 12,
    color: colors.gold.DEFAULT,
  },
  actionsRow: {
    marginBottom: spacing.cardGap,
    alignSelf: 'stretch',
  },
  actionButton: {
    flex: 1,
  },
  professionDescription: {
    marginBottom: 12,
    color: colors.text.secondary,
  },
  fieldLabel: {
    marginBottom: 8,
  },
  targetRow: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingBottom: 4,
  },
  targetChip: {
    alignItems: 'center',
    borderRadius: radius.chip,
    borderWidth: 2,
    padding: 8,
    marginRight: 8,
  },
  targetChipDefault: {
    borderColor: colors.border.DEFAULT,
  },
  targetChipBrand: {
    borderColor: colors.brand.DEFAULT,
  },
  targetChipDanger: {
    borderColor: colors.danger,
  },
  targetChipSkip: {
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  targetChipDisabled: {
    opacity: 0.4,
  },
  targetChipLabel: {
    marginTop: 4,
    fontSize: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  categoryChip: {
    borderRadius: radius.chip,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  thiefRow: {
    marginBottom: 12,
  },
  choiceRow: {
    flexDirection: 'row',
  },
  choiceChip: {
    borderRadius: radius.chip,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  choiceChipSelected: {
    backgroundColor: colors.brand.DEFAULT,
  },
  choiceChipDefault: {
    backgroundColor: colors.bg.hover,
  },
  fullWidthButton: {
    width: '100%',
  },
});
