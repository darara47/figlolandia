# Wandal (`vandal`)

**Kategoria:** Interakcja  
**Status:** ✅ działa

## Zdolność

Wskazuje gracza i obniża wartość jego **najcenniejszego** budynku o **2** (minimum 0).

## Aktywacja

W PLANNING: `use_profession` + `target` (ID gracza).

## Interakcje

- Nie działa na graczy chronionych przez Dyplomatę
- Nie działa, gdy Sabotażysta zablokował zdolność Wandala w tej rundzie
- Cel musi mieć co najmniej jeden budynek

## Implementacja

- `RoundEngine.resolveDestruction()`
