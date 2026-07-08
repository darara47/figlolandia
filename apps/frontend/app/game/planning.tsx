import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Alert, StyleSheet } from 'react-native';
import { useGameStore } from '@/src/store/game.store';
import { useSocketStore } from '@/src/store/socket.store';
import { useLobbyStore } from '@/src/store/lobby.store';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { HandCard } from '@/src/components/cards/HandCard';
import { PlayerCard } from '@/src/components/player/PlayerCard';
import { PROFESSION_DATA, CATEGORY_COLORS } from '@figlolandia/game-core';
import { CardDto } from '@/src/types/api';

const TAX_CATEGORIES: { id: string; label: string }[] = [
  { id: 'education', label: 'Edukacja' },
  { id: 'health', label: 'Zdrowie' },
  { id: 'finance', label: 'Finanse' },
  { id: 'administration', label: 'Administracja' },
  { id: 'entertainment', label: 'Rozrywka' },
];

export default function PlanningScreen() {
  const {
    gameId,
    phase,
    round,
    players,
    me,
    submittedPlayers,
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
  const [timeRemaining, setTimeRemaining] = useState<number>(600000); // 10 minut w milisekundach

  const myPlanningStatus = playerId ? planningStatus[playerId] : undefined;
  const serverBuildConfirmed = !!myPlanningStatus?.buildConfirmed;
  const serverAbilityConfirmed = !!myPlanningStatus?.abilityConfirmed;

  // Flagi "in-flight": służą wyłącznie do zablokowania przycisku zaraz po kliknięciu
  // (zanim serwer odeśle potwierdzenie), aby uniknąć podwójnego wysłania.
  // Źródłem prawdy o potwierdzeniu ("Gotowy", ✓) jest ZAWSZE serwer.
  const [localBuildSubmitted, setLocalBuildSubmitted] = useState(false);
  const [localAbilitySubmitted, setLocalAbilitySubmitted] = useState(false);

  // Gdy serwer cofnie potwierdzenie (np. nowa runda / reset kroków), zdejmij lokalną blokadę.
  useEffect(() => {
    if (!serverBuildConfirmed) setLocalBuildSubmitted(false);
  }, [serverBuildConfirmed]);

  useEffect(() => {
    if (!serverAbilityConfirmed) setLocalAbilitySubmitted(false);
  }, [serverAbilityConfirmed]);

  // Na zmianie rundy czyścimy lokalne wybory i blokady (nowy zawód, nowe karty, nowe cele).
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

  // Gating i wyświetlanie ✓ bazują wyłącznie na stanie serwera, więc lokalna
  // flaga nie może zablokować gracza ani pokazać fałszywego potwierdzenia.
  const canBuildInteract = phase === 'PLANNING' && !serverBuildConfirmed;
  const canAbilityInteract = phase === 'PLANNING' && !serverAbilityConfirmed;

  // Limit budynków na rundę: Budowlaniec może wybudować +1 (2), pozostali 1.
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

  // Timer dla fazy PLANNING
  useEffect(() => {
    if (phase !== 'PLANNING' || !planningPhaseStartTime) {
      setTimeRemaining(600000); // Reset do 10 minut
      return;
    }

    const updateTimer = () => {
      const elapsed = Date.now() - planningPhaseStartTime;
      const remaining = Math.max(0, 600000 - elapsed); // 10 minut = 600000 ms
      setTimeRemaining(remaining);
    };

    // Aktualizuj timer natychmiast
    updateTimer();

    // Aktualizuj timer co sekundę
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [phase, planningPhaseStartTime]);

  // Formatuj czas w MM:SS
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

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
        Alert.alert(
          'Za mało złota',
          'Nie masz wystarczająco złota, aby wybudować ten budynek.',
        );
        return;
      }
      newSelected.add(cardId);
    }
    setSelectedCards(newSelected);
  };

  const handleConfirmBuild = () => {
    if (!gameId) return;
    if (!canBuildInteract) return;
    if (selectedCards.size === 0) {
      Alert.alert('Błąd', 'Wybierz kartę do budowy');
      return;
    }
    if (!playerId) return;

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
      .filter((a): a is { type: 'build'; cardId: string; buildingType: string; buildingValue: number } => a !== null);

    if (buildActions.length === 0) return;

    confirmBuild({
      gameId,
      actions: buildActions,
      passBuild: false,
    });
    setLocalBuildSubmitted(true);
  };

  const handleSkipBuild = () => {
    if (!gameId) return;
    if (!canBuildInteract) return;
    if (!playerId) return;

    confirmBuild({
      gameId,
      actions: [],
      passBuild: true,
    });
    setLocalBuildSubmitted(true);
    setSelectedCards(new Set());
  };

  const SKIP_TARGET = '__skip__';

  const handleConfirmProfessionAbility = () => {
    if (!gameId) return;
    if (!playerId) return;
    if (!canAbilityInteract) return;
    if (!professionRequiresChoice) return;
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
          target: professionRequiresPlayerTarget ? selectedProfessionTargetId ?? undefined : undefined,
          theftTarget: me?.profession === 'thief' ? thiefTheftTarget : undefined,
          taxedCategory: professionRequiresCategory ? selectedTaxCategory ?? undefined : undefined,
        },
    });
    setLocalAbilitySubmitted(true);
  };

  const sortedPlayers = [...players].sort(
    (a, b) =>
      (a.joinOrder ?? Number.MAX_SAFE_INTEGER) -
      (b.joinOrder ?? Number.MAX_SAFE_INTEGER),
  );
  const targetPlayers = playerId ? sortedPlayers.filter((p) => p.id !== playerId) : [];

  // Koszt budowy karty = wartość budynku z uwzględnieniem zniżki własnego zawodu.
  // Łowca okazji buduje o 2 taniej (minimum 0).
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>
            Runda {round} - Planowanie
          </Text>
          {phase === 'PLANNING' && (
            <View style={styles.timerContainer}>
              <Text style={styles.timerLabel}>Pozostały czas:</Text>
              <Text style={[styles.timerText, timeRemaining < 60000 && styles.timerTextWarning]}>
                {formatTime(timeRemaining)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Lista graczy */}
      <ScrollView style={styles.playersList}>
        <Text style={styles.sectionTitle}>Gracze</Text>
        {sortedPlayers.map((player) => (
          <PlayerCard
            key={player.id}
            player={player}
            isMe={player.id === playerId}
            style={styles.playerCard}
            hasSubmitted={submittedPlayers.has(player.id)}
            showProfession={false}
          />
        ))}
      </ScrollView>

      {/* Dolny panel z kartami - rozsuwany */}
      <View style={[styles.handPanel, handExpanded && styles.handPanelExpanded]}>
        <Pressable
          onPress={() => setHandExpanded(!handExpanded)}
          style={styles.handToggle}
        >
          <View style={styles.handToggleContent}>
            <Text style={styles.handToggleText}>
              Moje karty ({me?.cards.length || 0})
            </Text>
            <Text style={styles.handToggleIcon}>{handExpanded ? '▼' : '▲'}</Text>
          </View>
        </Pressable>

        {handExpanded && (
          <ScrollView style={styles.handContent}>
            {me && (
              <View style={styles.resourceBar}>
                <View style={styles.resourceItem}>
                  <Text style={styles.headerLabel}>Złoto:</Text>
                  <Text style={styles.goldText}>{availableGold}</Text>
                </View>
                {professionData && (
                  <View style={styles.resourceItem}>
                    <Text style={styles.headerLabel}>Zawód:</Text>
                    <Text style={styles.professionText}>{professionData.name}</Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.columns}>
              {/* Lewa kolumna: budynki */}
              <View style={styles.leftColumn}>
                <View style={styles.cardsContainer}>
                  {me?.cards.map((card: CardDto) => {
                    const isSelected = selectedCards.has(card.id);
                    const atLimit = !isSelected && selectedCards.size >= maxBuildings;
                    const cost = getCardCost(card);
                    const cannotAfford = !isSelected && cost > remainingGold;
                    const cardDisabled = !canBuildInteract || atLimit || cannotAfford;
                    return (
                      <View key={card.id} style={styles.cardWithCost}>
                        <HandCard
                          card={card}
                          selected={isSelected}
                          disabled={cardDisabled}
                          onPress={() => handleCardSelect(card.id)}
                        />
                        <Text
                          style={[
                            styles.cardCostText,
                            cannotAfford && styles.cardCostTextUnaffordable,
                          ]}
                        >
                          Koszt: {cost} złota
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {selectedCards.size > 0 && (
                  <Text style={styles.buildCostInfo}>
                    Budowa zużyje {selectedCost}{' '}
                    {selectedCost === 1 ? 'złoto' : 'złota'} z {availableGold} dostępnego
                    {' '}(pozostanie {remainingGold}).
                  </Text>
                )}

                <View style={styles.actionButtons}>
                  <Button
                    variant="primary"
                    onPress={handleConfirmBuild}
                    disabled={!canBuildInteract || selectedCards.size === 0 || localBuildSubmitted}
                    style={styles.buildButton}
                  >
                    Buduj ({selectedCards.size}/{maxBuildings})
                  </Button>

                  <Button
                    variant="secondary"
                    onPress={handleSkipBuild}
                    disabled={!canBuildInteract || localBuildSubmitted}
                    style={styles.skipButton}
                  >
                    Pomiń budowę
                  </Button>
                </View>

                {serverBuildConfirmed && (
                  <Text style={styles.stepConfirmedText}>✓ Budowa potwierdzona</Text>
                )}
              </View>

              {/* Prawa kolumna: zdolność specjalna */}
              <View style={styles.rightColumn}>
                {professionData && (
                  <Card style={styles.professionCard}>
                    <Text style={styles.professionTitle}>
                      Zawód: {professionData.name}
                    </Text>
                    <Text style={styles.professionDescription}>
                      {getProfessionDescription(me?.profession || '')}
                    </Text>

                    {professionRequiresChoice ? (
                      <>
                        {professionRequiresPlayerTarget && (
                          <>
                            <Text style={styles.targetLabel}>Wybierz gracza (cel)</Text>
                            <View style={styles.targetList}>
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
                                      styles.targetButton,
                                      selected && styles.targetButtonSelected,
                                    ]}
                                  >
                                    <Text style={styles.targetButtonText}>{p.name}</Text>
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
                                  styles.targetButton,
                                  styles.skipAbilityButton,
                                  selectedProfessionTargetId === SKIP_TARGET && styles.targetButtonSelected,
                                ]}
                              >
                                <Text style={styles.targetButtonText}>Pomiń</Text>
                              </Pressable>
                            </View>
                          </>
                        )}

                        {professionRequiresCategory && (
                          <>
                            <Text style={styles.targetLabel}>Wybierz kategorię do opodatkowania</Text>
                            <View style={styles.categoryList}>
                              {TAX_CATEGORIES.map((cat) => {
                                const selected = selectedTaxCategory === cat.id;
                                const hasSelection = selectedTaxCategory !== null;
                                const dimmed = hasSelection && !selected;
                                const categoryColor =
                                  CATEGORY_COLORS[cat.id as keyof typeof CATEGORY_COLORS] ||
                                  '#6B7280';
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
                                      styles.categoryButton,
                                      {
                                        backgroundColor: categoryColor,
                                        opacity: !canAbilityInteract ? 0.4 : dimmed ? 0.45 : 1,
                                        borderWidth: selected ? 3 : 0,
                                        borderColor: selected ? '#60A5FA' : 'transparent',
                                      },
                                    ]}
                                  >
                                    <Text style={styles.targetButtonText}>{cat.label}</Text>
                                  </Pressable>
                                );
                              })}
                            </View>
                          </>
                        )}

                        {me?.profession === 'thief' && (
                          <View style={styles.targetSelector}>
                            <Text style={styles.targetLabel}>Co ukraść?</Text>
                            <View style={styles.targetList}>
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
                                      styles.targetButton,
                                      selected && styles.targetButtonSelected,
                                    ]}
                                  >
                                    <Text style={styles.targetButtonText}>
                                      {t === 'gold' ? 'Złoto' : 'Kartę'}
                                    </Text>
                                  </Pressable>
                                );
                              })}
                            </View>
                          </View>
                        )}

                        <View style={styles.professionAbilityButtonRow}>
                          <Button
                            variant="primary"
                            onPress={handleConfirmProfessionAbility}
                            disabled={!canConfirmProfessionAbility || localAbilitySubmitted}
                            style={styles.professionAbilityButton}
                          >
                            Zatwierdź operację zdolności
                          </Button>
                        </View>
                      </>
                    ) : (
                      <Text style={styles.autoStepText}>Zdolność: auto</Text>
                    )}

                    {professionRequiresChoice && serverAbilityConfirmed && (
                      <Text style={styles.stepConfirmedText}>✓ Zdolność potwierdzona</Text>
                    )}
                  </Card>
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
    urbanist: 'Urbanista – budynek o najniższej wartości +1 (lub pierwszy wybudowany w rundzie, jeśli nie masz budynków)',
    vandal: 'Wandal – niszczy wartość budynku przeciwnika o 2',
    thief: 'Złodziej – kradnie 2 złotki lub losową kartę budynku z ręki przeciwnika',
    saboteur: 'Sabotażysta – blokuje zdolność przeciwnika',
    spy: 'Szpieg – podgląda rękę innego gracza',
    politician: 'Polityk – nakłada podatek na wybraną kategorię: zyskuje +1 złotko za każdy budynek wybudowany w niej przez innych graczy w tej rundzie',
    diplomat: 'Dyplomata – nie może być celem negatywnych działań w tej rundzie (sam nie atakuje)',
    inspector: 'Inspektor – wskazuje gracza, którego budynki zostaną wybudowane dopiero w kolejnej rundzie',
  };
  return descriptions[profession] || 'Brak opisu';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    backgroundColor: '#1F2937',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  timerLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    marginRight: 6,
  },
  timerText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  timerTextWarning: {
    color: '#EF4444',
  },
  resourceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    gap: 24,
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLabel: {
    color: '#9CA3AF',
    marginRight: 8,
  },
  cardWithCost: {
    alignItems: 'center',
  },
  cardCostText: {
    color: '#D1D5DB',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  cardCostTextUnaffordable: {
    color: '#EF4444',
  },
  buildCostInfo: {
    color: '#FBBF24',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  goldText: {
    color: '#FBBF24',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 16,
  },
  professionText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  playersList: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  playerCard: {
    marginBottom: 12,
  },
  handPanel: {
    backgroundColor: '#1F2937',
    borderTopWidth: 1,
    borderTopColor: '#374151',
    height: 128,
  },
  handPanelExpanded: {
    height: '66%',
  },
  handToggle: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  handToggleDisabled: {
    opacity: 0.6,
  },
  handToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  handToggleText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  handToggleIcon: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  handContent: {
    flex: 1,
    padding: 16,
  },
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  columns: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  leftColumn: {
    flex: 2,
  },
  rightColumn: {
    flex: 1,
  },
  professionCard: {
    marginBottom: 16,
  },
  professionTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 8,
  },
  professionDescription: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 12,
  },
  targetSelector: {
    marginBottom: 12,
  },
  targetLabel: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 8,
  },
  targetList: {
    flexDirection: 'row',
  },
  categoryList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 0,
    marginBottom: 0,
  },
  targetButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#374151',
    marginRight: 8,
  },
  targetButtonSelected: {
    backgroundColor: '#2563EB',
  },
  targetButtonDisabled: {
    opacity: 0.4,
  },
  targetButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  skipAbilityButton: {
    backgroundColor: '#6B7280',
    borderWidth: 1,
    borderColor: '#9CA3AF',
  },
  professionButton: {
    marginTop: 8,
  },
  actionsSection: {
    marginBottom: 16,
  },
  actionsTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 8,
  },
  actionsCard: {
    marginTop: 8,
  },
  actionItem: {
    marginBottom: 8,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  buildButton: {
    flex: 1,
  },
  skipButton: {
    flex: 1,
  },
  stepConfirmedText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  autoStepText: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 8,
  },
  professionAbilityButtonRow: {
    marginTop: 12,
  },
  professionAbilityButton: {
    width: '100%',
  },
  submitButton: {
    width: '100%',
  },
});
