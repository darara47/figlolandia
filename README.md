# Figlolandia

Monorepo projektu zawierającego aplikację mobilną i backend do zarządzania grami.

## 📋 Struktura projektu

Projekt jest zorganizowany jako monorepo używające **pnpm workspace**:

```
figlolandia/
├── apps/
│   ├── backend/          # Backend API (NestJS)
│   └── frontend/         # Aplikacja mobilna (Expo/React Native)
├── packages/
│   └── game-core/        # Wspólny pakiet z logiką gry
└── package.json          # Główny plik konfiguracyjny workspace
```

## 🛠️ Technologie

### Backend
- **NestJS** - Framework Node.js
- **TypeScript** - Język programowania
- **Express** - Platforma HTTP

### Frontend
- **Expo** - Framework React Native
- **React Native** - Framework mobilny
- **Expo Router** - Routing oparty na systemie plików
- **TypeScript** - Język programowania

### Narzędzia
- **pnpm** - Menedżer pakietów
- **TypeScript** - Język programowania
- **Monorepo** - Struktura workspace

## 📦 Wymagania

- **Node.js** (wersja 18 lub wyższa)
- **pnpm** (wersja 10.27.0 lub zgodna)
- **Expo CLI** (opcjonalnie, do uruchomienia aplikacji mobilnej)

## 🚀 Instalacja

1. Sklonuj repozytorium:
```bash
git clone git@github.com:darara47/figlolandia.git
cd figlolandia
```

2. Zainstaluj zależności:
```bash
pnpm install
```

## 💻 Uruchomienie

### Uruchomienie wszystkich aplikacji w trybie deweloperskim

```bash
pnpm dev
```

### Uruchomienie tylko frontendu

```bash
pnpm fe
```

lub bezpośrednio:
```bash
cd apps/frontend
pnpm start
```

Dostępne opcje:
- `pnpm start` - Uruchom Expo dev server
- `pnpm android` - Uruchom na Androidzie
- `pnpm ios` - Uruchom na iOS
- `pnpm web` - Uruchom w przeglądarce

### Uruchomienie tylko backendu

```bash
pnpm be
```

lub bezpośrednio:
```bash
cd apps/backend
pnpm start:dev
```

Dostępne opcje:
- `pnpm start` - Uruchom w trybie produkcyjnym
- `pnpm start:dev` - Uruchom w trybie deweloperskim (watch mode)
- `pnpm start:debug` - Uruchom w trybie debugowania
- `pnpm start:prod` - Uruchom skompilowaną wersję produkcyjną

## 🏗️ Budowanie

### Budowanie wszystkich pakietów

```bash
pnpm build
```

### Budowanie poszczególnych aplikacji

```bash
# Backend
cd apps/backend
pnpm build

# Frontend
cd apps/frontend
pnpm build

# Game Core
cd packages/game-core
pnpm build
```

## 🧪 Testy

### Backend

```bash
cd apps/backend

# Testy jednostkowe
pnpm test

# Testy w trybie watch
pnpm test:watch

# Testy z pokryciem kodu
pnpm test:cov

# Testy e2e
pnpm test:e2e
```

## 📝 Skrypty dostępne w głównym katalogu

- `pnpm dev` - Uruchom wszystkie aplikacje w trybie deweloperskim
- `pnpm build` - Zbuduj wszystkie pakiety
- `pnpm fe` - Uruchom frontend
- `pnpm be` - Uruchom backend

## 📁 Pakiety

### @figlolandia/game-core

Wspólny pakiet zawierający logikę gry, używany zarówno przez backend jak i frontend.

## 📖 Dokumentacja gry

Reguły gry, zawody, budynki i architektura WebSocket:

→ [docs/README.md](docs/README.md)

## 🔧 Konfiguracja

### TypeScript

Projekt używa wspólnej konfiguracji TypeScript zdefiniowanej w `tsconfig.base.json` oraz specyficznych konfiguracji dla każdego pakietu.

### ESLint & Prettier

Backend jest skonfigurowany z ESLint i Prettier do formatowania kodu.

## 📱 Używanie aplikacji na innych urządzeniach w sieci WiFi

Aby móc używać aplikacji na innym urządzeniu (telefon, tablet, inny komputer) w tej samej sieci WiFi:

### 1. Znajdź IP komputera z backendem

**macOS/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Windows:**
```bash
ipconfig | findstr IPv4
```

Znajdź adres IP przypisany do interfejsu WiFi (zwykle zaczyna się od `192.168.` lub `10.`).

### 2. Uruchom backend

Backend automatycznie nasłuchuje na wszystkich interfejsach sieciowych (`0.0.0.0`), więc będzie dostępny z innych urządzeń. Po uruchomieniu zobaczysz w logach adres IP:

```bash
cd apps/backend
pnpm start:dev
```

W logach zobaczysz:
```
🚀 Backend Figlolandia uruchomiony na porcie 3008
📡 WebSocket Gateway dostępny na ws://192.168.1.XXX:3008/game
🌐 Aplikacja dostępna z innych urządzeń w sieci: http://192.168.1.XXX:3008
```

### 3. Skonfiguruj frontend

**Opcja A: Zmienna środowiskowa (zalecane)**

Uruchom frontend z ustawioną zmienną środowiskową:

```bash
cd apps/frontend
EXPO_PUBLIC_BACKEND_IP=192.168.1.XXX pnpm start
```

Zastąp `192.168.1.XXX` swoim adresem IP.

**Opcja B: Plik .env**

Utwórz plik `.env` w katalogu `apps/frontend/`:

```bash
EXPO_PUBLIC_BACKEND_IP=192.168.1.XXX
EXPO_PUBLIC_BACKEND_PORT=3008
```

Następnie uruchom frontend normalnie:

```bash
cd apps/frontend
pnpm start
```

### 4. Połącz urządzenie

- **Telefon/Tablet**: Użyj aplikacji Expo Go i zeskanuj kod QR wyświetlony w terminalu
- **Inny komputer**: Otwórz w przeglądarce adres wyświetlony przez Expo (np. `exp://192.168.1.XXX:8081`)

### Uwagi

- Upewnij się, że oba urządzenia są w tej samej sieci WiFi
- Sprawdź, czy firewall nie blokuje portu 3008 na komputerze z backendem
- Jeśli używasz VPN, może to zakłócać połączenie lokalne

## 📄 Licencja

ISC

## 👤 Autor

darara47

