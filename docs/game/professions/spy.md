# Szpieg (`spy`)

**Kategoria:** Interakcja  
**Status:** 🔴 [bug, ukryty z losowania](../../development/known-issues.md#szpieg-spy)

## Zdolność

**Podgląda rękę** wskazanego gracza (kopie jego karty do `spiedHands` w stanie gry).

## Aktywacja

W PLANNING: `use_profession` + `target`.

## Interakcje

- Nie działa, jeśli cel jest chroniony przez Dyplomatę
- Podgląd jest tymczasowy — wymaga obsługi w UI

## Uwagi

- Tymczasowo wyłączony z losowania (`HIDDEN_PROFESSIONS`)
- Frontend musi wyświetlić `spiedHands` dla gracza-szpiega

## Implementacja

- `RoundEngine.applyProfessionAbilities()` → `case 'spy'`
- Stan: `GameState.spiedHands`
