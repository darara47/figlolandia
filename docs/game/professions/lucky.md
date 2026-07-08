# Szczęściarz (`lucky`)

**Kategoria:** Ekonomia  
**Status:** ✅ Działa poprawnie

## Zdolność

Na początku fazy rozstrzygania otrzymuje **+2 złota**.

## Aktywacja

Wymaga potwierdzenia zdolności w PLANNING (`use_profession`, bez celu).

## Interakcje

- Nie wymaga wyboru celu
- Może zostać zablokowany przez Sabotażystę (jeśli blokada zadziała przed rozstrzygnięciem)

## Implementacja

- `RoundEngine.applyProfessionAbilities()` → `case 'lucky'`
- Narracja: `apps/frontend/src/utils/narrative.ts`
