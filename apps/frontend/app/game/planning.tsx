import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Alert, StyleSheet } from 'react-native';
import { useGameStore } from '@/src/store/game.store';
import { useSocketStore } from '@/src/store/socket.store';
import { useLobbyStore } from '@/src/store/lobby.store';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { HandCard } from '@/src/components/cards/HandCard';
import { PlayerCard } from '@/src/components/player/PlayerCard';
import { PROFESSION_DATA } from '@figlolandia/game-core';
import { CardDto } from '@/src/types/api';

export default function PlanningScreen() {
  const { gameId, phase, round, players, me, pendingActions, submittedPlayers, planningPhaseStartTime, addAction, clearActions } = useGameStore();
  const { playerId } = useLobbyStore();
  const { submitActions } = useSocketStore();
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [handExpanded, setHandExpanded] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [professionAbilityUsed, setProfessionAbilityUsed] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(600000); // 10 minut w milisekundach

  const professionData = me?.profession
    ? PROFESSION_DATA[me.profession as keyof typeof PROFESSION_DATA]
    : null;

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
    const newSelected = new Set(selectedCards);
    if (newSelected.has(cardId)) {
      newSelected.delete(cardId);
    } else {
      newSelected.add(cardId);
    }
    setSelectedCards(newSelected);
  };

  const handleBuild = () => {
    if (selectedCards.size === 0) {
      Alert.alert('Błąd', 'Wybierz kartę do budowy');
      return;
    }

    selectedCards.forEach((cardId) => {
      const card = me?.cards.find((c: { id: string }) => c.id === cardId);
      if (card) {
        addAction({
          type: 'build',
          cardId,
          buildingType: card.buildingType,
          buildingValue: card.buildingValue,
        });
      }
    });

    setSelectedCards(new Set());
  };

  const handleUseProfession = () => {
    if (!me?.profession) return;

    addAction({
      type: 'use_profession',
      professionAbility: true,
      target: selectedTarget || undefined,
    });

    setProfessionAbilityUsed(true);
  };

  const handleSubmit = () => {
    if (!gameId || pendingActions.length === 0) {
      Alert.alert('Błąd', 'Dodaj przynajmniej jedną akcję');
      return;
    }

    // Sprawdź czy jesteśmy w fazie PLANNING
    if (phase !== 'PLANNING') {
      Alert.alert('Błąd', `Nie można wysłać akcji w fazie ${phase}. Poczekaj na fazę PLANNING.`);
      return;
    }

    submitActions({
      gameId,
      actions: pendingActions,
    });

    // Natychmiast oznacz siebie jako zatwierdzonego (zostanie zaktualizowane przez WebSocket)
    if (playerId) {
      const { submittedPlayers } = useGameStore.getState();
      useGameStore.setState({
        submittedPlayers: new Set([...submittedPlayers, playerId]),
      });
    }

    clearActions();
    setSelectedCards(new Set());
    setSelectedTarget(null);
    setProfessionAbilityUsed(false);
  };

  const otherPlayers = players.filter((p) => p.id !== playerId);

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
        {me && (
          <View style={styles.headerInfo}>
            <Text style={styles.headerLabel}>Złoto:</Text>
            <Text style={styles.goldText}>{me.gold}</Text>
            {professionData && (
              <>
                <Text style={styles.headerLabel}>Zawód:</Text>
                <Text style={styles.professionText}>{professionData.name}</Text>
              </>
            )}
          </View>
        )}
      </View>

      {/* Lista graczy */}
      <ScrollView style={styles.playersList}>
        <Text style={styles.sectionTitle}>Gracze</Text>
        {otherPlayers.map((player) => (
          <PlayerCard
            key={player.id}
            player={player}
            style={styles.playerCard}
            hasSubmitted={submittedPlayers.has(player.id)}
          />
        ))}
        {me && (
          <PlayerCard
            player={me}
            isMe={true}
            style={styles.playerCard}
            hasSubmitted={submittedPlayers.has(me.id)}
          />
        )}
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
            <View style={styles.cardsContainer}>
              {me?.cards.map((card: CardDto) => (
                <HandCard
                  key={card.id}
                  card={card}
                  selected={selectedCards.has(card.id)}
                  onPress={() => handleCardSelect(card.id)}
                />
              ))}
            </View>

            {/* Zawód i zdolność */}
            {professionData && (
              <Card style={styles.professionCard}>
                <Text style={styles.professionTitle}>
                  Zawód: {professionData.name}
                </Text>
                <Text style={styles.professionDescription}>
                  {getProfessionDescription(me?.profession || '')}
                </Text>
                {!professionAbilityUsed && needsTarget(me?.profession || '') && (
                  <View style={styles.targetSelector}>
                    <Text style={styles.targetLabel}>Wybierz cel:</Text>
                    <ScrollView horizontal style={styles.targetList}>
                      {otherPlayers.map((player) => (
                        <Pressable
                          key={player.id}
                          onPress={() => setSelectedTarget(player.id)}
                          style={[
                            styles.targetButton,
                            selectedTarget === player.id && styles.targetButtonSelected
                          ]}
                        >
                          <Text style={styles.targetButtonText}>{player.name}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
                {!professionAbilityUsed && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onPress={handleUseProfession}
                    disabled={needsTarget(me?.profession || '') && !selectedTarget}
                    style={styles.professionButton}
                  >
                    Użyj zdolności zawodowej
                  </Button>
                )}
              </Card>
            )}

            {/* Akcje */}
            <View style={styles.actionsSection}>
              <Text style={styles.actionsTitle}>Akcje ({pendingActions.length})</Text>
              {pendingActions.length > 0 && (
                <Card style={styles.actionsCard}>
                  {pendingActions.map((action, index) => (
                    <View key={index} style={styles.actionItem}>
                      <Text style={styles.actionText}>
                        {action.type === 'build' && `Budowa: ${action.buildingType}`}
                        {action.type === 'use_profession' && 'Użycie zdolności zawodowej'}
                        {action.type === 'pass' && 'Pominięcie'}
                      </Text>
                    </View>
                  ))}
                </Card>
              )}
            </View>

            {/* Przyciski akcji */}
            <View style={styles.actionButtons}>
              <Button
                variant="secondary"
                onPress={handleBuild}
                disabled={selectedCards.size === 0}
                style={styles.buildButton}
              >
                Buduj ({selectedCards.size})
              </Button>
            </View>

            <Button
              variant="primary"
              size="lg"
              onPress={handleSubmit}
              disabled={pendingActions.length === 0}
              style={styles.submitButton}
            >
              Zatwierdź ruch
            </Button>
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
    urbanist: 'Urbanista – wybiera budynek którego wartość zwiększa się o 1',
    vandal: 'Wandal – niszczy wartość budynku przeciwnika o 2',
    thief: 'Złodziej – kradnie 2 złotki lub losową kartę budynku z ręki przeciwnika',
    saboteur: 'Sabotażysta – blokuje zdolność przeciwnika',
    spy: 'Szpieg – podgląda rękę innego gracza',
    politician: 'Polityk – wybiera kategorię budynków, które w tej rundzie są tańsze o 1 złotko',
    diplomat: 'Dyplomata – nie może być celem negatywnych działań w tej rundzie (sam nie atakuje)',
    inspector: 'Inspektor – wskazuje gracza, którego budynki zostaną wybudowane dopiero w kolejnej rundzie',
  };
  return descriptions[profession] || 'Brak opisu';
}

function needsTarget(profession: string): boolean {
  return [
    'vandal',
    'thief',
    'saboteur',
    'spy',
    'inspector',
    'politician',
  ].includes(profession);
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
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  headerLabel: {
    color: '#9CA3AF',
    marginRight: 8,
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
  targetButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
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
  submitButton: {
    width: '100%',
  },
});
