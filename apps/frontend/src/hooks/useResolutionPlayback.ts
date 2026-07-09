import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PlayerDto } from '@/src/types/api';
import { NarrativeEvent } from '@/types/websocket';
import { BUILDING_DATA } from '@figlolandia/game-core';

type AnimationSpeed = 'full' | 'fast' | 'off';

interface UseResolutionPlaybackOptions {
  players: PlayerDto[];
  narrativeEvents: NarrativeEvent[];
  animationSpeed: AnimationSpeed;
  localSkipVoted: boolean;
  phase: string;
  active: boolean;
}

export interface PlayerTurn {
  playerId: string;
  events: NarrativeEvent[];
}

const isBuildEvent = (event: NarrativeEvent) =>
  event.type === 'build' || event.type === 'architect_change_category';

const turnDurationMs = (speed: AnimationSpeed, fastMultiplier: number): number => {
  const base = speed === 'full' ? 3500 : speed === 'fast' ? 1000 : 400;
  return Math.max(200, base / fastMultiplier);
};

const applyEventToPlayer = (player: PlayerDto, event: NarrativeEvent): PlayerDto => {
  if (isBuildEvent(event)) {
    const buildingType = event.data?.buildingType as string | undefined;
    if (!buildingType) return player;
    const buildingData = BUILDING_DATA[buildingType as keyof typeof BUILDING_DATA];
    const newBuilding = {
      id: (event.data?.buildingId as string) ?? `${player.id}-${buildingType}-${Date.now()}`,
      type: buildingType,
      category: (event.data?.newCategory ?? buildingData?.category ?? 'education') as string,
      value: (event.data?.cost as number) ?? buildingData?.valueRange?.[0] ?? 1,
    };
    return {
      ...player,
      gold: Math.max(0, player.gold - ((event.data?.cost as number) ?? 0)),
      buildings: [...player.buildings, newBuilding],
      cards: event.data?.cardId
        ? player.cards.filter((c) => c.id !== event.data?.cardId)
        : player.cards,
    };
  }

  if (event.type === 'lucky') {
    const gained = (event.data?.goldGained as number) ?? 2;
    return { ...player, gold: player.gold + gained };
  }

  return player;
};

const applyEvents = (players: PlayerDto[], events: NarrativeEvent[]): PlayerDto[] =>
  events.reduce(
    (acc, event) =>
      acc.map((p) => (p.id === event.playerId ? applyEventToPlayer(p, event) : p)),
    players,
  );

const collectBuildHighlights = (
  events: NarrativeEvent[],
  prev: Record<string, string[]>,
): Record<string, string[]> => {
  const next = { ...prev };
  for (const event of events) {
    if (!isBuildEvent(event)) continue;
    const buildingId = event.data?.buildingId as string | undefined;
    if (!buildingId) continue;
    next[event.playerId] = [...(next[event.playerId] ?? []), buildingId];
  }
  return next;
};

export const useResolutionPlayback = ({
  players,
  narrativeEvents,
  animationSpeed,
  localSkipVoted,
  phase,
  active,
}: UseResolutionPlaybackOptions) => {
  const [displayPlayers, setDisplayPlayers] = useState<PlayerDto[]>(players);
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [currentEvent, setCurrentEvent] = useState<NarrativeEvent | null>(null);
  const [turnIndex, setTurnIndex] = useState(0);
  const [highlightNewByPlayer, setHighlightNewByPlayer] = useState<Record<string, string[]>>({});
  const [shakeTargetId, setShakeTargetId] = useState<string | null>(null);
  const [shieldPlayerId, setShieldPlayerId] = useState<string | null>(null);
  const [flashTargetId, setFlashTargetId] = useState<string | null>(null);
  const [playbackComplete, setPlaybackComplete] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buildTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playersRef = useRef(players);

  const playerTurns: PlayerTurn[] = useMemo(() => {
    const sorted = [...players].sort((a, b) => a.order - b.order);
    const idsWithEvents = new Set(narrativeEvents.map((e) => e.playerId));
    return sorted
      .filter((p) => idsWithEvents.has(p.id))
      .map((p) => ({
        playerId: p.id,
        events: narrativeEvents.filter((e) => e.playerId === p.id),
      }));
  }, [players, narrativeEvents]);

  const speedMultiplier = localSkipVoted ? 2 : 1;

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (buildTimerRef.current) {
      clearTimeout(buildTimerRef.current);
      buildTimerRef.current = null;
    }
  }, []);

  const finishPlayback = useCallback(() => {
    clearTimers();
    setActivePlayerId(null);
    setCurrentEvent(null);
    setPlaybackComplete(true);
  }, [clearTimers]);

  const triggerInteractionEffects = (events: NarrativeEvent[]) => {
    for (const event of events) {
      if (event.type === 'vandal') {
        setFlashTargetId(event.data?.targetId as string);
        setTimeout(() => setFlashTargetId(null), 400);
      }
      if (event.type === 'diplomat') {
        setShieldPlayerId(event.playerId);
        setTimeout(() => setShieldPlayerId(null), 800);
      }
      const targetId = event.data?.targetId as string | undefined;
      if (
        targetId &&
        (event.type === 'theft' || event.type === 'saboteur' || event.type === 'spy')
      ) {
        setShakeTargetId(targetId);
        setTimeout(() => setShakeTargetId(null), 500);
      }
    }
  };

  useEffect(() => {
    if (!active || phase !== 'RESOLUTION') {
      if (phase !== 'RESOLUTION') {
        finishPlayback();
      }
      return;
    }

    playersRef.current = players;
    setDisplayPlayers(players);
    setTurnIndex(0);
    setPlaybackComplete(false);
    setHighlightNewByPlayer({});
    setShakeTargetId(null);
    setShieldPlayerId(null);
    setFlashTargetId(null);
  }, [active, phase, players, narrativeEvents, finishPlayback]);

  useEffect(() => {
    if (!active || phase !== 'RESOLUTION' || playbackComplete) {
      return;
    }

    if (animationSpeed === 'off') {
      setCurrentEvent(null);
      setActivePlayerId(null);
      const nextPlayers = applyEvents(playersRef.current, narrativeEvents);
      playersRef.current = nextPlayers;
      setDisplayPlayers(nextPlayers);
      setHighlightNewByPlayer(collectBuildHighlights(narrativeEvents, {}));
      timerRef.current = setTimeout(() => finishPlayback(), 600);
      return () => clearTimers();
    }

    if (turnIndex >= playerTurns.length) {
      finishPlayback();
      return;
    }

    const turn = playerTurns[turnIndex];
    const duration = turnDurationMs(animationSpeed, speedMultiplier);
    const buildEvents = turn.events.filter(isBuildEvent);
    const otherEvents = turn.events.filter((e) => !isBuildEvent(e));
    const buildRevealAt = buildEvents.length > 0 ? Math.round(duration * 0.42) : null;

    setActivePlayerId(turn.playerId);
    setCurrentEvent(turn.events[0] ?? null);

    if (buildRevealAt !== null) {
      buildTimerRef.current = setTimeout(() => {
        const updated = applyEvents(playersRef.current, buildEvents);
        playersRef.current = updated;
        setDisplayPlayers(updated);
        setHighlightNewByPlayer((prev) => collectBuildHighlights(buildEvents, prev));
      }, buildRevealAt);
    }

    timerRef.current = setTimeout(() => {
      if (buildEvents.length > 0 && otherEvents.length > 0) {
        const updated = applyEvents(playersRef.current, otherEvents);
        playersRef.current = updated;
        setDisplayPlayers(updated);
        triggerInteractionEffects(otherEvents);
      } else if (buildEvents.length === 0) {
        const updated = applyEvents(playersRef.current, turn.events);
        playersRef.current = updated;
        setDisplayPlayers(updated);
        setHighlightNewByPlayer((prev) => collectBuildHighlights(turn.events, prev));
        triggerInteractionEffects(turn.events);
      }

      setTurnIndex((i) => i + 1);
    }, duration);

    return () => clearTimers();
  }, [
    active,
    phase,
    playbackComplete,
    turnIndex,
    playerTurns,
    animationSpeed,
    speedMultiplier,
    narrativeEvents,
    finishPlayback,
    clearTimers,
  ]);

  useEffect(() => {
    if (phase !== 'RESOLUTION' && phase !== 'PREP' && phase !== 'END') return;
    if (phase !== 'RESOLUTION') {
      setDisplayPlayers(players);
    }
  }, [phase, players]);

  return {
    displayPlayers,
    activePlayerId,
    currentEvent,
    playerTurns,
    highlightNewByPlayer,
    shakeTargetId,
    shieldPlayerId,
    flashTargetId,
    playbackComplete,
    useSpotlight: animationSpeed === 'full',
    finishPlayback,
  };
};
