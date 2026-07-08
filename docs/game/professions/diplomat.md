# Dyplomata (`diplomat`)

**Kategoria:** Władza / Obrona  
**Status:** ✅ Działa poprawnie

## Zdolność

Aktywuje **ochronę** (`protected = true`) — gracz nie może być celem negatywnych efektów innych zawodów (Wandal, Złodziej, Sabotażysta, Inspektor, Szpieg).

## Priorytet (docelowy)

**Najwyższy** — ochrona powinna mieć pierwszeństwo przed Sabotażystą i Inspektorem.

## Aktywacja

W PLANNING: `use_profession` (bez celu). Sam Dyplomata nie atakuje.

## Implementacja

- `RoundEngine.applyProfessionAbilities()` → `case 'diplomat'`
- Sprawdzenie `!target.protected` w sabotage, theft, destruction, spy, inspector
