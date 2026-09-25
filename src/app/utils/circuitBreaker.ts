import CircuitBreaker from 'opossum';
import logger from './logger';

export interface ICircuitBreakerStatus {
  name: string;
  state: 'CLOSED' | 'OPEN' | 'HALF-OPEN';
  stats: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    rejectedRequests: number;
    fallbacks: number;
    averageLatencyMs: number;
  };
}

// Registry to track all circuit breakers in the system
export const circuitBreakerRegistry = new Map<string, CircuitBreaker<any, any>>();

/**
 * Creates and registers a Circuit Breaker for an external service
 * @param action The async function calling the external service
 * @param serviceName Readable name of the service (e.g., 'bKash Payment Gateway')
 * @param options Custom options to override defaults
 */
export function createCircuitBreaker<TArgs extends any[], TReturn>(
  action: (...args: TArgs) => Promise<TReturn>,
  serviceName: string,
  options?: CircuitBreaker.Options,
): CircuitBreaker<TArgs, TReturn> {
  const defaultOptions: CircuitBreaker.Options = {
    timeout: 8000, // If service takes > 8s, trigger timeout failure
    errorThresholdPercentage: 50, // When 50% of requests fail, trip circuit to OPEN
    resetTimeout: 30000, // Stay in OPEN for 30s before testing with HALF-OPEN
    volumeThreshold: 3, // At least 3 requests before calculating error percentage
  };

  const mergedOptions = { ...defaultOptions, ...options };
  const breaker = new CircuitBreaker(action, mergedOptions);

  // Event Listeners for State Transitions & Observability
  breaker.on('open', () => {
    logger.error(
      `🚨 [CIRCUIT BREAKER: OPEN] -> ${serviceName} is failing or unavailable. Circuit tripped! Rejecting further calls to prevent cascade failures.`,
    );
  });

  breaker.on('halfOpen', () => {
    logger.warn(
      `🟡 [CIRCUIT BREAKER: HALF-OPEN] -> ${serviceName} cooldown passed. Testing with a probe request...`,
    );
  });

  breaker.on('close', () => {
    logger.info(
      `🟢 [CIRCUIT BREAKER: CLOSED] -> ${serviceName} has recovered! Normal traffic restored.`,
    );
  });

  breaker.on('reject', () => {
    logger.warn(
      `⛔ [CIRCUIT BREAKER: REJECTED] -> Call to ${serviceName} was blocked because circuit is OPEN.`,
    );
  });

  breaker.on('timeout', () => {
    logger.warn(`⏱️ [CIRCUIT BREAKER: TIMEOUT] -> ${serviceName} took too long to respond.`);
  });

  breaker.on('failure', (err: any) => {
    logger.warn(
      `⚠️ [CIRCUIT BREAKER: FAILURE] -> ${serviceName} execution failed: ${err?.message || err}`,
    );
  });

  circuitBreakerRegistry.set(serviceName, breaker);
  return breaker;
}

/**
 * Returns real-time health and statistics of all active circuit breakers
 */
export function getAllCircuitBreakersStatus(): ICircuitBreakerStatus[] {
  const statuses: ICircuitBreakerStatus[] = [];

  circuitBreakerRegistry.forEach((breaker, name) => {
    let state: 'CLOSED' | 'OPEN' | 'HALF-OPEN' = 'CLOSED';
    if (breaker.opened) {
      state = 'OPEN';
    } else if (breaker.halfOpen) {
      state = 'HALF-OPEN';
    }

    const stats = breaker.stats;
    statuses.push({
      name,
      state,
      stats: {
        totalRequests: stats.fires || 0,
        successfulRequests: stats.successes || 0,
        failedRequests: stats.failures || 0,
        rejectedRequests: stats.rejects || 0,
        fallbacks: stats.fallbacks || 0,
        averageLatencyMs: Math.round(stats.latencyMean || 0),
      },
    });
  });

  return statuses;
}
