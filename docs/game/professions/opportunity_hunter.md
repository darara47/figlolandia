# Łowca okazji (`opportunity_hunter`)

**Kategoria:** Ekonomia  
**Status:** ⚪ do weryfikacji manualnej

## Zdolność

**Pasywna:** każda budowa w rundzie kosztuje o **2 złota mniej** (minimum 0). Wartość budynku pozostaje bez zmian.

## Aktywacja

Nie wymaga osobnej akcji zdolności — efekt stosuje się automatycznie przy budowie.

## Przykład

Budynek o wartości 4 kosztuje 2 złota zamiast 4.

## Odłożone budowy (Inspektor)

Rabat liczy się według zawodu z **rundy planowania**, nie z rundy wykonania. Przy opóźnieniu budowy zapisywane jest `plannedProfession` na akcji `build`.

## Implementacja

- `RoundEngine.resolveBuildings()` — obniżenie `cost` gdy `plannedProfession ?? profession === 'opportunity_hunter'`
- W PREP: dodatkowy efekt przy losowaniu zdarzeń (`narrative.service.ts`)
