# Architekt (`architect`)

**Kategoria:** Budowa  
**Status:** 🔴 [bug, ukryty z losowania](../../development/known-issues.md#architekt-architect)

## Zdolność

Po wybudowaniu budynku może **zmienić jego kategorię** na wybraną przez gracza.

## Aktywacja

W PLANNING: budowa + zdolność zawodowa z polem `buildingCategory` (i powiązanym `buildingType`).

## Uwagi

- Tymczasowo wyłączony z losowania (`HIDDEN_PROFESSIONS`)
- UI nie pozwala obecnie na wybór kategorii — wymaga dopracowania

## Implementacja

- `RoundEngine.resolveBuildings()` — blok `architect` po budowie
- UI: `apps/frontend/app/game/planning.tsx`
