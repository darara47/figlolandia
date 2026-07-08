# Przegląd gry

Figlolandia to gra wieloosobowa, w której gracze budują miasto, zdobywają złoto i używają zdolności zawodów, aby osiągnąć próg zwycięstwa przed przeciwnikami.

## Cel gry

Wygra gracz, który jako pierwszy osiągnie **próg zwycięstwa** — sumę złota i wartości budynków.

```
punkty = złoto + suma(wartość budynków)
```

Domyślna konfiguracja (można zmienić przy tworzeniu gry):

| Parametr | Domyślna wartość | Opis |
|----------|------------------|------|
| `victoryThreshold` | 50 | Próg punktów do wygranej |
| `maxRounds` | 10 | Maksymalna liczba rund |
| `eventFrequency` | 0.3 | Szansa na zdarzenie losowe w rundzie (0–1) |
| `minPlayers` / `maxPlayers` | zależy od konfiguracji | Limity graczy w sesji |

Jeśli po `maxRounds` rundach nikt nie osiągnie progu, wygrywa gracz z najwyższą sumą punktów.

## Fazy gry

```
LOBBY → PREP → PLANNING → RESOLUTION → (następna runda lub END)
```

### LOBBY

Gracze dołączają do sesji (PIN 6-cyfrowy lub ID gry). Host może rozpocząć grę po zebraniu wymaganej liczby graczy.

### PREP (przygotowanie rundy)

Na początku każdej rundy serwer:

1. **Losuje zawody** — każdy gracz dostaje inny zawód (bez powtórzenia z poprzedniej rundy, jeśli to możliwe). Zawody `architect` i `spy` są tymczasowo wyłączone z losowania.
2. **Rozdaje +2 złota** każdemu graczowi.
3. **Rozdaje karty budynków** — 1 kartę na gracza (Inwestor dostaje 2).
4. **Uruchamia zdarzenia losowe** — z prawdopodobieństwem `eventFrequency` losowy gracz może otrzymać 1–3 złota.

### PLANNING (planowanie)

Gracze jednocześnie wybierają akcje:

- **Budowa** — wybór karty i postawienie budynku (limit: 1 budynek, Budowlaniec: 2).
- **Zdolność zawodowa** — aktywacja efektu zawodu (wymaga wyboru celu u części zawodów).
- **Pass** — rezygnacja z budowy lub zdolności.

Gracz musi **zatwierdzić** wybór budowy i zdolności osobno. Runda przechodzi dalej, gdy wszyscy gracze zatwierdzą oba kroki.

### RESOLUTION (rozstrzyganie)

Serwer stosuje wszystkie akcje według ustalonej kolejności (patrz [Rozstrzyganie rundy](round-resolution.md)). Narrator opisuje wydarzenia w interfejsie.

### END

Gra kończy się po osiągnięciu progu zwycięstwa lub po wyczerpaniu `maxRounds`.

## Zasoby gracza

| Zasób | Opis |
|-------|------|
| **Złoto** | Waluta — płatność za budowę, źródło punktów |
| **Karty** | Ręka gracza; każda karta to potencjalny budynek do wybudowania |
| **Budynki** | Postawione obiekty z wartością 1–5; suma wartości liczy się do punktów |
| **Zawód** | Losowany co rundę; daje pasywną lub aktywną zdolność |

## Kolejność w rundzie

Każdy gracz ma pole `order` — kolejność rozstrzygania w fazie RESOLUTION. W fazie PLANNING wszyscy planują równolegle.

## Powiązane dokumenty

- [Rozstrzyganie rundy](round-resolution.md)
- [Budynki](buildings.md)
- [Zawody](professions/README.md)
