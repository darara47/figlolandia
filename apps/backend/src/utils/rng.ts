/**
 * Seedowany RNG (deterministyczny)
 * Używany do zapewnienia powtarzalności w grze
 */
export class SeededRNG {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  /**
   * Generuje losową liczbę z zakresu [0, 1)
   */
  random(): number {
    // LCG (Linear Congruential Generator)
    this.seed = (this.seed * 1664525 + 1013904223) % Math.pow(2, 32);
    return (this.seed >>> 0) / Math.pow(2, 32);
  }

  /**
   * Generuje losową liczbę całkowitą z zakresu [min, max]
   */
  randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  /**
   * Losuje element z tablicy
   */
  randomChoice<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error('Cannot choose from empty array');
    }
    return array[this.randomInt(0, array.length - 1)];
  }

  /**
   * Miesza tablicę (Fisher-Yates shuffle)
   */
  shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = this.randomInt(0, i);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Losuje elementy z tablicy bez powtórzeń
   */
  randomSample<T>(array: T[], count: number): T[] {
    if (count > array.length) {
      throw new Error('Sample size cannot be larger than array length');
    }
    const shuffled = this.shuffle(array);
    return shuffled.slice(0, count);
  }

  /**
   * Zwraca aktualny seed
   */
  getSeed(): number {
    return this.seed;
  }

  /**
   * Ustawia nowy seed
   */
  setSeed(seed: number): void {
    this.seed = seed;
  }
}

