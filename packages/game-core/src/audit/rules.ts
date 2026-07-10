import type { BuildingCategory, BuildingType, Profession } from '../index';

/** Pojedyncza ocena reguły — drzewo decyzji silnika. */
export interface RuleEvaluationInput {
  rule: string;
  condition: string;
  expected: string;
  actual: string;
  passed: boolean;
  details?: Record<string, unknown> | null;
}

/**
 * Bufor reguł przed następnym zdarzeniem audytowym.
 * GameAudit opróżnia go przy każdym event / goldChange.
 */
export class RuleEvaluator {
  private static pending: RuleEvaluationInput[] = [];

  static check(input: RuleEvaluationInput): void {
    RuleEvaluator.pending.push(input);
  }

  static drain(): RuleEvaluationInput[] {
    const rules = RuleEvaluator.pending;
    RuleEvaluator.pending = [];
    return rules;
  }

  static clear(): void {
    RuleEvaluator.pending = [];
  }
}

const boolRule = (
  rule: string,
  condition: string,
  expected: boolean,
  actual: boolean,
  details?: Record<string, unknown>,
): void => {
  RuleEvaluator.check({
    rule,
    condition,
    expected: String(expected),
    actual: String(actual),
    passed: expected === actual,
    details,
  });
};

const passRule = (
  rule: string,
  condition: string,
  expected: string,
  actual: string,
  details?: Record<string, unknown>,
): void => {
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

export const rulesBuildCost = (input: {
  buildingType: BuildingType;
  baseValue: number;
  discount: number;
  cost: number;
  gold: number;
  opportunityHunter: boolean;
  urbanistBoost?: boolean;
  source: string;
}): void => {
  passRule('BaseCost', `building=${input.buildingType}`, String(input.baseValue), String(input.baseValue));
  passRule(
    'ProfessionDiscount',
    'opportunity_hunter && !abilityUsed',
    input.opportunityHunter ? '-2' : '0',
    String(-input.discount),
    { opportunityHunter: input.opportunityHunter },
  );
  passRule(
    'UrbanistBonus',
    'pending boost on first build',
    input.urbanistBoost ? '+1 value' : '0',
    input.urbanistBoost ? '+1 value' : '0',
  );
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

export const rulesBuildSkip = (input: {
  buildingType: BuildingType | null;
  baseValue: number;
  cost: number;
  gold: number;
  reason: string;
}): void => {
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

export const rulesPoliticianTax = (input: {
  taxedCategory: BuildingCategory | undefined;
  buildingCategory: BuildingCategory;
  builderId: string;
  politicianId: string;
  alreadyApplied?: boolean;
}): void => {
  const eligible =
    !!input.taxedCategory &&
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

// ---------------------------------------------------------------------------
// Profession skip / block (generic)
// ---------------------------------------------------------------------------

export const rulesProfessionSkip = (input: {
  profession: Profession | null;
  reason: string;
  targetId?: string;
  targetProtected?: boolean;
  abilityBlocked?: boolean;
  saboteurBlocked?: boolean;
}): void => {
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

export const rulesLuckyBonus = (input: { goldBefore: number }): void => {
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

export const rulesAccountantBonus = (input: { gold: number }): void => {
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

export const rulesPoliticianCategory = (input: {
  hasCategory: boolean;
  category?: BuildingCategory;
}): void => {
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

export const rulesDiplomatProtection = (): void => {
  boolRule('HasAction', 'use_profession', true, true);
  RuleEvaluator.check({
    rule: 'Decision',
    condition: 'diplomat protection',
    expected: 'PROTECTED',
    actual: 'PROTECTED',
    passed: true,
  });
};

export const rulesSaboteurBlock = (input: {
  targetExists: boolean;
  targetProtected: boolean;
  blocked: boolean;
}): void => {
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

// ---------------------------------------------------------------------------
// Theft
// ---------------------------------------------------------------------------

export const rulesTheftGold = (input: {
  thiefName: string;
  targetName: string;
  targetGold: number;
  targetProtected: boolean;
  abilityBlocked: boolean;
  stolen: number;
}): void => {
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

export const rulesTheftCard = (input: {
  targetName: string;
  cardsAvailable: number;
  success: boolean;
}): void => {
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

// ---------------------------------------------------------------------------
// Vandal
// ---------------------------------------------------------------------------

export const rulesVandalism = (input: {
  targetName: string;
  targetProtected: boolean;
  abilityBlocked: boolean;
  buildingsCount: number;
  buildingType: string;
  valueBefore: number;
  valueAfter: number;
}): void => {
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

// ---------------------------------------------------------------------------
// PREP
// ---------------------------------------------------------------------------

export const rulesBaseIncome = (input: { amount: number; goldBefore: number }): void => {
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

export const rulesLastInOrderBonus = (input: {
  order: number;
  bonus: number;
  isLast: boolean;
}): void => {
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

export const rulesRandomEvent = (input: {
  roll: number;
  threshold: number;
  fired: boolean;
  playerName?: string;
  bonus?: number;
}): void => {
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
