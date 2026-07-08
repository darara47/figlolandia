# Zawody

Co rundę każdy gracz losuje **inny zawód** (bez powtórzenia z poprzedniej rundy, jeśli to możliwe). W jednej rundzie nie ma dwóch graczy z tym samym zawodem.

Zawody tymczasowo **wyłączone z losowania**: `architect`, `spy` (`HIDDEN_PROFESSIONS` w game-core).

## Tabela zawodów

| Zawód | ID | Kategoria | Zdolność | Status |
|-------|-----|-----------|----------|--------|
| [Szczęściarz](lucky.md) | `lucky` | Ekonomia | +2 złota na start rozstrzygania | ✅ działa |
| [Łowca okazji](opportunity_hunter.md) | `opportunity_hunter` | Ekonomia | Budowa tańsza o 2 złota | ⚪ do weryfikacji |
| [Inwestor](investor.md) | `investor` | Ekonomia | +1 karta w fazie PREP | ✅ działa |
| [Księgowy](accountant.md) | `accountant` | Ekonomia | +2 złota na koniec rundy, jeśli < 2 | ⚪ do weryfikacji |
| [Budowlaniec](builder.md) | `builder` | Budowa | Może wybudować 2 budynki w rundzie | ✅ działa |
| [Architekt](architect.md) | `architect` | Budowa | Zmiana kategorii wybudowanego budynku | 🔴 bug, ukryty |
| [Urbanista](urbanist.md) | `urbanist` | Budowa | Zwiększa wartość budynku | ✅ działa |
| [Wandal](vandal.md) | `vandal` | Interakcja | −2 wartości najcenniejszego budynku celu | ✅ działa |
| [Złodziej](thief.md) | `thief` | Interakcja | Kradzież 2 złota lub karty | ✅ działa |
| [Sabotażysta](saboteur.md) | `saboteur` | Interakcja | Blokuje zdolność zawodową celu | ✅ działa |
| [Szpieg](spy.md) | `spy` | Interakcja | Podgląd ręki celu | 🔴 bug, ukryty |
| [Polityk](politician.md) | `politician` | Władza / Obrona | Podatek od kategorii budynków | ⚪ do weryfikacji |
| [Dyplomata](diplomat.md) | `diplomat` | Władza / Obrona | Ochrona przed negatywnymi efektami | ✅ działa |
| [Inspektor](inspector.md) | `inspector` | Władza / Obrona | Opóźnia budowę celu | ✅ działa |

Legenda: ✅ działa · 🔴 znany bug · ⚪ brak wpisu w notatkach testowych

Szczegóły bugów: [Znane problemy](../development/known-issues.md).

## Kategorie zawodów

### Ekonomia

Zawody wpływające na złoto, koszt budowy i karty.

### Budowa

Zawody modyfikujące liczbę budynków, ich wartość lub kategorię.

### Interakcja

Zawody atakujące lub sabotujące innych graczy.

### Władza / Obrona

Zawody kontrolujące podatki, ochronę i opóźnienia.

## Wspólne zasady

- Zdolność zawodowa aktywuje się akcją `use_profession` w fazie PLANNING (chyba że efekt jest pasywny, np. Łowca okazji, Budowlaniec).
- Każdy gracz może użyć zdolności **raz na rundę** (`professionAbilityUsed`).
- Gracz chroniony przez Dyplomatę (`protected`) jest odporny na negatywne efekty innych zawodów.
- Sabotażysta może zablokować zdolność zawodową celu przed jej rozstrzygnięciem.

## Szablon opisu

Każdy plik zawodu zawiera: zdolność, wymagania UI, interakcje z innymi zawodami oraz odnośnik do kodu.
