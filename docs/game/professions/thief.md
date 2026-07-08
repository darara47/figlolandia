# Złodziej (`thief`)

**Kategoria:** Interakcja  
**Status:** ✅ działa

## Zdolność

Wskazuje gracza i kradnie:

- **Złoto** — do 2 monet, lub
- **Kartę** — jedną kartę z ręki celu

## Aktywacja

W PLANNING: `use_profession` + `target` + `theftTarget` (`gold` | `card`).

## Interakcje

- Nie działa na graczy chronionych przez Dyplomatę
- Przy kradzieży karty cel musi mieć karty w ręce

## Implementacja

- `RoundEngine.resolveTheft()`
