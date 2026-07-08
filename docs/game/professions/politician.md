# Polityk (`politician`)

**Kategoria:** Władza / Obrona  
**Status:** ⚪ do weryfikacji manualnej

## Zdolność

Wybiera **kategorię budynków** (`taxedCategory`). Za każdy budynek **innego gracza** wybudowany w tej kategorii w bieżącej rundzie Polityk otrzymuje **+1 złoto**.

## Aktywacja

W PLANNING: `use_profession` + `taxedCategory` (bez celu-gracza).

## Kolejność

Polityk jest rozstrzygany **jako pierwszy** w `applyProfessionAbilities`, aby kategoria była znana przed fazą budowy.

## Implementacja

- `applyProfessionAbilities()` — ustawienie `state.taxedCategory`
- `resolveBuildings()` — naliczanie złota przy każdej kwalifikującej się budowie
