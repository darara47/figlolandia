"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isResolutionDebugEnabled = exports.ResolutionDebug = void 0;
const isEnabled = () => process.env.DEBUG_RESOLUTION !== '0';
class ResolutionDebug {
    static configure(gameId, round) {
        if (!isEnabled())
            return;
        ResolutionDebug.gameId = gameId;
        ResolutionDebug.round = round;
        ResolutionDebug.events = [];
        ResolutionDebug.goldLedger = [];
    }
    static log(phase, step, message, data) {
        if (!isEnabled())
            return;
        ResolutionDebug.events.push({ phase, step, message, data });
        const dataSuffix = data ? ` ${JSON.stringify(data)}` : '';
        console.log(`[FIGLO-DEBUG][${phase}][${step}] ${message}${dataSuffix}`);
    }
    static logGoldChange(phase, step, player, goldBefore, goldAfter, meta) {
        if (!isEnabled())
            return;
        const delta = goldAfter - goldBefore;
        if (delta === 0)
            return;
        ResolutionDebug.goldLedger.push({
            phase,
            step,
            playerId: player.id,
            playerName: player.name,
            delta,
            goldBefore,
            goldAfter,
            meta,
        });
        ResolutionDebug.log(phase, step, `${player.name} (${player.id}): gold ${goldBefore}→${goldAfter} (${delta >= 0 ? '+' : ''}${delta})`, meta);
    }
    static logGoldSnapshot(phase, step, players) {
        if (!isEnabled())
            return;
        const snapshot = Object.fromEntries(players.map((p) => [p.name, { id: p.id, gold: p.gold }]));
        ResolutionDebug.log(phase, step, 'Gold snapshot', snapshot);
    }
    static flushSummary(label) {
        if (!isEnabled())
            return;
        const summary = {
            gameId: ResolutionDebug.gameId,
            round: ResolutionDebug.round,
            label,
            goldLedger: ResolutionDebug.goldLedger,
            events: ResolutionDebug.events,
        };
        console.log(`\n========== FIGLO DEBUG SUMMARY — ${label} — game ${ResolutionDebug.gameId} — round ${ResolutionDebug.round} ==========\n` +
            JSON.stringify(summary, null, 2) +
            '\n========== END FIGLO DEBUG SUMMARY ==========\n');
    }
}
exports.ResolutionDebug = ResolutionDebug;
ResolutionDebug.gameId = '';
ResolutionDebug.round = 0;
ResolutionDebug.events = [];
ResolutionDebug.goldLedger = [];
exports.isResolutionDebugEnabled = isEnabled;
