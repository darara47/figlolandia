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
export declare class RuleEvaluator {
    private static pending;
    static check(input: RuleEvaluationInput): void;
    static drain(): RuleEvaluationInput[];
    static clear(): void;
}
export declare const rulesBuildCost: (input: {
    buildingType: BuildingType;
    baseValue: number;
    discount: number;
    cost: number;
    gold: number;
    opportunityHunter: boolean;
    urbanistBoost?: boolean;
    source: string;
}) => void;
export declare const rulesBuildSkip: (input: {
    buildingType: BuildingType | null;
    baseValue: number;
    cost: number;
    gold: number;
    reason: string;
}) => void;
export declare const rulesPoliticianTax: (input: {
    taxedCategory: BuildingCategory | undefined;
    buildingCategory: BuildingCategory;
    builderId: string;
    politicianId: string;
    alreadyApplied?: boolean;
}) => void;
export declare const rulesProfessionSkip: (input: {
    profession: Profession | null;
    reason: string;
    targetId?: string;
    targetProtected?: boolean;
    abilityBlocked?: boolean;
    saboteurBlocked?: boolean;
}) => void;
export declare const rulesLuckyBonus: (input: {
    goldBefore: number;
}) => void;
export declare const rulesAccountantBonus: (input: {
    gold: number;
}) => void;
export declare const rulesPoliticianCategory: (input: {
    hasCategory: boolean;
    category?: BuildingCategory;
}) => void;
export declare const rulesDiplomatProtection: () => void;
export declare const rulesSaboteurBlock: (input: {
    targetExists: boolean;
    targetProtected: boolean;
    blocked: boolean;
}) => void;
export declare const rulesTheftGold: (input: {
    thiefName: string;
    targetName: string;
    targetGold: number;
    targetProtected: boolean;
    abilityBlocked: boolean;
    stolen: number;
}) => void;
export declare const rulesTheftCard: (input: {
    targetName: string;
    cardsAvailable: number;
    success: boolean;
}) => void;
export declare const rulesVandalism: (input: {
    targetName: string;
    targetProtected: boolean;
    abilityBlocked: boolean;
    buildingsCount: number;
    buildingType: string;
    valueBefore: number;
    valueAfter: number;
}) => void;
export declare const rulesBaseIncome: (input: {
    amount: number;
    goldBefore: number;
}) => void;
export declare const rulesLastInOrderBonus: (input: {
    order: number;
    bonus: number;
    isLast: boolean;
}) => void;
export declare const rulesRandomEvent: (input: {
    roll: number;
    threshold: number;
    fired: boolean;
    playerName?: string;
    bonus?: number;
}) => void;
