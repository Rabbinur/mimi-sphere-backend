import { Router, Request, Response } from 'express';
import { getAllCircuitBreakersStatus, circuitBreakerRegistry } from '../../utils/circuitBreaker';

const router = Router();

/**
 * GET /api/v1/circuit-breakers/status
 * Returns real-time health, states (CLOSED, OPEN, HALF-OPEN), and statistics
 * for all registered external service circuit breakers (bKash, EkPay, SMTP, etc.)
 */
router.get('/status', (req: Request, res: Response) => {
  const statuses = getAllCircuitBreakersStatus();
  res.status(200).json({
    success: true,
    message: 'Circuit breakers status retrieved successfully',
    data: statuses,
  });
});

/**
 * POST /api/v1/circuit-breakers/reset/:name
 * Allows manual reset of a tripped circuit breaker back to CLOSED state
 */
router.post('/reset/:name', (req: Request, res: Response) => {
  const { name } = req.params;
  const breaker = circuitBreakerRegistry.get(name);

  if (!breaker) {
    return res.status(404).json({
      success: false,
      message: `Circuit breaker '${name}' not found`,
    });
  }

  breaker.close();

  res.status(200).json({
    success: true,
    message: `Circuit breaker '${name}' successfully reset to CLOSED state`,
  });
});

export const CircuitBreakerRoutes = router;
