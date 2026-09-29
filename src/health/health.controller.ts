import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

/**
 * Probes for the orchestrator. Two endpoints, because they answer two
 * different questions and conflating them is how a healthy API gets killed:
 *
 *   /health/liveness   Is this process still working? Touches nothing else.
 *                      A failure here means "restart me".
 *   /health/readiness  Can it actually serve a request right now? Pings the
 *                      database. A failure here means "stop sending traffic",
 *                      NOT "restart" — Postgres being briefly away is not a
 *                      reason to recycle the API and lose its warm state.
 *
 * Point Docker's `healthcheck:` and any load balancer at liveness, and a
 * readiness gate (or your own monitoring) at readiness.
 *
 * Deliberately unauthenticated: a probe cannot hold a token. It discloses
 * nothing beyond up/down, and it is not reachable from the internet anyway —
 * nginx only proxies the two app origins.
 */
@ApiExcludeController()
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: TypeOrmHealthIndicator,
  ) {}

  @Get('liveness')
  @HealthCheck()
  liveness(): Promise<HealthCheckResult> {
    return this.health.check([]);
  }

  @Get('readiness')
  @HealthCheck()
  readiness(): Promise<HealthCheckResult> {
    // 3s: long enough to survive a busy moment, short enough that a probe
    // never outlives the interval that scheduled it.
    return this.health.check([
      () => this.database.pingCheck('database', { timeout: 3000 }),
    ]);
  }
}
