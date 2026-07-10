"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rulesRandomEvent = exports.rulesLastInOrderBonus = exports.rulesBaseIncome = exports.rulesVandalism = exports.rulesTheftCard = exports.rulesTheftGold = exports.rulesSaboteurBlock = exports.rulesDiplomatProtection = exports.rulesPoliticianCategory = exports.rulesAccountantBonus = exports.rulesLuckyBonus = exports.rulesProfessionSkip = exports.rulesPoliticianTax = exports.rulesBuildSkip = exports.rulesBuildCost = exports.RuleEvaluator = void 0;
/**
 * Bufor reguł przed następnym zdarzeniem audytowym.
 * GameAudit opróżnia go przy każdym event / goldChange.
 */
class RuleEvaluator {
    static check(input) {
        RuleEvaluator.pending.push(input);
    }
    static drain() {
        const rules = RuleEvaluator.pending;
        RuleEvaluator.pending = [];
        return rules;
    }
    static clear() {
        RuleEvaluator.pending = [];
    }
}
exports.RuleEvaluator = RuleEvaluator;
RuleEvaluator.pending = [];
const boolRule = (rule, condition, expected, actual, details) => {
    RuleEvaluator.check({
        rule,
        condition,
        expected: String(expected),
        actual: String(actual),
        passed: expected === actual,
        details,
    });
};
const passRule = (rule, condition, expected, actual, details) => {
    RuleEvaluator.check({
        rule,
        condition,
        expected,
        actual,
        passed: true,
        details,
    });
};
// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------
const rulesBuildCost = (input) => {
    passRule('BaseCost', `building=${input.buildingType}`, String(input.baseValue), String(input.baseValue));
    passRule('ProfessionDiscount', 'opportunity_hunter && !abilityUsed', input.opportunityHunter ? '-2' : '0', String(-input.discount), { opportunityHunter: input.opportunityHunter });
    passRule('UrbanistBonus', 'pending boost on first build', input.urbanistBoost ? '+1 value' : '0', input.urbanistBoost ? '+1 value' : '0');
    passRule('TotalCost', 'base - discount', String(input.cost), String(input.cost), {
        decision: 'COST_CALCULATED',
        baseValue: input.baseValue,
        discount: input.discount,
        total: input.cost,
        source: input.source,
    });
    boolRule('EnoughGold', `gold >= ${input.cost}`, true, input.gold >= input.cost, {
        gold: input.gold,
        cost: input.cost,
    });
    boolRule('CardExists', 'build action has buildingType', true, true);
    RuleEvaluator.check({
        rule: 'Decision',
        condition: 'all build checks',
        expected: 'BUILD_ALLOWED',
        actual: input.gold >= input.cost ? 'BUILD_ALLOWED' : 'BUILD_DENIED',
        passed: input.gold >= input.cost,
    });
};
exports.rulesBuildCost = rulesBuildCost;
const rulesBuildSkip = (input) => {
    passRule('BaseCost', 'resolved base value', String(input.baseValue), String(input.baseValue));
    passRule('TotalCost', 'after discounts', String(input.cost), String(input.cost));
    boolRule('EnoughGold', `gold >= ${input.cost}`, true, input.gold >= input.cost, {
        gold: input.gold,
        cost: input.cost,
    });
    RuleEvaluator.check({
        rule: 'Decision',
        condition: 'build eligibility',
        expected: 'BUILD_ALLOWED',
        actual: 'BUILD_SKIPPED',
        passed: false,
        details: { reason: input.reason },
    });
};
exports.rulesBuildSkip = rulesBuildSkip;
const rulesPoliticianTax = (input) => {
    const eligible = !!input.taxedCategory &&
        input.taxedCategory === input.buildingCategory &&
        input.builderId !== input.politicianId;
    passRule('TaxCategory', 'state.taxedCategory', input.taxedCategory ?? '—', input.taxedCategory ?? '—');
    passRule('BuilderCategory', 'building.category', input.buildingCategory, input.buildingCategory);
    boolRule('SamePlayer', 'builder !== politician', false, input.builderId === input.politicianId, {
        builderId: input.builderId,
        politicianId: input.politicianId,
    });
    boolRule('TaxEligible', 'category match && different player', true, eligible);
    RuleEvaluator.check({
        rule: 'Decision',
        condition: 'politician tax',
        expected: '+1',
        actual: eligible ? '+1' : '+0',
        passed: eligible,
        details: { decision: eligible ? 'TAX_APPLIED' : 'TAX_SKIPPED' },
    });
};
exports.rulesPoliticianTax = rulesPoliticianTax;
// ---------------------------------------------------------------------------
// Profession skip / block (generic)
// ---------------------------------------------------------------------------
const rulesProfessionSkip = (input) => {
    if (input.saboteurBlocked ?? input.abilityBlocked) {
        boolRule('SaboteurBlocked', 'professionAbilityUsed', false, true);
    }
    if (input.targetProtected !== undefined) {
        boolRule('TargetProtected', 'target.protected', false, input.targetProtected, {
            targetId: input.targetId,
        });
    }
    RuleEvaluator.check({
        rule: 'Decision',
        condition: `${input.profession ?? 'unknown'} ability`,
        expected: 'ALLOWED',
        actual: 'SKIPPED',
        passed: false,
        details: { reason: input.reason, profession: input.profession },
    });
};
exports.rulesProfessionSkip = rulesProfessionSkip;
const rulesLuckyBonus = (input) => {
    boolRule('ProfessionActive', 'profession=lucky && !blocked', true, true);
    passRule('GoldBonus', 'lucky +2', '+2', '+2', { goldBefore: input.goldBefore });
    RuleEvaluator.check({
        rule: 'Decision',
        condition: 'lucky bonus',
        expected: '+2',
        actual: '+2',
        passed: true,
        details: { decision: 'LUCKY_BONUS' },
    });
};
exports.rulesLuckyBonus = rulesLuckyBonus;
const rulesAccountantBonus = (input) => {
    boolRule('LowGold', 'gold < 2', true, input.gold < 2, { gold: input.gold });
    RuleEvaluator.check({
        rule: 'Decision',
        condition: 'accountant end bonus',
        expected: '+2',
        actual: input.gold < 2 ? '+2' : '+0',
        passed: input.gold < 2,
        details: { decision: input.gold < 2 ? 'ACCOUNTANT_BONUS' : 'ACCOUNTANT_SKIPPED' },
    });
};
exports.rulesAccountantBonus = rulesAccountantBonus;
const rulesPoliticianCategory = (input) => {
    boolRule('HasAction', 'use_profession + taxedCategory', true, input.hasCategory);
    RuleEvaluator.check({
        rule: 'Decision',
        condition: 'set tax category',
        expected: 'CATEGORY_SET',
        actual: input.hasCategory ? 'CATEGORY_SET' : 'SKIPPED',
        passed: input.hasCategory,
        details: { category: input.category ?? null },
    });
};
exports.rulesPoliticianCategory = rulesPoliticianCategory;
const rulesDiplomatProtection = () => {
    boolRule('HasAction', 'use_profession', true, true);
    RuleEvaluator.check({
        rule: 'Decision',
        condition: 'diplomat protection',
        expected: 'PROTECTED',
        actual: 'PROTECTED',
        passed: true,
    });
};
exports.rulesDiplomatProtection = rulesDiplomatProtection;
const rulesSaboteurBlock = (input) => {
    boolRule('TargetExists', 'target in game', true, input.targetExists);
    boolRule('TargetProtected', 'target.protected', false, input.targetProtected);
    RuleEvaluator.check({
        rule: 'Decision',
        condition: 'saboteur block',
        expected: 'BLOCKED',
        actual: input.blocked ? 'BLOCKED' : 'NO_EFFECT',
        passed: input.blocked,
    });
};
exports.rulesSaboteurBlock = rulesSaboteurBlock;
// ---------------------------------------------------------------------------
// Theft
// ---------------------------------------------------------------------------
const rulesTheftGold = (input) => {
    boolRule('AbilityBlocked', 'professionAbilityUsed', false, input.abilityBlocked);
    boolRule('TargetProtected', 'target.protected', false, input.targetProtected, {
        target: input.targetName,
    });
    passRule('StealAmount', 'min(target.gold, 2)', String(Math.min(input.targetGold, 2)), String(input.stolen));
    RuleEvaluator.check({
        rule: 'Decision',
        condition: 'gold theft',
        expected: 'THEFT_ALLOWED',
        actual: 'THEFT_EXECUTED',
        passed: true,
        details: { thief: input.thiefName, target: input.targetName, stolen: input.stolen },
    });
};
exports.rulesTheftGold = rulesTheftGold;
const rulesTheftCard = (input) => {
    boolRule('TargetHasCards', 'target.cards.length > 0', true, input.cardsAvailable > 0, {
        cards: input.cardsAvailable,
    });
    RuleEvaluator.check({
        rule: 'Decision',
        condition: 'card theft',
        expected: 'THEFT_ALLOWED',
        actual: input.success ? 'CARD_STOLEN' : 'THEFT_SKIPPED',
        passed: input.success,
        details: { target: input.targetName },
    });
};
exports.rulesTheftCard = rulesTheftCard;
// ---------------------------------------------------------------------------
// Vandal
// ---------------------------------------------------------------------------
const rulesVandalism = (input) => {
    boolRule('AbilityBlocked', 'professionAbilityUsed', false, input.abilityBlocked);
    boolRule('TargetProtected', 'target.protected', false, input.targetProtected);
    boolRule('TargetHasBuildings', 'buildings.length > 0', true, input.buildingsCount > 0);
    passRule('TargetBuilding', 'highest value building', input.buildingType, input.buildingType);
    passRule('Damage', 'value - 2 (min 0)', String(Math.max(0, input.valueBefore - 2)), String(input.valueAfter));
    RuleEvaluator.check({
        rule: 'Decision',
        condition: 'vandal destroy',
        expected: 'DAMAGE_APPLIED',
        actual: 'DAMAGE_APPLIED',
        passed: true,
        details: { target: input.targetName },
    });
};
exports.rulesVandalism = rulesVandalism;
// ---------------------------------------------------------------------------
// PREP
// ---------------------------------------------------------------------------
const rulesBaseIncome = (input) => {
    passRule('BaseIncome', 'every player +N', `+${input.amount}`, `+${input.amount}`, {
        goldBefore: input.goldBefore,
    });
    RuleEvaluator.check({
        rule: 'Decision',
        condition: 'base income',
        expected: 'INCOME_GRANTED',
        actual: 'INCOME_GRANTED',
        passed: true,
    });
};
exports.rulesBaseIncome = rulesBaseIncome;
const rulesLastInOrderBonus = (input) => {
    boolRule('IsLastInOrder', 'order === players.length - 1', true, input.isLast, {
        order: input.order,
    });
    passRule('BonusAmount', 'config.lastMoveGoldBonus', String(input.bonus), String(input.bonus));
    RuleEvaluator.check({
        rule: 'Decision',
        condition: 'last in order bonus',
        expected: `+${input.bonus}`,
        actual: input.isLast ? `+${input.bonus}` : '+0',
        passed: input.isLast,
    });
};
exports.rulesLastInOrderBonus = rulesLastInOrderBonus;
const rulesRandomEvent = (input) => {
    boolRule('RollBelowThreshold', `roll < ${input.threshold}`, true, input.fired, {
        roll: input.roll,
        threshold: input.threshold,
    });
    if (input.fired && input.playerName) {
        passRule('ChosenPlayer', 'rng.randomChoice', input.playerName, input.playerName);
        passRule('BonusAmount', 'rng.randomInt(1,3)', String(input.bonus ?? ''), String(input.bonus ?? ''));
    }
    RuleEvaluator.check({
        rule: 'Decision',
        condition: 'random event',
        expected: 'EVENT_FIRED',
        actual: input.fired ? 'EVENT_FIRED' : 'NO_EVENT',
        passed: input.fired,
        details: input.fired
            ? { player: input.playerName, bonus: input.bonus }
            : { roll: input.roll, threshold: input.threshold },
    });
};
exports.rulesRandomEvent = rulesRandomEvent;
