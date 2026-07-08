"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CATEGORY_COLORS = exports.RoundEngine = exports.PROFESSION_DATA = exports.BUILDING_DATA = void 0;
exports.generateGameId = generateGameId;
exports.generatePlayerId = generatePlayerId;
exports.generateGamePin = generateGamePin;
exports.getAllProfessions = getAllProfessions;
exports.getCategoryColor = getCategoryColor;
exports.getBuildingsByCategory = getBuildingsByCategory;
// Building Data
exports.BUILDING_DATA = {
    // Edukacja
    nursery: { category: 'education', name: 'Żłobek', valueRange: [2, 3] },
    kindergarten: { category: 'education', name: 'Przedszkole', valueRange: [1, 3] },
    school: { category: 'education', name: 'Szkoła', valueRange: [1, 2] },
    technical_school: { category: 'education', name: 'Technikum', valueRange: [2, 4] },
    high_school: { category: 'education', name: 'Liceum', valueRange: [2, 4] },
    university: { category: 'education', name: 'Uniwersytet', valueRange: [4, 5] },
    // Zdrowie
    pharmacy: { category: 'health', name: 'Apteka', valueRange: [1, 3] },
    clinic: { category: 'health', name: 'Przychodnia', valueRange: [2, 3] },
    nursing_home: { category: 'health', name: 'Dom opieki', valueRange: [2, 4] },
    medical_clinic: { category: 'health', name: 'Klinika', valueRange: [4, 5] },
    hospital: { category: 'health', name: 'Szpital', valueRange: [2, 4] },
    cemetery: { category: 'health', name: 'Cmentarz', valueRange: [1, 2] },
    // Finanse
    exchange_office: { category: 'finance', name: 'Kantor', valueRange: [1, 2] },
    auction_house: { category: 'finance', name: 'Dom aukcyjny', valueRange: [1, 3] },
    bank: { category: 'finance', name: 'Bank', valueRange: [2, 4] },
    stock_exchange: { category: 'finance', name: 'Giełda', valueRange: [3, 5] },
    mint: { category: 'finance', name: 'Mennica', valueRange: [4, 5] },
    // Administracja
    city_archive: { category: 'administration', name: 'Archiwum miejskie', valueRange: [1, 2] },
    police_station: { category: 'administration', name: 'Komisariat', valueRange: [2, 3] },
    city_hall: { category: 'administration', name: 'Urząd miasta', valueRange: [2, 4] },
    court: { category: 'administration', name: 'Sąd', valueRange: [3, 4] },
    town_hall: { category: 'administration', name: 'Ratusz', valueRange: [3, 5] },
    // Rozrywka / Społeczeństwo
    bar: { category: 'entertainment', name: 'Bar', valueRange: [1, 2] },
    park: { category: 'entertainment', name: 'Park', valueRange: [1, 3] },
    cinema: { category: 'entertainment', name: 'Kino', valueRange: [2, 3] },
    theater: { category: 'entertainment', name: 'Teatr', valueRange: [3, 4] },
    stadium: { category: 'entertainment', name: 'Stadion', valueRange: [4, 5] },
};
// Profession Data
exports.PROFESSION_DATA = {
    // Ekonomia
    lucky: { name: 'Szczęściarz', category: 'Ekonomia' },
    opportunity_hunter: { name: 'Łowca okazji', category: 'Ekonomia' },
    investor: { name: 'Inwestor', category: 'Ekonomia' },
    accountant: { name: 'Księgowy', category: 'Ekonomia' },
    // Budowa
    builder: { name: 'Budowlaniec', category: 'Budowa' },
    architect: { name: 'Architekt', category: 'Budowa' },
    urbanist: { name: 'Urbanista', category: 'Budowa' },
    // Interakcja
    vandal: { name: 'Wandal', category: 'Interakcja' },
    thief: { name: 'Złodziej', category: 'Interakcja' },
    saboteur: { name: 'Sabotażysta', category: 'Interakcja' },
    spy: { name: 'Szpieg', category: 'Interakcja' },
    // Władza / Obrona
    politician: { name: 'Polityk', category: 'Władza / Obrona' },
    diplomat: { name: 'Dyplomata', category: 'Władza / Obrona' },
    inspector: { name: 'Inspektor', category: 'Władza / Obrona' },
};
// Round Engine - główna logika rozstrzygania
class RoundEngine {
    /**
     * Rozstrzyga akcje graczy w fazie RESOLUTION
     * Zwraca zaktualizowany stan gry
     */
    static resolveRound(state, actions) {
        const newState = { ...state };
        const players = [...newState.players];
        // Sortuj graczy według kolejności rozstrzygania
        const sortedPlayers = [...players].sort((a, b) => a.order - b.order);
        // Reset stanów zawodów na początku rundy
        sortedPlayers.forEach((p) => {
            p.professionAbilityUsed = false;
            p.protected = false;
            p.delayedBuildings = false;
            p.buildingsBuiltThisRound = 0;
        });
        // Uwaga: Zdarzenia losowe są teraz rozstrzygane w fazie PREP, przed PLANNING
        // 2. Zastosuj zdolności zawodowe (przed akcjami)
        this.applyProfessionAbilities(sortedPlayers, actions, newState);
        // 3. Sabotaż / blokady
        this.resolveSabotage(sortedPlayers, actions, newState);
        // 4. Kradzieże
        this.resolveTheft(sortedPlayers, actions, newState);
        // 5. Niszczenie budynków
        this.resolveDestruction(sortedPlayers, actions, newState);
        // 6. Budowy (najniższy priorytet)
        this.resolveBuildings(sortedPlayers, actions, newState);
        // 7. Zastosuj efekty końcowe zawodów (np. Księgowy)
        this.applyEndOfRoundAbilities(sortedPlayers, newState);
        newState.players = sortedPlayers;
        return newState;
    }
    /**
     * Zastosuj zdolności zawodowe przed akcjami
     * WAŻNE: Polityk musi być rozstrzygany jako pierwszy (według kolejności),
     * aby zniżka była dostępna dla wszystkich graczy podczas budowy
     */
    static applyProfessionAbilities(players, actions, state) {
        // Najpierw rozstrzygnij Polityka (jeśli istnieje), aby ustawić tańszą kategorię
        const politicianPlayer = players.find((p) => p.profession === 'politician');
        if (politicianPlayer) {
            const politicianActions = actions.get(politicianPlayer.id) || [];
            const politicianAction = politicianActions.find((a) => a.type === 'use_profession' && a.professionAbility);
            if (politicianAction && politicianAction.cheaperCategory) {
                state.cheaperCategory = politicianAction.cheaperCategory;
                politicianPlayer.professionAbilityUsed = true;
            }
        }
        // Następnie rozstrzygnij pozostałe zdolności zawodowe
        for (const player of players) {
            // Pomiń Polityka (już rozstrzygnięty)
            if (player.profession === 'politician')
                continue;
            const playerActions = actions.get(player.id) || [];
            const professionAction = playerActions.find((a) => a.type === 'use_profession' && a.professionAbility);
            if (!professionAction || !player.profession)
                continue;
            switch (player.profession) {
                case 'lucky':
                    // Szczęściarz: +2 złotki na start rundy
                    player.gold += 2;
                    break;
                case 'diplomat':
                    // Dyplomata: nie może być celem negatywnych działań (sam nie atakuje)
                    player.protected = true;
                    break;
                case 'inspector':
                    // Inspektor: wskazuje gracza, którego budynki są opóźnione
                    if (professionAction.target) {
                        const target = players.find((p) => p.id === professionAction.target);
                        if (target) {
                            target.delayedBuildings = true;
                        }
                    }
                    break;
                case 'spy':
                    // Szpieg: podgląda rękę innego gracza
                    if (professionAction.target) {
                        const target = players.find((p) => p.id === professionAction.target);
                        if (target && !target.protected) {
                            // Zapisz podglądniętą rękę w stanie gry (tymczasowo)
                            if (!state.spiedHands) {
                                state.spiedHands = new Map();
                            }
                            // Skopiuj karty celu (głęboka kopia)
                            state.spiedHands.set(player.id, target.cards.map(card => ({ ...card })));
                        }
                    }
                    break;
            }
            player.professionAbilityUsed = true;
        }
    }
    /**
     * Zastosuj efekty końcowe zawodów
     */
    static applyEndOfRoundAbilities(players, state) {
        for (const player of players) {
            if (!player.profession)
                continue;
            switch (player.profession) {
                case 'accountant':
                    // Księgowy: jeśli na koniec rundy ma mniej niż 2 złotki, otrzymuje +2
                    if (player.gold < 2) {
                        player.gold += 2;
                    }
                    break;
            }
        }
    }
    /**
     * Rozstrzyga zdarzenia losowe na początku rundy (faza PREP)
     * Zdarzenia są wywoływane przez serwer przed fazą PLANNING
     *
     * @param players Lista graczy
     * @param state Stan gry
     * @param rng SeededRNG - musi być przekazany z backendu
     */
    static resolveRandomEvents(players, state, rng // SeededRNG - przekazywany z backendu (nie możemy importować z backendu)
    ) {
        // Sprawdź czy zdarzenie ma się wydarzyć (zgodnie z eventFrequency)
        if (rng.random() >= state.config.eventFrequency) {
            return; // Brak zdarzenia w tej rundzie
        }
        // W MVP: prosta implementacja zdarzeń losowych
        // W pełnej wersji można dodać różne typy zdarzeń:
        // - Bonus złota dla wszystkich
        // - Kary dla wybranych graczy
        // - Specjalne efekty
        // - itp.
        // Przykład: Losowe zdarzenie - bonus złota dla losowego gracza
        const randomPlayer = rng.randomChoice(players);
        const bonus = rng.randomInt(1, 3); // 1-3 złota
        randomPlayer.gold += bonus;
    }
    static resolveSabotage(players, actions, state) {
        // Sabotażysta: blokuje zdolność przeciwnika
        for (const player of players) {
            if (player.profession !== 'saboteur')
                continue;
            const playerActions = actions.get(player.id) || [];
            const professionAction = playerActions.find((a) => a.type === 'use_profession' && a.professionAbility);
            if (!professionAction || !professionAction.target)
                continue;
            const target = players.find((p) => p.id === professionAction.target);
            if (target && !target.protected) {
                // Blokuj zdolność zawodową celu
                target.professionAbilityUsed = true;
            }
        }
    }
    static resolveTheft(players, actions, state) {
        // Złodziej: kradnie 2 złotki lub kartę budynku
        for (const player of players) {
            if (player.profession !== 'thief')
                continue;
            const playerActions = actions.get(player.id) || [];
            const professionAction = playerActions.find((a) => a.type === 'use_profession' && a.professionAbility);
            if (!professionAction || !professionAction.target)
                continue;
            const target = players.find((p) => p.id === professionAction.target);
            if (!target || target.protected)
                continue;
            if (professionAction.theftTarget === 'gold') {
                // Kradzież złota
                const stolen = Math.min(target.gold, 2);
                target.gold -= stolen;
                player.gold += stolen;
            }
            else if (professionAction.theftTarget === 'card') {
                // Kradzież karty
                if (target.cards.length > 0) {
                    const stolenCard = target.cards.pop();
                    player.cards.push(stolenCard);
                }
            }
        }
    }
    static resolveDestruction(players, actions, state) {
        // Wandal: niszczy wartość budynku przeciwnika o 2
        for (const player of players) {
            if (player.profession !== 'vandal')
                continue;
            const playerActions = actions.get(player.id) || [];
            const professionAction = playerActions.find((a) => a.type === 'use_profession' && a.professionAbility);
            if (!professionAction || !professionAction.target)
                continue;
            const target = players.find((p) => p.id === professionAction.target);
            if (!target || target.protected || target.buildings.length === 0)
                continue;
            // Znajdź budynek o najwyższej wartości
            const building = target.buildings.reduce((best, current) => current.value > best.value ? current : best);
            // Zmniejsz wartość o 2 (minimum 0)
            building.value = Math.max(0, building.value - 2);
        }
    }
    static resolveBuildings(players, actions, state) {
        // Budowa budynków
        for (const player of players) {
            // Pomiń jeśli budynki są opóźnione (Inspektor)
            if (player.delayedBuildings)
                continue;
            const playerActions = actions.get(player.id) || [];
            // Limit budynków na rundę: Budowlaniec może wybudować +1 (2), pozostali 1.
            const maxBuildings = player.profession === 'builder' ? 2 : 1;
            const buildActions = playerActions
                .filter((a) => a.type === 'build')
                .slice(0, maxBuildings);
            for (const buildAction of buildActions) {
                if (!buildAction.buildingType)
                    continue;
                const buildingData = exports.BUILDING_DATA[buildAction.buildingType];
                if (!buildingData)
                    continue;
                // Oblicz koszt budowy
                // Znajdź kartę jeśli podano cardId
                const card = buildAction.cardId
                    ? player.cards.find((c) => c.id === buildAction.cardId)
                    : null;
                let cost = buildAction.buildingValue ||
                    (card ? card.buildingValue : null) ||
                    buildingData.valueRange[0];
                // Polityk: tańsza kategoria (dla wszystkich graczy)
                if (state.cheaperCategory === buildingData.category) {
                    cost = Math.max(0, cost - 1);
                }
                // Łowca okazji: budowa kosztuje o 2 mniej
                if (player.profession === 'opportunity_hunter') {
                    cost = Math.max(1, cost - 2);
                }
                // Sprawdź czy gracz ma wystarczająco złota.
                // Fallback: jeśli gracza nie stać, budowa jest pomijana, a informacja trafia do logów.
                if (player.gold < cost) {
                    console.warn(`[RoundEngine] Budowa pominięta: gracz ${player.name} (${player.id}) próbował wybudować ` +
                        `"${buildAction.buildingType}" za ${cost} złota, ale ma tylko ${player.gold}.`);
                    continue;
                }
                {
                    player.gold -= cost;
                    const buildingId = `building-${Date.now()}-${Math.random()}`;
                    let buildingValue = cost; // wartość = koszt budowy
                    // Urbanista: wybiera budynek którego wartość zwiększa się o 1
                    // Zwiększamy wartość pierwszego budynku wybudowanego w rundzie przez Urbanistę
                    if (player.profession === 'urbanist' && player.buildingsBuiltThisRound === 0) {
                        const urbanistAction = playerActions.find((a) => a.type === 'use_profession' && a.professionAbility);
                        if (urbanistAction) {
                            // Zwiększ wartość budynku o 1 (maksymalnie 5)
                            buildingValue = Math.min(5, buildingValue + 1);
                        }
                    }
                    player.buildings.push({
                        id: buildingId,
                        type: buildAction.buildingType,
                        category: buildingData.category,
                        value: buildingValue,
                    });
                    player.buildingsBuiltThisRound++;
                }
            }
            // Budowlaniec: może wybudować +1 budynek (już zbudowane w powyższej pętli)
            // To jest obsłużone przez możliwość wysłania wielu akcji build
            // Architekt: może zmienić kategorię budynku
            if (player.profession === 'architect') {
                const architectAction = playerActions.find((a) => a.type === 'use_profession' &&
                    a.professionAbility &&
                    a.buildingCategory);
                if (architectAction && architectAction.buildingType) {
                    // Zmień kategorię ostatniego wybudowanego budynku
                    const lastBuilding = player.buildings[player.buildings.length - 1];
                    if (lastBuilding && architectAction.buildingCategory) {
                        lastBuilding.category = architectAction.buildingCategory;
                    }
                }
            }
        }
    }
    /**
     * Sprawdza warunki zwycięstwa
     */
    static checkVictory(state) {
        const { players, config } = state;
        for (const player of players) {
            const totalValue = player.gold +
                player.buildings.reduce((sum, b) => sum + b.value, 0);
            if (totalValue >= config.victoryThreshold) {
                return player.id;
            }
        }
        // Sprawdź czy osiągnięto max rund
        if (state.round >= config.maxRounds) {
            // Zwróć gracza z najwyższą wartością
            const winner = players.reduce((best, current) => {
                const currentValue = current.gold +
                    current.buildings.reduce((sum, b) => sum + b.value, 0);
                const bestValue = best.gold + best.buildings.reduce((sum, b) => sum + b.value, 0);
                return currentValue > bestValue ? current : best;
            });
            return winner.id;
        }
        return null;
    }
}
exports.RoundEngine = RoundEngine;
// Utility functions
function generateGameId() {
    return `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function generatePlayerId() {
    return `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
/**
 * Generuje 6-cyfrowy PIN dla gry
 * @param existingPins Zbiór istniejących PIN-ów do uniknięcia kolizji
 */
function generateGamePin(existingPins) {
    let pin;
    let attempts = 0;
    const maxAttempts = 100;
    do {
        // Generuj 6-cyfrowy PIN (100000-999999)
        pin = Math.floor(100000 + Math.random() * 900000).toString();
        attempts++;
        // Jeśli przekroczono limit prób, użyj timestamp jako fallback
        if (attempts >= maxAttempts) {
            pin = (Date.now() % 900000 + 100000).toString();
            break;
        }
    } while (existingPins && existingPins.has(pin));
    return pin;
}
/**
 * Pobiera wszystkie zawody
 */
function getAllProfessions() {
    return Object.keys(exports.PROFESSION_DATA);
}
/**
 * Kolory kategorii budynków (hex)
 * Używane do stylizacji kart w UI
 */
exports.CATEGORY_COLORS = {
    education: '#3B82F6', // Blue
    health: '#EF4444', // Red
    finance: '#F59E0B', // Amber/Gold
    administration: '#8B5CF6', // Purple
    entertainment: '#10B981', // Green
};
/**
 * Pobiera kolor kategorii budynku
 */
function getCategoryColor(category) {
    return exports.CATEGORY_COLORS[category] || '#6B7280'; // Gray fallback
}
/**
 * Pobiera wszystkie typy budynków w kategorii
 */
function getBuildingsByCategory(category) {
    return Object.entries(exports.BUILDING_DATA)
        .filter(([_, data]) => data.category === category)
        .map(([type, _]) => type);
}
