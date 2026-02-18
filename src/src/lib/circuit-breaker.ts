/**
 * Circuit Breaker Pattern
 *
 * Implements circuit breaker pattern for fault tolerance and graceful degradation.
 * Prevents cascading failures by detecting repeated errors and opening the circuit.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit is open, requests fail fast
 * - HALF_OPEN: Testing if service has recovered
 *
 * @see /Volumes/Crucial X8/Code/Present-Agent2/docs/reviews/ENGINEERING_MANAGER_TECHNICAL_REVIEW.md
 */

import { logger } from './logger';
import { CircuitOpenError } from '../types/dialogue';

/**
 * Circuit breaker state
 */
export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open',
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Name for logging */
  name: string;

  /** Number of failures before opening circuit */
  failureThreshold: number;

  /** Time to wait before attempting to close circuit (ms) */
  resetTimeout: number;

  /** Time window for counting failures (ms) */
  failureWindow?: number;

  /** Optional: success threshold for half-open state */
  successThreshold?: number;
}

/**
 * Circuit breaker implementation
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: number;
  private nextAttemptTime?: number;
  private failures: number[] = []; // Timestamps of failures

  constructor(private config: CircuitBreakerConfig) {
    logger.info(`CircuitBreaker initialized: ${config.name}`, {
      failureThreshold: config.failureThreshold,
      resetTimeout: config.resetTimeout,
    });
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.isOpen()) {
      const timeUntilRetry = this.nextAttemptTime
        ? this.nextAttemptTime - Date.now()
        : 0;

      logger.warn(`CircuitBreaker: ${this.config.name} is OPEN`, {
        state: this.state,
        failureCount: this.failureCount,
        timeUntilRetry,
      });

      throw new CircuitOpenError(
        `Circuit breaker ${this.config.name} is open. Retry in ${Math.ceil(timeUntilRetry / 1000)}s`
      );
    }

    // If half-open, try the request
    if (this.state === CircuitState.HALF_OPEN) {
      logger.info(`CircuitBreaker: ${this.config.name} attempting request in HALF_OPEN state`);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Check if circuit is open
   */
  private isOpen(): boolean {
    if (this.state === CircuitState.CLOSED) {
      return false;
    }

    if (this.state === CircuitState.OPEN) {
      // Check if enough time has passed to try again
      if (this.shouldAttemptReset()) {
        logger.info(`CircuitBreaker: ${this.config.name} transitioning to HALF_OPEN`, {
          timeSinceOpen: Date.now() - (this.lastFailureTime || 0),
        });
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
        return false;
      }
      return true;
    }

    // Half-open state - allow request through
    return false;
  }

  /**
   * Check if enough time has passed to attempt reset
   */
  private shouldAttemptReset(): boolean {
    if (!this.nextAttemptTime) {
      return false;
    }
    return Date.now() >= this.nextAttemptTime;
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      const successThreshold = this.config.successThreshold || 1;

      if (this.successCount >= successThreshold) {
        logger.info(`CircuitBreaker: ${this.config.name} closing (recovered)`, {
          successCount: this.successCount,
        });
        this.reset();
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success
      this.failureCount = 0;
      this.failures = [];
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    const now = Date.now();
    this.lastFailureTime = now;
    this.failureCount++;
    this.failures.push(now);

    // Remove old failures outside the window
    if (this.config.failureWindow) {
      const windowStart = now - this.config.failureWindow;
      this.failures = this.failures.filter((t) => t >= windowStart);
      this.failureCount = this.failures.length;
    }

    logger.warn(`CircuitBreaker: ${this.config.name} failure recorded`, {
      failureCount: this.failureCount,
      threshold: this.config.failureThreshold,
      state: this.state,
    });

    // Check if we should open the circuit
    if (this.failureCount >= this.config.failureThreshold) {
      this.open();
    }
  }

  /**
   * Open the circuit
   */
  private open(): void {
    if (this.state !== CircuitState.OPEN) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.config.resetTimeout;

      logger.error(`CircuitBreaker: ${this.config.name} OPENED`, {
        failureCount: this.failureCount,
        threshold: this.config.failureThreshold,
        resetTimeout: this.config.resetTimeout,
        nextAttemptTime: new Date(this.nextAttemptTime),
      });
    }
  }

  /**
   * Reset the circuit to closed state
   */
  private reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.failures = [];
    this.lastFailureTime = undefined;
    this.nextAttemptTime = undefined;

    logger.info(`CircuitBreaker: ${this.config.name} CLOSED (reset)`, {
      state: this.state,
    });
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit metrics
   */
  getMetrics(): {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    lastFailureTime?: number;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  /**
   * Manually reset the circuit (for testing/admin)
   */
  forceReset(): void {
    logger.warn(`CircuitBreaker: ${this.config.name} manually reset`);
    this.reset();
  }

  /**
   * Manually open the circuit (for testing/admin)
   */
  forceOpen(): void {
    logger.warn(`CircuitBreaker: ${this.config.name} manually opened`);
    this.open();
  }
}

/**
 * Create a circuit breaker with default configuration for DialogueManager
 */
export function createDialogueManagerCircuitBreaker(): CircuitBreaker {
  return new CircuitBreaker({
    name: 'DialogueManager',
    failureThreshold: 5, // Open after 5 consecutive failures
    resetTimeout: 60000, // Try again after 1 minute
    failureWindow: 300000, // Count failures within 5 minute window
    successThreshold: 2, // Need 2 successes to fully close
  });
}

/**
 * Create a circuit breaker with custom configuration
 */
export function createCircuitBreaker(config: CircuitBreakerConfig): CircuitBreaker {
  return new CircuitBreaker(config);
}
