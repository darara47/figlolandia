# Budowlaniec (`builder`)

**Kategoria:** Budowa  
**Status:** ✅ działa

## Zdolność

Może wybudować **2 budynki** w jednej rundzie (pozostali gracze: 1).

## Aktywacja

W PLANNING wysyła do dwóch akcji `build` (zatwierdzanych w `CONFIRM_BUILD`).

## Implementacja

- `RoundEngine.resolveBuildings()` — `maxBuildings = player.profession === 'builder' ? 2 : 1`
- Walidacja: `game.service.ts` → `validateActions`
