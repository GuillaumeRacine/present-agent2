/**
 * Base Agent Class
 *
 * Provides common functionality for all agents in the workflow
 */

import { Agent } from '../../types/agents';

export abstract class BaseAgent<TInput, TOutput> implements Agent<TInput, TOutput> {
  abstract name: string;

  /**
   * Process input and return output
   * Must be implemented by each agent
   */
  abstract process(input: TInput): Promise<TOutput>;

  /**
   * Log agent execution (for debugging)
   */
  protected log(message: string, data?: any): void {
    // In silent mode, suppress all agent logs
    if (process.env.LOG_LEVEL === 'silent') {
      return;
    }

    // In quiet mode (CLI chat), show simplified agent workflow
    if (process.env.QUIET_MODE === 'true') {
      // Only show key agent activities, not data dumps
      console.log(`   🤖 [${this.name}] ${message}`);
      return;
    }

    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${this.name}] ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  /**
   * Measure execution time
   */
  protected async measure<T>(fn: () => Promise<T>): Promise<{ result: T; timeMs: number }> {
    const start = Date.now();
    const result = await fn();
    const timeMs = Date.now() - start;
    return { result, timeMs };
  }

  /**
   * Handle errors gracefully
   */
  protected handleError(error: unknown, context: string): never {
    const message = error instanceof Error ? error.message : 'Unknown error';
    this.log(`ERROR in ${context}: ${message}`);
    throw new Error(`${this.name} failed: ${message}`);
  }
}
