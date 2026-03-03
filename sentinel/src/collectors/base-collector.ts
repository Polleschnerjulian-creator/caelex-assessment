import type {
  CollectorOutput,
  CronSchedule,
  CollectorHealth,
} from "../types/collector-types.js";

/**
 * Abstract base class for all Sentinel collectors.
 * Each collector connects to a source system, extracts compliance-relevant
 * data, and returns structured CollectorOutput objects.
 */
export abstract class BaseCollector {
  abstract readonly name: string;
  abstract readonly id: string;

  protected lastRun: Date | null = null;
  protected errorCount = 0;
  protected lastError?: string;

  abstract collect(): Promise<CollectorOutput[]>;
  abstract getSchedule(): CronSchedule;

  async healthCheck(): Promise<boolean> {
    return true;
  }

  getHealth(): CollectorHealth {
    return {
      name: this.name,
      healthy: this.errorCount < 3,
      lastRun: this.lastRun,
      nextRun: null,
      errorCount: this.errorCount,
      lastError: this.lastError,
    };
  }

  protected markSuccess(): void {
    this.lastRun = new Date();
    this.errorCount = 0;
    this.lastError = undefined;
  }

  protected markError(err: unknown): void {
    this.lastRun = new Date();
    this.errorCount++;
    this.lastError = err instanceof Error ? err.message : String(err);
  }
}
