# Urbanista (`urbanist`)

**Kategoria:** Budowa  
**Status:** ✅ Działa poprawnie

## Zdolność

- **Ma budynki:** zwiększa wartość budynku o **najniższej wartości** o +1 (max 5).
- **Brak budynków:** efekt czeka i dodaje +1 do wartości **pierwszego wybudowanego** budynku w tej rundzie.

## Aktywacja

W PLANNING: zdolność auto-potwierdzana (`use_profession` wstrzykiwane przy RESOLUTION).

## Implementacja

- `RoundEngine.applyProfessionAbilities()` → `case 'urbanist'`
- `RoundEngine.executeBuildActions()` — `urbanistPendingBuildBoost` przy budowie
