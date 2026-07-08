# Budynki

Każdy budynek należy do **kategorii**, ma **typ** i **wartość** (1–5). Wartość budynku równa się kosztowi budowy (chyba że zawód obniża koszt lub modyfikuje wartość).

Definicje: `BUILDING_DATA` w `packages/game-core/src/index.ts`.

## Kategorie

| Kategoria | ID | Kolor UI |
|-----------|-----|----------|
| Edukacja | `education` | niebieski |
| Zdrowie | `health` | czerwony |
| Finanse | `finance` | bursztynowy |
| Administracja | `administration` | fioletowy |
| Rozrywka | `entertainment` | zielony |

Kategorie mają znaczenie dla zawodu **Polityk** (podatek od wybranej kategorii) i **Architekt** (zmiana kategorii budynku).

## Typy budynków

### Edukacja (`education`)

| Typ | ID | Nazwa | Zakres wartości |
|-----|-----|-------|-----------------|
| Żłobek | `nursery` | Żłobek | 2–3 |
| Przedszkole | `kindergarten` | Przedszkole | 1–3 |
| Szkoła | `school` | Szkoła | 1–2 |
| Technikum | `technical_school` | Technikum | 2–4 |
| Liceum | `high_school` | Liceum | 2–4 |
| Uniwersytet | `university` | Uniwersytet | 4–5 |

### Zdrowie (`health`)

| Typ | ID | Nazwa | Zakres wartości |
|-----|-----|-------|-----------------|
| Apteka | `pharmacy` | Apteka | 1–3 |
| Przychodnia | `clinic` | Przychodnia | 2–3 |
| Dom opieki | `nursing_home` | Dom opieki | 2–4 |
| Klinika | `medical_clinic` | Klinika | 4–5 |
| Szpital | `hospital` | Szpital | 2–4 |
| Cmentarz | `cemetery` | Cmentarz | 1–2 |

### Finanse (`finance`)

| Typ | ID | Nazwa | Zakres wartości |
|-----|-----|-------|-----------------|
| Kantor | `exchange_office` | Kantor | 1–2 |
| Dom aukcyjny | `auction_house` | Dom aukcyjny | 1–3 |
| Bank | `bank` | Bank | 2–4 |
| Giełda | `stock_exchange` | Giełda | 3–5 |
| Mennica | `mint` | Mennica | 4–5 |

### Administracja (`administration`)

| Typ | ID | Nazwa | Zakres wartości |
|-----|-----|-------|-----------------|
| Archiwum miejskie | `city_archive` | Archiwum miejskie | 1–2 |
| Komisariat | `police_station` | Komisariat | 2–3 |
| Urząd miasta | `city_hall` | Urząd miasta | 2–4 |
| Sąd | `court` | Sąd | 3–4 |
| Ratusz | `town_hall` | Ratusz | 3–5 |

### Rozrywka (`entertainment`)

| Typ | ID | Nazwa | Zakres wartości |
|-----|-----|-------|-----------------|
| Bar | `bar` | Bar | 1–2 |
| Park | `park` | Park | 1–3 |
| Kino | `cinema` | Kino | 2–3 |
| Teatr | `theater` | Teatr | 3–4 |
| Stadion | `stadium` | Stadion | 4–5 |

## Karty budynków

Gracz buduje z **kart** w ręce. Każda karta ma:

- `buildingType` — typ budynku
- `buildingCategory` — kategoria
- `buildingValue` — konkretna wartość (1–5) przypisana do tej karty

Przy pierwszych trzech kartach w grze stosowane są reguły różnorodności (unikalne typy, min. 2 kategorie) — logika w `game.service.ts`.

## Modyfikatory wartości

| Źródło | Efekt |
|--------|-------|
| Wandal | −2 wartości najcenniejszego budynku celu |
| Urbanista | +1 wartości budynku przy budowie (docelowo: budynek o najniższej wartości — patrz znane problemy) |
| Łowca okazji | Obniża **koszt** budowy o 2, nie zmienia wartości budynku |
