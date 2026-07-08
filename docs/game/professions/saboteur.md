# Sabotażysta (`saboteur`)

**Kategoria:** Interakcja  
**Status:** ✅ Działa poprawnie

## Zdolność

Wskazuje gracza i **blokuje jego zdolność zawodową** w bieżącej rundzie.

## Priorytet (docelowy)

**Drugi** po Dyplomacie — powinien móc zablokować m.in. Inspektora, zanim ten zadziała.

## Aktywacja

W PLANNING: `use_profession` + `target`.

## Interakcje

- Nie działa na graczy chronionych przez Dyplomatę
- Ustawia `target.professionAbilityUsed = true`

## Implementacja

- `RoundEngine.applyProfessionAbilities()` — po Dyplomacie, przed Inspektorem i pozostałymi zdolnościami
