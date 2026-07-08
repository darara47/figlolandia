# WebSocket

Komunikacja między aplikacją mobilną (Expo) a backendem (NestJS) odbywa się przez Socket.IO.

Typy: `apps/backend/src/websocket/ws.types.ts`  
Gateway: `apps/backend/src/game/game.gateway.ts`

## Eventy klient → serwer

| Event | Payload | Opis |
|-------|---------|------|
| `JOIN_GAME` | `JoinGamePayload` | Dołączenie do gry (PIN lub gameId + nick) |
| `SUBMIT_ACTIONS` | `SubmitActionsPayload` | Wysłanie akcji (legacy / zbiorcze) |
| `CONFIRM_BUILD` | `ConfirmBuildPayload` | Zatwierdzenie wyboru budowy w PLANNING |
| `CONFIRM_ABILITY` | `ConfirmAbilityPayload` | Zatwierdzenie zdolności zawodowej w PLANNING |

### CONFIRM_BUILD

```typescript
{
  gameId: string;
  passBuild?: boolean;
  actions: Array<{
    type: 'build';
    cardId?: string;
    buildingType: string;
    buildingValue: number;
  }>;
}
```

### CONFIRM_ABILITY

```typescript
{
  gameId: string;
  abilityAction:
    | { type: 'use_profession'; professionAbility: true; target?: string; /* ... */ }
    | { type: 'use_profession'; professionAbility: false };
}
```

Pola zdolności zawodowych: `theftTarget`, `taxedCategory`, `buildingCategory`, `increasedValueBuildingId`, itd.

## Eventy serwer → klient

| Event | Payload | Opis |
|-------|---------|------|
| `GAME_STATE_UPDATE` | `GameStateUpdatePayload` | Pełny stan gry |
| `PHASE_CHANGE` | `PhaseChangePayload` | Zmiana fazy lub numeru rundy |
| `ERROR` | `ErrorPayload` | Błąd (message, opcjonalnie code) |

### GAME_STATE_UPDATE

Zawiera m.in.:

- `phase`, `round`, `players` (złoto, budynki, karty, zawód)
- `planningStatus` — kto zatwierdził budowę / zdolność
- `narrativeEvents` — wydarzenia dla narratora
- `config` — maxRounds, victoryThreshold, eventFrequency

## Fazy w payloadzie

Wartości `phase` odpowiadają typowi `GamePhase`:

`LOBBY` · `PREP` · `PLANNING` · `RESOLUTION` · `END`

## Narrator

`narrativeEvents` to tablica zdarzeń tłumaczonych na tekst po stronie frontendu (`apps/frontend/src/utils/narrative.ts`). Typy m.in.: `build`, `theft`, `vandal`, `sabotage`, `spy`, `inspector`, `politician`, `architect`, `profession_ability`.

## Konfiguracja połączenia

Frontend łączy się z backendem przez zmienne `EXPO_PUBLIC_BACKEND_IP` i `EXPO_PUBLIC_BACKEND_PORT` (domyślnie port 3008). Szczegóły w głównym [README](../../README.md).
