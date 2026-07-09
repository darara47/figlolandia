import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PlayerDto } from '@/src/types/api';
import { NarrativeEvent } from '@/types/websocket';
import { BUILDING_DATA, getResolutionTurnDurationMs, RESOLUTION_BUILD_AT, RESOLUTION_PROFESSION_AT, RESOLUTION_TURN_GAP_MS } from '@figlolandia/game-core';
import { GoldFloatItem } from '@/src/components/design-system/GoldFloatLabel';
import { getGoldDeltaForEvent } from '@/src/utils/goldDelta';

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

const BUILD_AT = RESOLUTION_BUILD_AT;
const PROFESSION_AT = RESOLUTION_PROFESSION_AT;

const isBuildEvent = (event: NarrativeEvent) => event.type === 'build';

const turnDurationMs = (speed: AnimationSpeed, fastMultiplier: number): number =>
  getResolutionTurnDurationMs(speed, fastMultiplier);

const segmentTurnEvents = (events: NarrativeEvent[]) => {
  const pureBuilds = events.filter(isBuildEvent);
  const otherEvents = events.filter((e) => !isBuildEvent(e));
  return {
    initialBuilds: pureBuilds.slice(0, 1),
    professionBuilds: pureBuilds.slice(1),
    otherEvents,
  };
};

const applyEventToPlayer = (player: PlayerDto, event: NarrativeEvent): PlayerDto => {
  if (event.type === 'build') {
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

  if (event.type === 'architect_change_category') {
    const buildingType = event.data?.buildingType as string | undefined;
    const newCategory = event.data?.newCategory as string | undefined;
    if (!buildingType || !newCategory) return player;
    return {
      ...player,
      buildings: player.buildings.map((b) =>
        b.type === buildingType ? { ...b, category: newCategory } : b,
      ),
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
  const [goldFloats, setGoldFloats] = useState<GoldFloatItem[]>([]);
  const [shakeTargetId, setShakeTargetId] = useState<string | null>(null);
  const [shieldPlayerId, setShieldPlayerId] = useState<string | null>(null);
  const [flashTargetId, setFlashTargetId] = useState<string | null>(null);
  const [playbackComplete, setPlaybackComplete] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
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
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay);
    timersRef.current.push(id);
  }, []);

  const removeGoldFloat = useCallback((id: string) => {
    setGoldFloats((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const emitGoldFloats = useCallback((playerId: string, events: NarrativeEvent[]) => {
    for (const event of events) {
      const delta = getGoldDeltaForEvent(event);
      if (delta === null || delta === 0) continue;
      const floatId = `${playerId}-${event.timestamp}-${event.type}-${delta}`;
      setGoldFloats((prev) => {
        if (prev.some((f) => f.id === floatId)) return prev;
        return [...prev, { id: floatId, playerId, amount: delta }];
      });
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

  const applyEventBatch = useCallback(
    (events: NarrativeEvent[], options?: { highlightBuilds?: boolean }) => {
      if (events.length === 0) return;
      const updated = applyEvents(playersRef.current, events);
      playersRef.current = updated;
      setDisplayPlayers(updated);
      if (options?.highlightBuilds) {
        setHighlightNewByPlayer((prev) => collectBuildHighlights(events, prev));
      }
      emitGoldFloats(events[0].playerId, events);
    },
    [emitGoldFloats],
  );

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
    setGoldFloats([]);
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
      for (const event of narrativeEvents) {
        const delta = getGoldDeltaForEvent(event);
        if (delta !== null && delta !== 0) {
          setGoldFloats((prev) => [
            ...prev,
            { id: `${event.playerId}-${event.timestamp}`, playerId: event.playerId, amount: delta },
          ]);
        }
      }
      schedule(() => finishPlayback(), 600);
      return () => clearTimers();
    }

    if (turnIndex >= playerTurns.length) {
      finishPlayback();
      return;
    }

    const turn = playerTurns[turnIndex];
    const duration = turnDurationMs(animationSpeed, speedMultiplier);
    const { initialBuilds, professionBuilds, otherEvents } = segmentTurnEvents(turn.events);

    setActivePlayerId(turn.playerId);
    setCurrentEvent(initialBuilds[0] ?? otherEvents[0] ?? turn.events[0] ?? null);

    if (initialBuilds.length > 0) {
      schedule(() => {
        applyEventBatch(initialBuilds, { highlightBuilds: true });
        setCurrentEvent(initialBuilds[0]);
      }, Math.round(duration * BUILD_AT));
    }

    if (professionBuilds.length > 0) {
      schedule(() => {
        applyEventBatch(professionBuilds, { highlightBuilds: true });
        setCurrentEvent(professionBuilds[0]);
      }, Math.round(duration * PROFESSION_AT));
    } else if (otherEvents.length > 0) {
      schedule(() => {
        setCurrentEvent(otherEvents[0]);
      }, Math.round(duration * PROFESSION_AT));
    }

    schedule(() => {
      if (otherEvents.length > 0) {
        applyEventBatch(otherEvents);
        triggerInteractionEffects(otherEvents);
      } else if (initialBuilds.length === 0 && professionBuilds.length === 0) {
        applyEventBatch(turn.events, { highlightBuilds: true });
        triggerInteractionEffects(turn.events);
      }

      schedule(() => {
        setTurnIndex((i) => i + 1);
      }, RESOLUTION_TURN_GAP_MS);
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
    schedule,
    applyEventBatch,
  ]);

  useEffect(() => {
    if (phase !== 'RESOLUTION' && phase !== 'PREP' && phase !== 'END') return;
    if (phase !== 'RESOLUTION') {
      setDisplayPlayers(players);
    }
  }, [phase, players]);

  const goldFloatsByPlayer = useMemo(() => {
    const map: Record<string, GoldFloatItem[]> = {};
    for (const f of goldFloats) {
      if (!map[f.playerId]) map[f.playerId] = [];
      map[f.playerId].push(f);
    }
    return map;
  }, [goldFloats]);

  return {
    displayPlayers,
    activePlayerId,
    currentEvent,
    playerTurns,
    highlightNewByPlayer,
    goldFloatsByPlayer,
    removeGoldFloat,
    shakeTargetId,
    shieldPlayerId,
    flashTargetId,
    playbackComplete,
    useSpotlight: animationSpeed === 'full',
    finishPlayback,
  };
};
