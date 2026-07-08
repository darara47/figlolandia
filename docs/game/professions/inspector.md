# Inspektor (`inspector`)

**Kategoria:** Władza / Obrona  
**Status:** ✅ Działa poprawnie

## Zdolność

Wskazuje gracza — jego budynki zaplanowane na **tę rundę** są **opóźniane do następnej rundy** (kolejka `deferredBuildActions`).

## Aktywacja

W PLANNING: `use_profession` + `target`.

## Interakcje

- Blokowalny przez Sabotażystę (drugi priorytet)
- Respektuje ochronę Dyplomaty (najwyższy priorytet)

## Implementacja

- `RoundEngine.applyProfessionAbilities()` → `case 'inspector'`
- `RoundEngine.resolveBuildings()` — odkładanie i wykonywanie `deferredBuildActions`
