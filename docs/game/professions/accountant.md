# Księgowy (`accountant`)

**Kategoria:** Ekonomia  
**Status:** ⚪ do weryfikacji manualnej

## Zdolność

Na **końcu rundy**, jeśli gracz ma mniej niż **2 złota**, otrzymuje **+2 złota**.

## Aktywacja

Pasywna — rozstrzygana po wszystkich budowach i efektach negatywnych.

## Implementacja

- `RoundEngine.applyEndOfRoundAbilities()` → `case 'accountant'`
