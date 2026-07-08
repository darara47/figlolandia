# Dokumentacja Figlolandia

Dokumentacja reguł gry, mechanik i architektury aplikacji.

## Spis treści

### Reguły gry

- [Przegląd gry](game/overview.md) — fazy, zasoby, warunki zwycięstwa
- [Rozstrzyganie rundy](game/round-resolution.md) — kolejność efektów i priorytety
- [Budynki](game/buildings.md) — kategorie, typy i wartości
- [Zawody](game/professions/README.md) — wszystkie zawody i ich zdolności

### Architektura

- [WebSocket](architecture/websocket.md) — komunikacja klient–serwer

### Rozwój

- [Znane problemy](development/known-issues.md) — status implementacji zawodów i bugi

## Źródło prawdy

Logika gry jest zdefiniowana w pakiecie `@figlolandia/game-core`:

```
packages/game-core/src/index.ts
```

Przy zmianie reguł w kodzie aktualizuj odpowiednie pliki w `docs/`.
