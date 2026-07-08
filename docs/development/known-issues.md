# Znane problemy

Status implementacji zawodów i mechanik — na podstawie testów manualnych (`.notes/profession`) oraz analizy kodu.

Ostatnia aktualizacja: 2026-07-09.

## Działają poprawnie

| Zawód | ID |
|-------|-----|
| Wandal | `vandal` |
| Budowlaniec | `builder` |
| Inwestor | `investor` |
| Złodziej | `thief` |
| Szczęściarz | `lucky` |
| Inspektor | `inspector` |
| Dyplomata | `diplomat` |
| Urbanista | `urbanist` |
| Sabotażysta | `saboteur` |

## Wymagają naprawy

### Architekt (`architect`)

**Problem:** Brak możliwości wyboru w UI; zmiana kategorii nie działa.

**Status:** Tymczasowo wyłączony z losowania (`HIDDEN_PROFESSIONS`).

**Do ustalenia:** Docelowe zachowanie UI i reguły zmiany kategorii.

---

### Szpieg (`spy`)

**Problem:** Brak podglądu ręki celu w UI.

**Status:** Tymczasowo wyłączony z losowania (`HIDDEN_PROFESSIONS`).

**Do ustalenia:** Jak i kiedy gracz widzi podgląd (`spiedHands` w stanie gry).

## Priorytety rozstrzygania (zaimplementowane)

1. **Dyplomata** — ochrona przed negatywami
2. **Sabotażysta** — blokada zdolności zawodowej
3. Pozostałe efekty (Inspektor, Wandal, Złodziej, …)

## Zawody bez wpisu testowego

Nie zweryfikowano manualnie w `.notes/profession`:

- `opportunity_hunter` (Łowca okazji)
- `accountant` (Księgowy)
- `politician` (Polityk)

Logika istnieje w game-core; wymagają testów.
