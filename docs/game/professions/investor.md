# Inwestor (`investor`)

**Kategoria:** Ekonomia  
**Status:** ✅ działa

## Zdolność

W fazie **PREP** otrzymuje **+1 kartę budynku** (łącznie 2 karty zamiast 1).

## Aktywacja

Pasywna — nie wymaga akcji w PLANNING.

## Implementacja

- `game.service.ts` → `prepareRound()` — `cardsToDraw = player.profession === 'investor' ? 2 : 1`
