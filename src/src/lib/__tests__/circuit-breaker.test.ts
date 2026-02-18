/**
 * Circuit Breaker - Comprehensive Test Suite
 *
 * Tests circuit breaker pattern implementation for fault tolerance
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CircuitBreaker,
  CircuitState,
  createDialogueManagerCircuitBreaker,
  createCircuitBreaker,
} from '../circuit-breaker';
import { CircuitOpenError } from '../../types/dialogue';

// Helper to wait for time to pass
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// =============================================================================
// Basic Circuit Breaker Tests
// =============================================================================

describe('Circuit Breaker - Basic Functionality', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = createCircuitBreaker({
      name: 'TestBreaker',
      failureThreshold: 3,
      resetTimeout: 100, // Short timeout for testing
      successThreshold: 2,
    });
  });

  it('should start in CLOSED state', () => {
    expect(breaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('should execute function successfully when closed', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const result = await breaker.execute(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledOnce();
    expect(breaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('should pass through errors when closed', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Test error'));

    await expect(breaker.execute(fn)).rejects.toThrow('Test error');
    expect(breaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('should count failures correctly', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Fail'));

    // First failure
    await expect(breaker.execute(fn)).rejects.toThrow();
    expect(breaker.getState()).toBe(CircuitState.CLOSED);

    // Second failure
    await expect(breaker.execute(fn)).rejects.toThrow();
    expect(breaker.getState()).toBe(CircuitState.CLOSED);

    // Third failure - should open circuit
    await expect(breaker.execute(fn)).rejects.toThrow();
    expect(breaker.getState()).toBe(CircuitState.OPEN);
  });

  it('should open circuit after threshold failures', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Fail'));

    // Trigger failures to open circuit
    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(fn)).rejects.toThrow('Fail');
    }

    expect(breaker.getState()).toBe(CircuitState.OPEN);

    // Next call should fail fast without executing function
    await expect(breaker.execute(fn)).rejects.toThrow(CircuitOpenError);
    expect(fn).toHaveBeenCalledTimes(3); // Not called the 4th time
  });

  it('should reset failure count on success', async () => {
    const fn = vi.fn();

    // One failure
    fn.mockRejectedValueOnce(new Error('Fail'));
    await expect(breaker.execute(fn)).rejects.toThrow();

    // Then success
    fn.mockResolvedValueOnce('success');
    await breaker.execute(fn);

    // Failure count should be reset
    const metrics = breaker.getMetrics();
    expect(metrics.failureCount).toBe(0);
  });
});

// =============================================================================
// Circuit State Transitions
// =============================================================================

describe('Circuit Breaker - State Transitions', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = createCircuitBreaker({
      name: 'StateTest',
      failureThreshold: 2,
      resetTimeout: 100,
      successThreshold: 2,
    });
  });

  it('should transition from CLOSED to OPEN after failures', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Fail'));

    expect(breaker.getState()).toBe(CircuitState.CLOSED);

    // Trigger failures
    await expect(breaker.execute(fn)).rejects.toThrow();
    await expect(breaker.execute(fn)).rejects.toThrow();

    expect(breaker.getState()).toBe(CircuitState.OPEN);
  });

  it('should transition from OPEN to HALF_OPEN after timeout', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Fail'));

    // Open the circuit
    await expect(breaker.execute(fn)).rejects.toThrow();
    await expect(breaker.execute(fn)).rejects.toThrow();
    expect(breaker.getState()).toBe(CircuitState.OPEN);

    // Wait for reset timeout
    await wait(150);

    // Next call should try (HALF_OPEN)
    fn.mockResolvedValueOnce('success');
    await breaker.execute(fn);

    // Should be in HALF_OPEN or CLOSED depending on success threshold
    const state = breaker.getState();
    expect([CircuitState.HALF_OPEN, CircuitState.CLOSED]).toContain(state);
  });

  it('should transition from HALF_OPEN to CLOSED after successes', async () => {
    const fn = vi.fn();

    // Open circuit
    fn.mockRejectedValue(new Error('Fail'));
    await expect(breaker.execute(fn)).rejects.toThrow();
    await expect(breaker.execute(fn)).rejects.toThrow();
    expect(breaker.getState()).toBe(CircuitState.OPEN);

    // Wait and succeed
    await wait(150);
    fn.mockResolvedValue('success');

    // Need successThreshold (2) successes
    await breaker.execute(fn);
    await breaker.execute(fn);

    expect(breaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('should transition from HALF_OPEN back to OPEN on failure', async () => {
    const fn = vi.fn();

    // Open circuit
    fn.mockRejectedValue(new Error('Fail'));
    await expect(breaker.execute(fn)).rejects.toThrow();
    await expect(breaker.execute(fn)).rejects.toThrow();

    // Wait for half-open
    await wait(150);

    // Fail again
    fn.mockRejectedValueOnce(new Error('Fail again'));
    await expect(breaker.execute(fn)).rejects.toThrow();

    expect(breaker.getState()).toBe(CircuitState.OPEN);
  });
});

// =============================================================================
// Failure Window Tests
// =============================================================================

describe('Circuit Breaker - Failure Window', () => {
  it('should only count failures within window', async () => {
    const breaker = createCircuitBreaker({
      name: 'WindowTest',
      failureThreshold: 3,
      resetTimeout: 100,
      failureWindow: 200, // 200ms window
    });

    const fn = vi.fn().mockRejectedValue(new Error('Fail'));

    // First two failures
    await expect(breaker.execute(fn)).rejects.toThrow();
    await expect(breaker.execute(fn)).rejects.toThrow();

    // Wait for window to expire
    await wait(250);

    // Third failure (but first two are outside window)
    await expect(breaker.execute(fn)).rejects.toThrow();

    // Should still be closed (only 1 failure in window)
    expect(breaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('should open circuit with failures inside window', async () => {
    const breaker = createCircuitBreaker({
      name: 'WindowTest2',
      failureThreshold: 3,
      resetTimeout: 100,
      failureWindow: 500, // Wide window
    });

    const fn = vi.fn().mockRejectedValue(new Error('Fail'));

    // Three rapid failures
    await expect(breaker.execute(fn)).rejects.toThrow();
    await expect(breaker.execute(fn)).rejects.toThrow();
    await expect(breaker.execute(fn)).rejects.toThrow();

    // Should open (all within window)
    expect(breaker.getState()).toBe(CircuitState.OPEN);
  });
});

// =============================================================================
// DialogueManager Circuit Breaker
// =============================================================================

describe('Circuit Breaker - DialogueManager Configuration', () => {
  it('should create with correct configuration', () => {
    const breaker = createDialogueManagerCircuitBreaker();

    expect(breaker).toBeDefined();
    expect(breaker.getState()).toBe(CircuitState.CLOSED);

    const metrics = breaker.getMetrics();
    expect(metrics.failureCount).toBe(0);
    expect(metrics.successCount).toBe(0);
  });

  it('should use correct failure threshold (5)', async () => {
    const breaker = createDialogueManagerCircuitBreaker();
    const fn = vi.fn().mockRejectedValue(new Error('Fail'));

    // Should take 5 failures to open
    for (let i = 0; i < 4; i++) {
      await expect(breaker.execute(fn)).rejects.toThrow('Fail');
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    }

    // 5th failure opens it
    await expect(breaker.execute(fn)).rejects.toThrow('Fail');
    expect(breaker.getState()).toBe(CircuitState.OPEN);
  });

  it('should have 60s reset timeout', async () => {
    const breaker = createDialogueManagerCircuitBreaker();
    const fn = vi.fn().mockRejectedValue(new Error('Fail'));

    // Open circuit
    for (let i = 0; i < 5; i++) {
      await expect(breaker.execute(fn)).rejects.toThrow();
    }

    expect(breaker.getState()).toBe(CircuitState.OPEN);

    // Should stay open for a while (we won't wait full 60s in test)
    await wait(100);
    await expect(breaker.execute(fn)).rejects.toThrow(CircuitOpenError);
    expect(breaker.getState()).toBe(CircuitState.OPEN);
  });
});

// =============================================================================
// Manual Controls
// =============================================================================

describe('Circuit Breaker - Manual Controls', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = createCircuitBreaker({
      name: 'ManualTest',
      failureThreshold: 3,
      resetTimeout: 100,
    });
  });

  it('should support manual reset', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Fail'));

    // Open circuit
    await expect(breaker.execute(fn)).rejects.toThrow();
    await expect(breaker.execute(fn)).rejects.toThrow();
    await expect(breaker.execute(fn)).rejects.toThrow();
    expect(breaker.getState()).toBe(CircuitState.OPEN);

    // Manual reset
    breaker.forceReset();

    expect(breaker.getState()).toBe(CircuitState.CLOSED);
    const metrics = breaker.getMetrics();
    expect(metrics.failureCount).toBe(0);
  });

  it('should support manual open', () => {
    expect(breaker.getState()).toBe(CircuitState.CLOSED);

    breaker.forceOpen();

    expect(breaker.getState()).toBe(CircuitState.OPEN);
  });
});

// =============================================================================
// Metrics Tests
// =============================================================================

describe('Circuit Breaker - Metrics', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = createCircuitBreaker({
      name: 'MetricsTest',
      failureThreshold: 3,
      resetTimeout: 100,
      successThreshold: 2,
    });
  });

  it('should track failure count', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Fail'));

    await expect(breaker.execute(fn)).rejects.toThrow();
    await expect(breaker.execute(fn)).rejects.toThrow();

    const metrics = breaker.getMetrics();
    expect(metrics.failureCount).toBe(2);
  });

  it('should track success count in half-open state', async () => {
    const fn = vi.fn();

    // Open circuit
    fn.mockRejectedValue(new Error('Fail'));
    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(fn)).rejects.toThrow();
    }

    // Wait and try success
    await wait(150);
    fn.mockResolvedValue('success');
    await breaker.execute(fn);

    const metrics = breaker.getMetrics();
    expect(metrics.successCount).toBeGreaterThan(0);
  });

  it('should track last failure time', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Fail'));

    const before = Date.now();
    await expect(breaker.execute(fn)).rejects.toThrow();
    const after = Date.now();

    const metrics = breaker.getMetrics();
    expect(metrics.lastFailureTime).toBeDefined();
    expect(metrics.lastFailureTime!).toBeGreaterThanOrEqual(before);
    expect(metrics.lastFailureTime!).toBeLessThanOrEqual(after);
  });

  it('should provide current state in metrics', () => {
    const metrics = breaker.getMetrics();
    expect(metrics.state).toBe(CircuitState.CLOSED);
  });
});

// =============================================================================
// Error Handling Tests
// =============================================================================

describe('Circuit Breaker - Error Handling', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = createCircuitBreaker({
      name: 'ErrorTest',
      failureThreshold: 2,
      resetTimeout: 100,
    });
  });

  it('should provide helpful error message when open', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Fail'));

    // Open circuit
    await expect(breaker.execute(fn)).rejects.toThrow();
    await expect(breaker.execute(fn)).rejects.toThrow();

    // Try again - should get CircuitOpenError
    try {
      await breaker.execute(fn);
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(CircuitOpenError);
      expect((error as Error).message).toContain('open');
      expect((error as Error).message).toContain('Retry in');
    }
  });

  it('should handle synchronous errors', async () => {
    const fn = vi.fn().mockImplementation(() => {
      throw new Error('Sync error');
    });

    await expect(breaker.execute(fn as any)).rejects.toThrow('Sync error');
  });

  it('should handle async rejections', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Async error'));

    await expect(breaker.execute(fn)).rejects.toThrow('Async error');
  });
});

// =============================================================================
// Concurrency Tests
// =============================================================================

describe('Circuit Breaker - Concurrency', () => {
  it('should handle concurrent requests correctly', async () => {
    const breaker = createCircuitBreaker({
      name: 'ConcurrentTest',
      failureThreshold: 3,
      resetTimeout: 100,
    });

    const fn = vi.fn().mockResolvedValue('success');

    // Execute multiple requests concurrently
    const promises = Array(10)
      .fill(null)
      .map(() => breaker.execute(fn));

    const results = await Promise.all(promises);

    expect(results.every((r) => r === 'success')).toBe(true);
    expect(fn).toHaveBeenCalledTimes(10);
    expect(breaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('should handle concurrent failures correctly', async () => {
    const breaker = createCircuitBreaker({
      name: 'ConcurrentFailTest',
      failureThreshold: 3,
      resetTimeout: 100,
    });

    const fn = vi.fn().mockRejectedValue(new Error('Fail'));

    // Execute multiple failing requests concurrently
    const promises = Array(5)
      .fill(null)
      .map(() => breaker.execute(fn).catch(() => 'caught'));

    await Promise.all(promises);

    // Circuit should be open
    expect(breaker.getState()).toBe(CircuitState.OPEN);
  });
});

// =============================================================================
// Performance Tests
// =============================================================================

describe('Circuit Breaker - Performance', () => {
  it('should add minimal overhead when closed', async () => {
    const breaker = createCircuitBreaker({
      name: 'PerfTest',
      failureThreshold: 10,
      resetTimeout: 1000,
    });

    const fn = vi.fn().mockResolvedValue('success');

    const iterations = 1000;
    const start = Date.now();

    for (let i = 0; i < iterations; i++) {
      await breaker.execute(fn);
    }

    const duration = Date.now() - start;

    // Should complete quickly
    expect(duration).toBeLessThan(100);
  });

  it('should fail fast when open', async () => {
    const breaker = createCircuitBreaker({
      name: 'FastFailTest',
      failureThreshold: 2,
      resetTimeout: 1000,
    });

    const slowFn = vi.fn().mockImplementation(async () => {
      await wait(100);
      throw new Error('Slow fail');
    });

    // Open circuit
    await expect(breaker.execute(slowFn)).rejects.toThrow();
    await expect(breaker.execute(slowFn)).rejects.toThrow();

    // Now it should fail instantly
    const start = Date.now();
    await expect(breaker.execute(slowFn)).rejects.toThrow(CircuitOpenError);
    const duration = Date.now() - start;

    // Should be instant (< 10ms)
    expect(duration).toBeLessThan(10);
  });
});
