"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CATEGORY_COLORS = exports.HIDDEN_PROFESSIONS = exports.RoundEngine = exports.UI_ANIMATION_MS = exports.getResolutionAdvanceDelayMs = exports.getResolutionTurnDurationMs = exports.goldFloatTotalMs = exports.GOLD_FLOAT_MS = exports.RESOLUTION_TURN_GAP_MS = exports.RESOLUTION_PROFESSION_AT = exports.RESOLUTION_BUILD_AT = exports.RESOLUTION_TURN_MS = exports.isResolutionDebugEnabled = exports.ResolutionDebug = exports.PROFESSION_DATA = exports.BUILDING_DATA = void 0;
exports.generateGameId = generateGameId;
exports.generatePlayerId = generatePlayerId;
exports.generateGamePin = generateGamePin;
exports.getAllProfessions = getAllProfessions;
exports.getAssignableProfessions = getAssignableProfessions;
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
const resolution_debug_1 = require("./resolution-debug");
var resolution_debug_2 = require("./resolution-debug");
Object.defineProperty(exports, "ResolutionDebug", { enumerable: true, get: function () { return resolution_debug_2.ResolutionDebug; } });
Object.defineProperty(exports, "isResolutionDebugEnabled", { enumerable: true, get: function () { return resolution_debug_2.isResolutionDebugEnabled; } });
var animationTiming_1 = require("./animationTiming");
Object.defineProperty(exports, "RESOLUTION_TURN_MS", { enumerable: true, get: function () { return animationTiming_1.RESOLUTION_TURN_MS; } });
Object.defineProperty(exports, "RESOLUTION_BUILD_AT", { enumerable: true, get: function () { return animationTiming_1.RESOLUTION_BUILD_AT; } });
Object.defineProperty(exports, "RESOLUTION_PROFESSION_AT", { enumerable: true, get: function () { return animationTiming_1.RESOLUTION_PROFESSION_AT; } });
Object.defineProperty(exports, "RESOLUTION_TURN_GAP_MS", { enumerable: true, get: function () { return animationTiming_1.RESOLUTION_TURN_GAP_MS; } });
Object.defineProperty(exports, "GOLD_FLOAT_MS", { enumerable: true, get: function () { return animationTiming_1.GOLD_FLOAT_MS; } });
Object.defineProperty(exports, "goldFloatTotalMs", { enumerable: true, get: function () { return animationTiming_1.goldFloatTotalMs; } });
Object.defineProperty(exports, "getResolutionTurnDurationMs", { enumerable: true, get: function () { return animationTiming_1.getResolutionTurnDurationMs; } });
Object.defineProperty(exports, "getResolutionAdvanceDelayMs", { enumerable: true, get: function () { return animationTiming_1.getResolutionAdvanceDelayMs; } });
Object.defineProperty(exports, "UI_ANIMATION_MS", { enumerable: true, get: function () { return animationTiming_1.UI_ANIMATION_MS; } });
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
        resolution_debug_1.ResolutionDebug.configure(state.gameId, state.round);
        resolution_debug_1.ResolutionDebug.log('RESOLUTION', 'start', `Rozpoczęcie rozstrzygania rundy ${state.round}`, {
            players: sortedPlayers.map((p) => ({
                id: p.id,
                name: p.name,
                profession: p.profession,
                gold: p.gold,
                order: p.order,
                deferredBuilds: p.deferredBuildActions.length,
            })),
            actions: Object.fromEntries([...actions.entries()].map(([playerId, playerActions]) => [
                playerId,
                playerActions,
            ])),
        });
        resolution_debug_1.ResolutionDebug.logGoldSnapshot('RESOLUTION', 'start', sortedPlayers);
        // Reset flag bieżącej rundy (deferredBuildActions przetrwa do wykonania w kroku budowy)
        sortedPlayers.forEach((p) => {
            p.professionAbilityUsed = false;
            p.protected = false;
            p.delayedBuildings = false;
            p.urbanistPendingBuildBoost = false;
            p.buildingsBuiltThisRound = 0;
            p.luckyGoldGranted = undefined;
        });
        // Uwaga: Zdarzenia losowe są teraz rozstrzygane w fazie PREP, przed PLANNING
        // 2. Zdolności zawodowe (Polityk → Dyplomata → Sabotażysta → reszta)
        this.applyProfessionAbilities(sortedPlayers, actions, newState);
        resolution_debug_1.ResolutionDebug.logGoldSnapshot('RESOLUTION', 'after_abilities', sortedPlayers);
        // 3. Niszczenie budynków
        this.resolveDestruction(sortedPlayers, actions, newState);
        // 4. Budowy
        this.resolveBuildings(sortedPlayers, actions, newState);
        resolution_debug_1.ResolutionDebug.logGoldSnapshot('RESOLUTION', 'after_builds', sortedPlayers);
        // 5. Kradzieże (Złodziej — po budowach, żeby cel najpierw wydał złoto na budowę)
        this.resolveTheft(sortedPlayers, actions, newState);
        resolution_debug_1.ResolutionDebug.logGoldSnapshot('RESOLUTION', 'after_theft', sortedPlayers);
        // 6. Zastosuj efekty końcowe zawodów (np. Księgowy)
        this.applyEndOfRoundAbilities(sortedPlayers, newState);
        resolution_debug_1.ResolutionDebug.logGoldSnapshot('RESOLUTION', 'after_end_abilities', sortedPlayers);
        resolution_debug_1.ResolutionDebug.log('RESOLUTION', 'flags', 'Stan flag po rozstrzygnięciu', {
            players: sortedPlayers.map((p) => ({
                id: p.id,
                name: p.name,
                profession: p.profession,
                professionAbilityUsed: p.professionAbilityUsed,
                protected: p.protected,
                delayedBuildings: p.delayedBuildings,
                urbanistPendingBuildBoost: p.urbanistPendingBuildBoost,
                deferredBuildActions: p.deferredBuildActions.length,
                buildingsBuiltThisRound: p.buildingsBuiltThisRound,
            })),
            taxedCategory: newState.taxedCategory,
        });
        newState.players = sortedPlayers;
        resolution_debug_1.ResolutionDebug.flushSummary(`RESOLUTION round ${state.round}`);
        return newState;
    }
    /**
     * Zastosuj zdolności zawodowe przed akcjami.
     * Kolejność: Polityk → Dyplomata → Sabotażysta → pozostałe (lucky, inspector, spy, urbanist).
     */
    static applyProfessionAbilities(players, actions, state) {
        const findProfessionAction = (playerId) => {
            const playerActions = actions.get(playerId) || [];
            return playerActions.find((a) => a.type === 'use_profession' && a.professionAbility);
        };
        // 1. Polityk — ustawia opodatkowaną kategorię przed fazą budowy
        const politicianPlayer = players.find((p) => p.profession === 'politician');
        if (politicianPlayer) {
            const politicianAction = findProfessionAction(politicianPlayer.id);
            if (politicianAction?.taxedCategory) {
                state.taxedCategory = politicianAction.taxedCategory;
                politicianPlayer.professionAbilityUsed = true;
                resolution_debug_1.ResolutionDebug.log('RESOLUTION', 'abilities.politician', `${politicianPlayer.name}: opodatkowana kategoria = ${politicianAction.taxedCategory}`);
            }
            else {
                resolution_debug_1.ResolutionDebug.log('RESOLUTION', 'abilities.politician', `${politicianPlayer.name}: brak akcji lub brak taxedCategory — pominięto`, { action: politicianAction ?? null });
            }
        }
        // 2. Dyplomata — najwyższy priorytet obrony
        for (const player of players) {
            if (player.profession !== 'diplomat' || player.professionAbilityUsed)
                continue;
            const professionAction = findProfessionAction(player.id);
            if (!professionAction) {
                resolution_debug_1.ResolutionDebug.log('RESOLUTION', 'abilities.diplomat', `${player.name}: brak akcji use_profession — pominięto`);
                continue;
            }
            player.protected = true;
            player.professionAbilityUsed = true;
            resolution_debug_1.ResolutionDebug.log('RESOLUTION', 'abilities.diplomat', `${player.name}: protected=true`);
        }
        // 3. Sabotażysta — blokuje zdolność zawodową celu
        for (const player of players) {
            if (player.profession !== 'saboteur' || player.professionAbilityUsed)
                continue;
            const professionAction = findProfessionAction(player.id);
            if (!professionAction?.target) {
                resolution_debug_1.ResolutionDebug.log('RESOLUTION', 'abilities.saboteur', `${player.name}: brak celu — pominięto`, { action: professionAction ?? null });
                continue;
            }
            const target = players.find((p) => p.id === professionAction.target);
            if (target && !target.protected) {
                target.professionAbilityUsed = true;
                resolution_debug_1.ResolutionDebug.log('RESOLUTION', 'abilities.saboteur', `${player.name} → ${target.name}: professionAbilityUsed=true (cel zablokowany)`);
            }
            else {
                resolution_debug_1.ResolutionDebug.log('RESOLUTION', 'abilities.saboteur', `${player.name}: cel ${professionAction.target} ${!target ? 'nie istnieje' : 'jest chroniony (protected)'} — brak blokady`);
            }
            player.professionAbilityUsed = true;
        }
        // 4. Pozostałe zdolności pre-action
        for (const player of players) {
            if (player.profession === 'politician' ||
                player.profession === 'diplomat' ||
                player.profession === 'saboteur' ||
                player.professionAbilityUsed) {
                if (player.profession &&
                    !['politician', 'diplomat', 'saboteur'].includes(player.profession) &&
                    player.professionAbilityUsed) {
                    resolution_debug_1.ResolutionDebug.log('RESOLUTION', 'abilities.skip', `${player.name} (${player.profession}): pominięto — professionAbilityUsed=true (np. przez Sabotażystę)`);
                }
                continue;
            }
            const professionAction = findProfessionAction(player.id);
            if (!professionAction || !player.profession) {
                resolution_debug_1.ResolutionDebug.log('RESOLUTION', 'abilities.skip', `${player.name} (${player.profession ?? 'brak'}): brak akcji use_profession — pominięto`);
                continue;
            }
            switch (player.profession) {
                case 'lucky': {
                    const goldBefore = player.gold;
                    player.gold += 2;
                    player.luckyGoldGranted = 2;
                    resolution_debug_1.ResolutionDebug.logGoldChange('RESOLUTION', 'abilities.lucky', player, goldBefore, player.gold);
                    break;
                }
                case 'inspector':
                    if (professionAction.target) {
                        const target = players.find((p) => p.id === professionAction.target);
                        if (target && !target.protected) {
                            target.delayedBuildings = true;
                            resolution_debug_1.ResolutionDebug.log('RESOLUTION', 'abilities.inspector', `${player.name} → ${target.name}: delayedBuildings=true`);
                        }
                        else {
                            resolution_debug_1.ResolutionDebug.log('RESOLUTION', 'abilities.inspector', `${player.name}: cel ${professionAction.target} ${!target ? 'nie istnieje' : 'jest chroniony'} — brak opóźnienia`);
                        }
                    }
                    else {
                        resolution_debug_1.ResolutionDebug.log('RESOLUTION', 'abilities.inspector', `${player.name}: brak celu — pominięto`);
                    }
                    break;
                case 'spy':
                    if (professionAction.target) {
                        const target = players.find((p) => p.id === professionAction.target);
                        if (target && !target.protected) {
                            if (!state.spiedHands) {
                                state.spiedHands = new Map();
                            }
                            state.spiedHands.set(player.id, target.cards.map((card) => ({ ...card })));
                            resolution_debug_1.ResolutionDebug.log('RESOLUTION', 'abilities.spy', `${player.name} → ${target.name}: podgląd ${target.cards.length} kart`);
                        }
                        else {
                            resolution_debug_1.ResolutionDebug.log('RESOLUTION', 'abilities.spy', `${player.name}: cel ${professionAction.target} ${!target ? 'nie istnieje' : 'jest chroniony'} — pominięto`);
                        }
                    }
                    break;
                case 'urbanist':
                    if (player.buildings.length > 0) {
                        const lowestBuilding = player.buildings.reduce((lowest, current) => current.value < lowest.value ? current : lowest);
                        const valueBefore = lowestBuilding.value;
                        lowestBuilding.value = Math.min(5, lowestBuilding.value + 1);
                        resolution_debug_1.ResolutionDebug.log('RESOLUTION', 'abilities.urbanist', `${player.name}: ${lowestBuilding.type} wartość ${valueBefore}→${lowestBuilding.value}`);
                    }
                    else {
                        player.urbanistPendingBuildBoost = true;
                        resolution_debug_1.ResolutionDebug.log('RESOLUTION', 'abilities.urbanist', `${player.name}: brak budynków — urbanistPendingBuildBoost=true`);
                    }
                    break;
                default:
                    resolution_debug_1.ResolutionDebug.log('RESOLUTION', 'abilities.other', `${player.name} (${player.profession}): zdolność rozstrzygana w innym kroku`);
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
                        const goldBefore = player.gold;
                        player.gold += 2;
                        resolution_debug_1.ResolutionDebug.logGoldChange('RESOLUTION', 'end.accountant', player, goldBefore, player.gold);
                    }
                    else {
                        resolution_debug_1.ResolutionDebug.log('RESOLUTION', 'end.accountant', `${player.name}: gold=${player.gold} (>=2) — brak bonusu`);
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
        const roll = rng.random();
        const threshold = state.config.eventFrequency / 100;
        if (roll >= threshold) {
            resolution_debug_1.ResolutionDebug.log('PREP', 'random_event', `Brak zdarzenia losowego (roll=${roll.toFixed(4)}, threshold=${threshold})`);
            return;
        }
        const randomPlayer = rng.randomChoice(players);
        const bonus = rng.randomInt(1, 3);
        const goldBefore = randomPlayer.gold;
        randomPlayer.gold += bonus;
        resolution_debug_1.ResolutionDebug.logGoldChange('PREP', 'random_event', randomPlayer, goldBefore, randomPlayer.gold, { roll, threshold, bonus });
    }
    static resolveBuildings(players, actions, state) {
        const politicianPlayer = players.find((p) => p.profession === 'politician');
        // Najpierw wykonaj budowy odłożone przez Inspektora w poprzedniej rundzie
        for (const player of players) {
            if (player.deferredBuildActions.length === 0)
                continue;
            resolution_debug_1.ResolutionDebug.log('RESOLUTION', 'build.deferred', `${player.name}: wykonuję ${player.deferredBuildActions.length} odłożonych budów`, { actions: player.deferredBuildActions });
            this.executeBuildActions(player, player.deferredBuildActions, state, politicianPlayer, 'deferred');
            player.deferredBuildActions = [];
        }
        // Budowa budynków zaplanowanych na bieżącą rundę
        for (const player of players) {
            const playerActions = actions.get(player.id) || [];
            const maxBuildings = player.profession === 'builder' && !player.professionAbilityUsed ? 2 : 1;
            const buildActions = playerActions
                .filter((a) => a.type === 'build')
                .slice(0, maxBuildings);
            if (player.delayedBuildings) {
                for (const buildAction of buildActions) {
                    this.deferBuildAction(player, buildAction, state, politicianPlayer);
                }
                continue;
            }
            this.executeBuildActions(player, buildActions, state, politicianPlayer, 'current');
            // Architekt: może zmienić kategorię budynku
            if (player.profession === 'architect') {
                const architectAction = playerActions.find((a) => a.type === 'use_profession' &&
                    a.professionAbility &&
                    a.buildingCategory);
                if (architectAction?.buildingType) {
                    const lastBuilding = player.buildings[player.buildings.length - 1];
                    if (lastBuilding && architectAction.buildingCategory) {
                        const oldCategory = lastBuilding.category;
                        lastBuilding.category = architectAction.buildingCategory;
                        resolution_debug_1.ResolutionDebug.log('RESOLUTION', 'build.architect', `${player.name}: ${lastBuilding.type} kategoria ${oldCategory}→${architectAction.buildingCategory}`);
                    }
                }
            }
        }
    }
    static deferBuildAction(player, buildAction, state, politicianPlayer) {
        if (!buildAction.buildingType)
            return;
        const buildingData = exports.BUILDING_DATA[buildAction.buildingType];
        if (!buildingData)
            return;
        const card = buildAction.cardId
            ? player.cards.find((c) => c.id === buildAction.cardId)
            : null;
        const baseValue = buildAction.buildingValue ||
            (card ? card.buildingValue : null) ||
            buildingData.valueRange[0];
        const buildProfession = player.profession;
        const opportunityHunterDiscount = buildProfession === 'opportunity_hunter' && !player.professionAbilityUsed;
        let cost = baseValue;
        if (opportunityHunterDiscount) {
            cost = Math.max(0, cost - 2);
        }
        if (player.gold < cost) {
            const skipMessage = `[RoundEngine] Budowa opóźniona pominięta: gracz ${player.name} (${player.id}) próbował wybudować ` +
                `"${buildAction.buildingType}" za ${cost} złota, ale ma tylko ${player.gold}.`;
            console.warn(skipMessage);
            resolution_debug_1.ResolutionDebug.log('RESOLUTION', 'build.delayed.skip', skipMessage, {
                baseValue,
                cost,
                profession: buildProfession,
            });
            return;
        }
        const goldBefore = player.gold;
        player.gold -= cost;
        resolution_debug_1.ResolutionDebug.logGoldChange('RESOLUTION', 'build.delayed.cost', player, goldBefore, player.gold, {
            buildingType: buildAction.buildingType,
            baseValue,
            cost,
            opportunityHunter: opportunityHunterDiscount,
        });
        const buildingId = `building-${Date.now()}-${Math.random()}`;
        player.buildings.push({
            id: buildingId,
            type: buildAction.buildingType,
            category: buildingData.category,
            value: 0,
            pending: true,
        });
        player.deferredBuildActions.push({
            ...buildAction,
            buildingId,
            plannedProfession: player.profession ?? undefined,
        });
        resolution_debug_1.ResolutionDebug.log('RESOLUTION', 'build.delayed', `${player.name}: opóźniono budowę ${buildAction.buildingType} (pending, koszt=${cost})`, { buildingId, cost });
    }
    static executeBuildActions(player, buildActions, state, politicianPlayer, source) {
        for (const buildAction of buildActions) {
            if (!buildAction.buildingType)
                continue;
            const buildingData = exports.BUILDING_DATA[buildAction.buildingType];
            if (!buildingData)
                continue;
            if (source === 'deferred' && buildAction.buildingId) {
                const pendingBuilding = player.buildings.find((b) => b.id === buildAction.buildingId && b.pending);
                if (!pendingBuilding) {
                    resolution_debug_1.ResolutionDebug.log('RESOLUTION', 'build.deferred.skip', `${player.name}: brak pending budynku ${buildAction.buildingId}`);
                    continue;
                }
                const card = buildAction.cardId
                    ? player.cards.find((c) => c.id === buildAction.cardId)
                    : null;
                const baseValue = buildAction.buildingValue ||
                    (card ? card.buildingValue : null) ||
                    buildingData.valueRange[0];
                let buildingValue = baseValue;
                if (player.urbanistPendingBuildBoost && player.buildingsBuiltThisRound === 0) {
                    buildingValue = Math.min(5, buildingValue + 1);
                    player.urbanistPendingBuildBoost = false;
                    resolution_debug_1.ResolutionDebug.log('RESOLUTION', 'build.urbanist_boost', `${player.name}: +1 wartość odłożonego budynku (${baseValue}→${buildingValue})`);
                }
                pendingBuilding.value = buildingValue;
                pendingBuilding.pending = false;
                player.buildingsBuiltThisRound++;
                resolution_debug_1.ResolutionDebug.log('RESOLUTION', `build.success.${source}`, `${player.name}: ukończono odłożony ${buildAction.buildingType} (wartość=${buildingValue})`);
                if (politicianPlayer &&
                    player.id !== politicianPlayer.id &&
                    state.taxedCategory === buildingData.category) {
                    const politicianGoldBefore = politicianPlayer.gold;
                    politicianPlayer.gold += 1;
                    resolution_debug_1.ResolutionDebug.logGoldChange('RESOLUTION', 'build.politician_tax', politicianPlayer, politicianGoldBefore, politicianPlayer.gold, {
                        builder: player.name,
                        buildingType: buildAction.buildingType,
                        taxedCategory: state.taxedCategory,
                    });
                }
                continue;
            }
            const card = buildAction.cardId
                ? player.cards.find((c) => c.id === buildAction.cardId)
                : null;
            const baseValue = buildAction.buildingValue ||
                (card ? card.buildingValue : null) ||
                buildingData.valueRange[0];
            const buildProfession = buildAction.plannedProfession ?? player.profession;
            const opportunityHunterDiscount = buildProfession === 'opportunity_hunter' && !player.professionAbilityUsed;
            let cost = baseValue;
            if (opportunityHunterDiscount) {
                cost = Math.max(0, cost - 2);
            }
            if (player.gold < cost) {
                const skipMessage = `[RoundEngine] Budowa pominięta: gracz ${player.name} (${player.id}) próbował wybudować ` +
                    `"${buildAction.buildingType}" za ${cost} złota, ale ma tylko ${player.gold}.`;
                console.warn(skipMessage);
                resolution_debug_1.ResolutionDebug.log('RESOLUTION', 'build.skip', skipMessage, { source, baseValue, cost, profession: buildProfession });
                continue;
            }
            const goldBefore = player.gold;
            player.gold -= cost;
            resolution_debug_1.ResolutionDebug.logGoldChange('RESOLUTION', `build.cost.${source}`, player, goldBefore, player.gold, {
                buildingType: buildAction.buildingType,
                baseValue,
                cost,
                opportunityHunter: opportunityHunterDiscount,
                professionAbilityBlocked: player.professionAbilityUsed,
                plannedProfession: buildAction.plannedProfession,
            });
            let buildingValue = baseValue;
            if (player.urbanistPendingBuildBoost && player.buildingsBuiltThisRound === 0) {
                buildingValue = Math.min(5, buildingValue + 1);
                player.urbanistPendingBuildBoost = false;
                resolution_debug_1.ResolutionDebug.log('RESOLUTION', 'build.urbanist_boost', `${player.name}: +1 wartość pierwszego budynku w rundzie (${baseValue}→${buildingValue})`);
            }
            const buildingId = `building-${Date.now()}-${Math.random()}`;
            player.buildings.push({
                id: buildingId,
                type: buildAction.buildingType,
                category: buildingData.category,
                value: buildingValue,
            });
            player.buildingsBuiltThisRound++;
            resolution_debug_1.ResolutionDebug.log('RESOLUTION', `build.success.${source}`, `${player.name}: wybudowano ${buildAction.buildingType} (wartość=${buildingValue}, kategoria=${buildingData.category})`);
            if (politicianPlayer &&
                player.id !== politicianPlayer.id &&
                state.taxedCategory === buildingData.category) {
                const politicianGoldBefore = politicianPlayer.gold;
                politicianPlayer.gold += 1;
                resolution_debug_1.ResolutionDebug.logGoldChange('RESOLUTION', 'build.politician_tax', politicianPlayer, politicianGoldBefore, politicianPlayer.gold, {
                    builder: player.name,
                    buildingType: buildAction.buildingType,
                    taxedCategory: state.taxedCategory,
                });
            }
        }
    }
    static resolveTheft(players, actions, state) {
        // Złodziej: kradnie 2 złotki lub kartę budynku
        for (const player of players) {
            if (player.profession !== 'thief')
                continue;
            if (player.professionAbilityUsed) {
                resolution_debug_1.ResolutionDebug.log('RESOLUTION', 'theft.skip', `${player.name}: zablokowany przez Sabotażystę — pominięto`);
                continue;
            }
            const playerActions = actions.get(player.id) || [];
            const professionAction = playerActions.find((a) => a.type === 'use_profession' && a.professionAbility);
            if (!professionAction || !professionAction.target) {
                resolution_debug_1.ResolutionDebug.log('RESOLUTION', 'theft.skip', `${player.name}: brak akcji lub celu — pominięto`);
                continue;
            }
            const target = players.find((p) => p.id === professionAction.target);
            if (!target || target.protected) {
                resolution_debug_1.ResolutionDebug.log('RESOLUTION', 'theft.skip', `${player.name}: cel ${professionAction.target} ${!target ? 'nie istnieje' : 'jest chroniony'} — pominięto`);
                continue;
            }
            if (professionAction.theftTarget === 'gold') {
                const stolen = Math.min(target.gold, 2);
                const targetGoldBefore = target.gold;
                const thiefGoldBefore = player.gold;
                target.gold -= stolen;
                player.gold += stolen;
                resolution_debug_1.ResolutionDebug.logGoldChange('RESOLUTION', 'theft.gold', target, targetGoldBefore, target.gold, { thief: player.name, stolen });
                resolution_debug_1.ResolutionDebug.logGoldChange('RESOLUTION', 'theft.gold', player, thiefGoldBefore, player.gold, { target: target.name, stolen });
            }
            else if (professionAction.theftTarget === 'card') {
                if (target.cards.length > 0) {
                    const stolenCard = target.cards.pop();
                    player.cards.push(stolenCard);
                    resolution_debug_1.ResolutionDebug.log('RESOLUTION', 'theft.card', `${player.name} → ${target.name}: skradziono kartę ${stolenCard.name}`);
                }
                else {
                    resolution_debug_1.ResolutionDebug.log('RESOLUTION', 'theft.card', `${player.name} → ${target.name}: cel nie ma kart — pominięto`);
                }
            }
        }
    }
    static resolveDestruction(players, actions, state) {
        // Wandal: niszczy wartość budynku przeciwnika o 2
        for (const player of players) {
            if (player.profession !== 'vandal')
                continue;
            if (player.professionAbilityUsed) {
                resolution_debug_1.ResolutionDebug.log('RESOLUTION', 'vandal.skip', `${player.name}: zablokowany przez Sabotażystę — pominięto`);
                continue;
            }
            const playerActions = actions.get(player.id) || [];
            const professionAction = playerActions.find((a) => a.type === 'use_profession' && a.professionAbility);
            if (!professionAction || !professionAction.target) {
                resolution_debug_1.ResolutionDebug.log('RESOLUTION', 'vandal.skip', `${player.name}: brak akcji lub celu — pominięto`);
                continue;
            }
            const target = players.find((p) => p.id === professionAction.target);
            if (!target || target.protected || target.buildings.length === 0) {
                resolution_debug_1.ResolutionDebug.log('RESOLUTION', 'vandal.skip', `${player.name}: cel ${professionAction.target} ${!target ? 'nie istnieje' : target.protected ? 'chroniony' : 'bez budynków'} — pominięto`);
                continue;
            }
            const building = target.buildings.reduce((best, current) => current.value > best.value ? current : best);
            const valueBefore = building.value;
            building.value = Math.max(0, building.value - 2);
            resolution_debug_1.ResolutionDebug.log('RESOLUTION', 'vandal', `${player.name} → ${target.name}: ${building.type} wartość ${valueBefore}→${building.value}`);
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
/** Zawody tymczasowo wyłączone z losowania (niedokończone mechaniki) */
exports.HIDDEN_PROFESSIONS = ['architect', 'spy'];
/**
 * Pobiera wszystkie zawody (w tym ukryte)
 */
function getAllProfessions() {
    return Object.keys(exports.PROFESSION_DATA);
}
/**
 * Pobiera zawody dostępne do losowania w grze
 */
function getAssignableProfessions() {
    const hidden = new Set(exports.HIDDEN_PROFESSIONS);
    return getAllProfessions().filter((profession) => !hidden.has(profession));
}
/**
 * Kolory kategorii budynków (hex)
 * Używane do stylizacji kart w UI
 */
exports.CATEGORY_COLORS = {
    education: '#4C8DFF',
    health: '#FF5C72',
    finance: '#F0B429',
    administration: '#A66BFF',
    entertainment: '#2DD4BF',
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
