# Figlolandia — staging (WSL + PM2 + Cloudflare Tunnel)

Ręczne zarządzanie lokalnym środowiskiem stagingowym. Brak auto-deployu, brak auto-startu po restarcie systemu.

## Wymagania

- WSL2 Ubuntu
- Node.js + [pnpm](https://pnpm.io/)
- [PM2](https://pm2.keymetrics.io/) (`npm i -g pm2`)
- [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) w PATH
- Repo w WSL, np. `~/apps/figlolandia`

## Pierwsze uruchomienie

```bash
cd ~/apps/figlolandia

pnpm install
pnpm build

chmod +x deploy/*.sh

# opcjonalnie — sekrety (token Cloudflare)
cp deploy/config.local.env.example deploy/config.local.env

# migracja ze starego PM2 (jeśli był uruchomiony ręcznie)
pm2 delete figlolandia 2>/dev/null || true

./deploy/start.sh
```

`start.sh` uruchamia oba procesy PM2 (`figlolandia` + `cloudflared`) i jest **idempotentny** — działa zawsze, niezależnie od tego czy PM2 coś pamięta:

| Stan procesu w PM2 | Akcja `start.sh` |
|--------------------|------------------|
| zarejestrowany (online lub stopped) | `pm2 restart <nazwa>` |
| brak w PM2 (`pm2 delete`) | `pm2 start ecosystem.config.js` |

Po tygodniu przerwy wystarczy `./deploy/start.sh` — bez zastanawiania się nad stanem PM2.

| Proces        | Opis                          |
|---------------|-------------------------------|
| `figlolandia` | `pnpm start:prod` (port 3008) |
| `cloudflared` | tunel do localhost:3008       |

## Codzienne operacje

```bash
./deploy/start.sh     # start / restart obu procesów (idempotentny)
./deploy/stop.sh      # stop obu procesów
./deploy/restart.sh   # restart tylko aplikacji (tunnel zostaje)
./deploy/status.sh    # status PM2 + publiczny URL
```

## Aktualizacja kodu

```bash
git pull
pnpm install          # po zmianach zależności
pnpm build            # po zmianach kodu
./deploy/restart.sh
```

Build **nie** jest automatyczny w `start.sh` — decydujesz Ty, kiedy budować i deployować.

## Logi

```bash
pm2 logs figlolandia
pm2 logs cloudflared

pm2 logs figlolandia --lines 50 --nostream
pm2 logs cloudflared --lines 50 --nostream
```

Pliki logów (PM2):

- `deploy/logs/figlolandia-out.log`
- `deploy/logs/figlolandia-error.log`
- `deploy/logs/cloudflared-out.log`
- `deploy/logs/cloudflared-error.log`

Katalog `deploy/logs/` jest w `.gitignore`.

## Konfiguracja

### `deploy/config.env` (commitowany, bez sekretów)

```bash
APP_PORT=3008
HOST=0.0.0.0
DOMAIN=
```

### `deploy/config.local.env` (gitignored)

Sekrety i tokeny — skopiuj z `deploy/config.local.env.example`:

```bash
CLOUDFLARE_TUNNEL_TOKEN=eyJh...
```

## Tryb quick tunnel (domyślny)

Gdy `DOMAIN` jest puste, cloudflared uruchamia tymczasowy tunel:

```bash
cloudflared tunnel --url http://127.0.0.1:3008
```

- Publiczny adres: losowy `https://*.trycloudflare.com`
- URL pojawia się w `./deploy/status.sh` i w logach cloudflared
- **URL zmienia się** po restarcie procesu `cloudflared` (nie restartuj go bez potrzeby)

Lokalny dostęp: `http://127.0.0.1:3008`

## Własna domena (Cloudflare Named Tunnel)

Gdy chcesz użyć np. `figlolandia.pl`:

### 1. Utwórz Named Tunnel w Cloudflare

1. Zaloguj się do [Cloudflare Zero Trust](https://one.dash.cloudflare.com/)
2. **Networks → Tunnels → Create a tunnel**
3. Wybierz **Cloudflared** → nadaj nazwę (np. `figlolandia-staging`)
4. Skopiuj **token** tunelu

### 2. Skonfiguruj Public Hostname

W tunelu dodaj **Public Hostname**:

| Pole        | Wartość                    |
|-------------|----------------------------|
| Subdomain   | `@` lub `staging`          |
| Domain      | `figlolandia.pl`           |
| Service     | `HTTP`                     |
| URL         | `localhost:3008`           |

### 3. Ustaw zmienne w repo

`deploy/config.env`:

```bash
DOMAIN=figlolandia.pl
```

`deploy/config.local.env`:

```bash
CLOUDFLARE_TUNNEL_TOKEN=<token z dashboardu>
```

### 4. Restart stagingu

```bash
./deploy/stop.sh
./deploy/start.sh
./deploy/status.sh   # pokaże https://figlolandia.pl
```

## Zmienne aplikacji

Backend czyta standardowe zmienne (ustawiane przez PM2 z `config.env`):

| Zmienna    | Domyślnie   | Opis                              |
|------------|-------------|-----------------------------------|
| `PORT`     | `3008`      | Port HTTP/WebSocket               |
| `HOST`     | `0.0.0.0`   | Interfejs nasłuchu                |
| `SERVE_WEB`| (włączone)  | Serwowanie Expo web z backendu    |

Frontend w trybie web prod używa `window.location.origin` — działa przez tunnel bez przebudowy z `EXPO_PUBLIC_BACKEND_URL`.

## Pliki deploy

```
deploy/
├── config.env                 # port, host, domena (bez sekretów)
├── config.local.env.example   # szablon sekretów
├── config.local.env           # lokalnie — gitignored
├── lib.sh                     # wspólne funkcje bash
├── start.sh
├── stop.sh
├── restart.sh
├── status.sh
└── logs/                      # gitignored
```

Root repo:

```
ecosystem.config.js            # konfiguracja PM2
```

## Rozszerzenie o GitHub Actions (przyszłość)

Przykładowy workflow na self-hosted runnerze w WSL (szkic — nie zaimplementowany):

```yaml
name: Deploy staging

on:
  workflow_dispatch:

jobs:
  deploy:
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: ./deploy/restart.sh
```

Trigger `workflow_dispatch` — deploy tylko gdy Ty klikniesz, nie po każdym pushu.

## Uwagi

- **Brak `pm2 startup`** — staging nie startuje automatycznie po reboot WSL/Windows.
- **Jeden port** — backend serwuje API + frontend (`pnpm start:prod`).
- Przed pierwszym startem / po zmianach kodu wymagany jest `pnpm build`.
